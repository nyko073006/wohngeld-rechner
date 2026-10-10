# E5 Einreichung: Rechtsseiten und Nutzungszähler

Stand 10.10.2026. Grundlage: Spec §7 „Einreichung“, Recherche `docs/quellen/2026-10-10-recherche-verzeichnis-auffindbarkeit.md`.

## Entscheidungen (Nutzer, 10.10.2026)

- Adresse bleibt `https://wohngeld-rechner.nyko-a85.workers.dev` (keine Domain bei Cloudflare; eigene Domain verlangt OpenAI nur für Widgets).
- Anbieter: Niklas J. Thaler (Privatperson), Hermann-Löns-Straße 10, 89537 Giengen. Support: `wohngeld@patinasouthside.de`.
- Nutzungsmeldung: Der Worker zählt Tool-Aufrufe (nur Tool-Name und Tag, keine Eingaben) und meldet einmal täglich per Telegram, wenn es am Vortag Aufrufe gab.
- Kein Demo-Video (von OpenAI nicht verlangt).

## Aufgabe 1: Seiten `/datenschutz`, `/impressum`, `/support`

- Neue Datei `src/server/seiten.ts`: drei statische HTML-Seiten (UTF-8, `lang="de"`, schlichtes CSS inline, mobil lesbar), je mit kurzem englischen Abschnitt am Ende („English summary“) für die Prüfer bei OpenAI. Gegenseitig verlinkt.
- `GET /` liefert eine kurze Startseite: was der Rechner ist (MCP-Server für ChatGPT, Wohngeld nach WoGG), Links auf die drei Seiten, Hinweis „unverbindliche Schätzung, keine Rechtsberatung, maßgeblich ist der Bescheid der Wohngeldbehörde“.
- **Impressum** (§ 5 DDG): Name, Anschrift, E-Mail.
- **Datenschutz** (DSGVO), Inhalte:
  - Verantwortlicher (wie Impressum).
  - Was verarbeitet wird: Die Angaben, die ChatGPT an die Tools übergibt (Miete, Haushaltsmitglieder, Einnahmen, Ort), werden nur zur Berechnung im Arbeitsspeicher verarbeitet, nicht gespeichert, nicht protokolliert, nicht weitergegeben.
  - Nutzungsstatistik: gezählt wird nur, welches Tool an welchem Tag wie oft aufgerufen wurde. Keine IP-Adressen, keine Eingaben, kein Personenbezug.
  - Hosting: Cloudflare Workers (Cloudflare, Inc.; Auftragsverarbeitung, Datenübermittlung USA auf Grundlage des EU-US Data Privacy Framework). Cloudflare verarbeitet technisch die IP-Adresse zur Auslieferung; eigene Server-Logs sind abgeschaltet. Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO.
  - ChatGPT selbst: Für die Verarbeitung im Chat ist OpenAI verantwortlich; Verweis auf deren Datenschutzerklärung (https://openai.com/policies/privacy-policy).
  - Keine Cookies, kein Tracking, keine Speicherdauer (nichts gespeichert); Zählerwerte ohne Personenbezug werden nach 90 Tagen gelöscht.
  - Rechte nach Art. 15–21 DSGVO, Beschwerde bei der Aufsichtsbehörde (Landesbeauftragter für Datenschutz und Informationsfreiheit Baden-Württemberg).
  - Stand-Datum.
- **Support**: E-Mail, wofür (Fehler, Fragen zum Rechner), was nicht (keine Beratung im Einzelfall, keine Antragstellung), Haftungshinweis wie Startseite, Link auf GitHub-Repo `https://github.com/nyko073006/wohngeld-rechner`.
- `index.ts`: GET auf diese vier Pfade liefert die Seite (`content-type: text/html; charset=utf-8`), sonst wie bisher 404 außer `/mcp`.
- Tests (`test/server/seiten.test.ts`): jeder Pfad 200 mit HTML-Content-Type; Impressum enthält Name, Anschrift und Mail; Datenschutz enthält „Cloudflare“, „nicht gespeichert“, „Art. 6“; unbekannter Pfad bleibt 404; `/mcp` funktioniert unverändert (bestehende Tests grün).

## Aufgabe 2: Nutzungszähler

- KV-Binding `NUTZUNG` in `wrangler.jsonc` mit id `027a4ea8ec1e4b5c98a19cf8e74e5010` (vom Lead angelegt).
- In `index.ts` vor `handler.fetch`: bei `POST /mcp` den Body von `request.clone()` als JSON lesen (auch Batch-Arrays); für jede Nachricht mit `method === "tools/call"` den Namen `params.name` zählen, sofern er einer der beiden bekannten Tool-Namen ist (sonst `unbekannt`). Zählen per `ctx.waitUntil(...)`, Fehler beim Zählen dürfen die Antwort nie beeinflussen (try/catch, Antwort kommt immer vom Handler).
- Schlüssel `n:<YYYY-MM-DD UTC>:<tool>`, Wert Zahl als String, `expirationTtl` 90 Tage. Lesen + Schreiben (nicht atomar, Abweichungen bei Gleichzeitigkeit sind hinnehmbar; im Code kommentieren).
- Nicht gezählt wird ein Request mit Header `x-wohngeld-pruefung: 1`. `scripts/pruefe-deploy.ts` setzt diesen Header bei allen Aufrufen.
- `fetch(request, env?, ctx?)` muss ohne `env`/`ctx` laufen (bestehende Tests rufen `worker.fetch(r)`): dann wird nicht gezählt.
- Cron-Trigger `"0 6 * * *"` in `wrangler.jsonc`, Handler `scheduled(event, env, ctx)`: liest die Schlüssel des Vortags (UTC) per `list({ prefix })`, und nur wenn die Summe > 0 ist, schickt er eine Telegram-Nachricht über `https://api.telegram.org/bot<TOKEN>/sendMessage` mit `chat_id` aus `env.TELEGRAM_CHAT_ID`, Token aus `env.TELEGRAM_BOT_TOKEN` (beides Worker-Secrets, setzt der Lead). Text z. B. „Wohngeld-Rechner, 09.10.2026: 3 Aufrufe (wohngeld_berechnen 2, mietstufe_finden 1)“. Fehlt ein Secret: nichts senden, kein Absturz.
- Logik als reine Funktionen in `src/server/nutzung.ts` (Tool-Namen aus Body ziehen, Schlüssel bilden, Nachricht formatieren), damit sie ohne Workers-Laufzeit testbar sind. KV und fetch in Tests durch kleine Fakes ersetzen.
- Tests (`test/server/nutzung.test.ts`): einzelner und Batch-tools/call wird gezählt; `initialize`/`tools/list` nicht; Prüf-Header verhindert Zählung; kaputtes JSON → Antwort trotzdem normal, nichts gezählt; ohne env kein Fehler; Scheduled mit Vortag 0 → kein Senden; mit Aufrufen → genau ein Senden mit korrekter Summe; fehlendes Secret → kein Senden. Jeder Test muss mit einer Mutation rot werden können (z. B. Header-Ausnahme entfernen).
- `SERVER_VERSION` auf `0.3.0`, `pruefe-deploy.ts` entsprechend; zusätzlich dort prüfen: `/datenschutz` und `/impressum` liefern 200.

## Abnahme

- `npm test`, `npm run typecheck`, `npm run pruefe:bundle` grün; Ausgabe zeigen.
- Lead: KV anlegen, Secrets setzen, deployen, `pruefe:deploy` grün, Seiten im Browser ansehen, Cron einmal per `wrangler` testweise auslösen bzw. Scheduled lokal mit `wrangler dev --test-scheduled` prüfen.
- Danach Texte für das OpenAI-Einreichungsformular vorbereiten (Beschreibung, Testfälle aus `test/golden-prompts.md`, URLs) und Klickfolge für den Nutzer.
