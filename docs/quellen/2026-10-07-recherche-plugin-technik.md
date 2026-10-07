# Recherche: Technische Bauvorgaben ChatGPT-Plugin (Wohngeld-Rechner)

Stand der Recherche: 07.10.2026. Alle Abrufdaten: 07.10.2026.
Auftrag: kostenloses, anonymes Plugin, nur lesende Rechen-Tools, evtl. ohne eigene Oberfläche.

Quellenarten:
- **[Hersteller-Doku]** OpenAI (developers.openai.com), Cloudflare (developers.cloudflare.com), MCP-SDK-Repo (GitHub, Anthropic/MCP-Projekt).
- **[Hersteller-Hilfe, nur Suchausschnitt]** help.openai.com und openai.com liefern per Abruf HTTP 403 (Bot-Sperre, nicht umgangen). Inhalte nur aus Suchtreffer-Zusammenfassungen. Belastbarkeit mittel.
- **[Sekundär]** Blogs, Foren, Kanzlei-Kommentare. Nur als Hinweis.

Methodik: Die OpenAI-Seiten habe ich als rohes Markdown (`.md`-Variante) heruntergeladen und gelesen. Die Zusammenfassungen des Abruf-Werkzeugs habe ich bei den kritischen Punkten gegen den Rohtext geprüft.

---

## 1. Aufbau eines Plugins / ZIP-Paket

**1.1 Bestandteile.** Ein Plugin kann Skills, einen MCP-Server, beides oder Lifecycle-Hooks enthalten. "MCP server only" ist ausdrücklich eine zulässige Form, wenn keine zusätzlichen Workflow-Anweisungen nötig sind. UI ist optional.
- Quelle: https://developers.openai.com/plugins/concepts/plugins.md (Abruf 07.10.2026), [Hersteller-Doku]. Belastbarkeit: hoch.

**1.2 Dateistruktur (portables "Agent Plugins"-Format, neu empfohlen).**
```
mein-plugin/
├── plugin.json        (Manifest im Root)
├── mcp.json           (MCP-Server-Konfiguration, Root)
├── skills/<name>/SKILL.md   (optional)
└── assets/            (Icons, optional Screenshots)
```
- Codex-Kompatibilitätslayout alternativ: `.codex-plugin/plugin.json` + `.mcp.json`. Ist `extensions.com.openai` im Root-`plugin.json` vorhanden, wird `.codex-plugin/plugin.json` ignoriert (kein Zusammenführen).
- Pfade in Manifest-Erweiterungen beginnen mit `./`, relativ zum Plugin-Root, ohne `..`.
- Quelle: https://developers.openai.com/plugins/build/plugins.md und https://developers.openai.com/plugins/deploy/submission.md (Abruf 07.10.2026), [Hersteller-Doku]. Belastbarkeit: hoch.

**1.3 `mcp.json` (portabel), genau ein Remote-Server pro Plugin.**
```json
{ "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": { "notes": { "type": "streamable-http", "url": "https://example.com/mcp" } } }
```
- Codex-Variante `.mcp.json` ohne `$schema` und ohne `type`.
- Der MCP-Server muss im ersten ZIP stehen; nachträglich zu einem reinen Skills-Plugin hinzufügen geht nicht.
- ZIPs mit `apps`/`.app.json` oder Lifecycle-Hooks sind derzeit nicht einreichbar.
- Quelle: https://developers.openai.com/plugins/deploy/submission.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**1.4 Manifest-Pflichtfelder und Limits (Einreichung).**
| Feld | Regel |
|---|---|
| `$schema` | Pflicht bei Agent Plugins |
| `name` | Pflicht, max. 64 Zeichen, Kleinbuchstaben/Ziffern/einzelne Bindestriche (Fehlerseite nennt etwas weiter: Buchstabe/Ziffer am Anfang, sonst A-Z a-z 0-9 _ -) |
| `version` | Pflicht, Semver |
| `description` | max. 4000 Zeichen (Pflicht bei Codex) |
| `author` | Pflicht bei Codex (`name` max. 120) |
| `interface.displayName` | Pflicht, max. 30 Zeichen |
| `interface.shortDescription` | Pflicht, max. 30 Zeichen |
| `interface.longDescription` | Pflicht, max. 4000 Zeichen |
| `interface.developerName` | Pflicht, max. 80 Zeichen |
| `interface.category` | Pflicht, Kategorie aus dem Dashboard (Beispiele: Productivity, Developer Tools) |
| `interface.websiteURL`, `supportURL`, `privacyPolicyURL`, `termsOfServiceURL` | Pflicht für MCP-Review, HTTPS, max. 1024 Zeichen |
| `interface.defaultPrompt` | optional, max. 3, je max. 128 Zeichen, ohne @-Mentions |
| `interface.logo` | primäres Icon für die Einreichung Pflicht |
| `interface.composerIcon` | Pflicht bei Codex |
| `brandColor`, Dark-Icons, `screenshots` | optional |
- OpenAI-spezifische Felder liegen unter `extensions.com.openai` (`interface`, `review`, `publication`, `onboardingSkill`).
- `homepage` und `author.url` füllen die vier Listing-URLs nicht automatisch.
- Quelle: https://developers.openai.com/plugins/deploy/submission.md, https://developers.openai.com/plugins/deploy/submission-errors.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**1.5 Icons.** PNG/JPEG/WebP/SVG, max. 5 MiB, quadratisch, mind. 48x48 px, Raster max. 4096 px. Dateiendung muss zum Format passen.
- Quelle: https://developers.openai.com/plugins/deploy/submission-errors.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**1.6 Skills im ZIP.** `skills/<name>/SKILL.md` mit YAML-Header `name` und `description`. Das vollständige Doku-Beispiel enthält einen Skill (`get-started`), eine Pflicht für MCP-Plugins habe ich nirgends gefunden. Konzeptseite erlaubt "MCP server only". Ob der Einreichungs-Validator ein Plugin ohne `skills/` anstandslos annimmt, ist nicht ausdrücklich belegt.
- Quelle: https://developers.openai.com/plugins/deploy/submission.md, https://developers.openai.com/plugins/concepts/plugins.md (Abruf 07.10.2026). Belastbarkeit: mittel.

**1.7 Offizielle Beispiele / Template.**
- Doku nennt als vollständige Beispiele Figma, Notion, Build web apps im Repo `openai/plugins`. Das Repo existiert und enthält u. a. `cloudflare/` (Ordner: `.codex-plugin`, `.mcp.json`, `README.md`, `assets`, `commands`, `skills`) und `figma/`. Es sind Codex-Layout-Plugins, kein schlankes Template.
- Eingebauter Skill `@plugin-creator` (ChatGPT Work) bzw. `$plugin-creator` (Codex) erzeugt das Gerüst. Es erzeugt das Codex-Kompatibilitätslayout (`.codex-plugin/plugin.json`), nicht das portable.
- Beispiel-Server-Repo für MCP + UI: https://github.com/openai/openai-apps-sdk-examples (zuletzt gepusht 2026-04-15, laut GitHub-API; "Pizzaz"-Demo, mit UI).
- Ein spezielles Minimal-Template-Repo für einen MCP-only-Plugin: nicht gefunden. Geprüft: https://developers.openai.com/plugins/build/plugins.md, https://developers.openai.com/plugins/build/examples.md, https://developers.openai.com/plugins/quickstart.md.
- Quellen (Abruf 07.10.2026): https://developers.openai.com/plugins/build/plugins.md, https://github.com/openai/plugins/tree/main/plugins (GitHub-API), https://developers.openai.com/plugins/build/examples.md. Belastbarkeit: hoch.

---

## 2. MCP-Server

**2.1 Transport.** Streamable HTTP, typischerweise unter `/mcp`. Öffentliche Einreichung: stabile, öffentlich erreichbare HTTPS-URL, die Streamable HTTP unterstützt. Secure MCP Tunnel, temporärer Tunnel oder lokaler Endpunkt genügen nicht. Die ChatGPT-Verbindungsmaske nennt "SSE and streaming HTTP" als unterstützte Protokolle.
- Quelle: https://developers.openai.com/plugins/build/mcp-server.md; https://developers.openai.com/api/docs/guides/custom-mcp-server.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**2.2 Tool-Felder.** Name (aktionsorientiert, eindeutig im Server), Titel, Beschreibung (wann nutzen, Einschränkungen), explizites Input-Schema, Annotationen, Handler. `outputSchema` nur, wenn `structuredContent` zurückkommt (dann "declare outputSchema for any tool that returns structuredContent").
- Quelle: https://developers.openai.com/plugins/build/mcp-server.md; https://developers.openai.com/plugins/reference.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**2.3 Annotationen.** `readOnlyHint`, `destructiveHint`, `openWorldHint` sind in der Referenz als "Required" geführt; für die Einreichung müssen alle drei als explizite Booleans gesetzt sein. `idempotentHint` ist optional.
- `readOnlyHint: true` für Abruf/Berechnung ohne Änderung außerhalb der Unterhaltung.
- `destructiveHint: false` für Read-only-Tools.
- `openWorldHint: false` bei begrenztem Datenraum, `true` bei öffentlichem Internet/offenen Entitäten.
- Meine Ableitung (nicht wörtlich in der Doku): Ein reiner Berechnungs-Tool ohne Netzzugriff passt zu `true / false / false` (readOnly / destructive / openWorld).
- Quelle: https://developers.openai.com/plugins/reference.md; https://developers.openai.com/plugins/plugin-guidelines.md (Abruf 07.10.2026). Belastbarkeit: hoch (Doku), Ableitung mittel.

**2.4 Widerspruch Annotations-Begründung.**
- Plugin-Guidelines: "Annotation justifications are no longer required."
- Einreichungsfehlerliste und Anforderungsliste: Fehlercode `justification_required`, "a justification for each value on every MCP tool."
- Beide Quellen sind OpenAI-Doku. Die Guidelines sind die normative Richtlinienseite; die Fehlerliste kann hinterherhinken oder sich auf das Portal-Formular beziehen. Empfehlung: Begründungen sicherheitshalber bereithalten.
- Quellen: https://developers.openai.com/plugins/plugin-guidelines.md; https://developers.openai.com/plugins/deploy/submission-errors.md (Abruf 07.10.2026). Belastbarkeit: Widerspruch bestätigt, Auflösung offen.

**2.5 `_meta`-Felder.** Für ein reines Tool-Plugin sind keine `_meta`-Felder Pflicht. Optionale Tool-Descriptor-Felder: `_meta.ui.resourceUri` (UI-Verknüpfung), `_meta["openai/toolInvocation/invoking"]` / `.../invoked` (Statustext, je max. 64 Zeichen), `_meta["openai/profile"]` (nur für authentifizierte Profil-Tools), `securitySchemes`, `openai/fileParams`. `_meta` im Ergebnis ist für das Modell unsichtbar und kein Ersatz für Autorisierung.
- Quelle: https://developers.openai.com/plugins/reference.md; https://developers.openai.com/plugins/build/mcp-server.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**2.6 Strukturierte Ausgabe.** Tool-Ergebnis kann `structuredContent` (kompakte Daten für das Modell) plus `content` (Text) enthalten. `structuredContent` muss zum `outputSchema` passen, sofern deklariert. Code-Beispiel mit `registerTool` (TypeScript, `@modelcontextprotocol/sdk`, zod) steht in der Doku.
- Quelle: https://developers.openai.com/plugins/build/mcp-server.md; https://developers.openai.com/plugins/reference.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**2.7 Widget/Oberfläche Pflicht?** Nein. "Custom UI is not required for an MCP server. Use model responses or structured results when they communicate the outcome." Screenshots sind ohne UI nicht zulässig (`screenshots_not_allowed`); Review nennt Screenshots "optional, nur bei vorhandener UI".
- Quelle: https://developers.openai.com/plugins/concepts/plugins.md; https://developers.openai.com/plugins/build/mcp-server.md; https://developers.openai.com/plugins/deploy/submission-errors.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**2.8 Weitere Server-Vorgaben für Review.** Eingaben minimal halten; keine Telemetrie/Session-/Trace-IDs/Zeitstempel in Antworten; keine Standort-Rohfelder in Eingaben; Tool-Namen eindeutig und sachlich ("best", "official" vermeiden); Tools unabhängig voneinander.
- Quelle: https://developers.openai.com/plugins/plugin-guidelines.md; https://developers.openai.com/plugins/deploy/app-review.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**2.9 Server-`instructions`.** Optionales MCP-`instructions`-Feld bei der Initialisierung; wird beim Scan mit importiert und von ChatGPT mit den Tools genutzt.
- Quelle: https://developers.openai.com/plugins/build/mcp-server.md (Abruf 07.10.2026). Belastbarkeit: hoch.

---

## 3. Optimize-Metadata-Guide (Kernregeln)

Quelle für alles in diesem Abschnitt: https://developers.openai.com/plugins/guides/optimize-metadata.md (Rohtext gelesen, Abruf 07.10.2026), [Hersteller-Doku]. Belastbarkeit: hoch.
- **Name:** Domäne und Aktion kombinieren, Beispiel `calendar.create_event`. (Die Guidelines verlangen zusätzlich: eindeutig, sprechend, ideal Verb, keine werblichen Namen.)
- **Beschreibung:** mit "Use this when..." beginnen; Ausschlussfälle nennen ("Do not use for reminders").
- **Parameter:** jeden Parameter beschreiben, Beispiele angeben, bei eingeschränkten Werten erlaubte Werte nennen.
- **Annotationen:** `readOnlyHint: true` für Abruf/Berechnung, `destructiveHint: false` für nicht löschende Tools, `openWorldHint` je nach Offenheit.
- **Golden-Prompt-Set:** drei Kategorien: direkte Prompts (Produkt/Quelle genannt), indirekte Prompts (Ergebnis beschrieben, Tool nicht genannt), negative Prompts (andere/Built-in-Tools sollen übernehmen). Je Prompt das erwartete Verhalten notieren (Tool aufrufen, nichts tun, Alternative). Eine Mindestanzahl nennt die Doku nicht, konkrete Beispielprompts auch nicht.
- **Auswertung:** Precision (richtiges Tool?) und Recall (Tool bei Bedarf?) je Prompt erfassen, in ChatGPT mit dem verbundenen Custom-MCP-Server.
- **Iteration:** pro Änderung nur ein Metadatenfeld ändern, Änderungsprotokoll mit Zeitstempel führen, zuerst hohe Precision bei negativen Prompts.
- **Querbezug Review:** Einreichung verlangt genau 5 positive und 3 negative Testfälle (siehe 6); das Golden-Prompt-Set liefert dafür die Vorlage.

---

## 4. Lokal testen

**4.1 Ablauf.** (1) chatgpt.com/plugins öffnen, (2) Plus-Symbol, "Add custom MCP server", (3) Name (und optional Beschreibung), Verbindung: Server-URL mit `/mcp` oder "Tunnel" (Secure MCP Tunnel), (4) Authentifizierung wählen, (5) Risikowarnung bestätigen, (6) "Create as a plugin", (7) Plugin in "Personal" installieren, (8) im Chat bzw. im "Work"-Tab mit `@` aufrufen. Der Quickstart nutzt ein Beispiel ohne Authentifizierung ("No authentication").
- Vorab MCP Inspector: `npx @modelcontextprotocol/inspector`, "Streamable HTTP", `http://localhost:3000/mcp`.
- Nach Änderungen an Tool-Namen/Beschreibungen/Schemas/Annotationen: Server neu starten, in ChatGPT Plugins "Refresh", neues Gespräch.
- Für lokalen Server braucht es einen HTTPS-Weiterleitungsdienst oder den Secure MCP Tunnel. ngrok wird in der Doku nicht erwähnt.
- Quelle: https://developers.openai.com/plugins/deploy/connect-chatgpt.md; https://developers.openai.com/plugins/quickstart.md; https://developers.openai.com/api/docs/guides/custom-mcp-server.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**4.2 Tarif / Developer Mode.**
- Die OpenAI-Entwicklerdoku nennt keinen Tarif und keinen "Developer Mode" für diesen Ablauf. Sie sagt nur: "Use ChatGPT on the web. Workspace permissions and security restrictions, including Lockdown, apply to adding and using custom MCP servers."
- Hilfe-Artikel "Developer mode and MCP apps in ChatGPT" (nur als Suchausschnitt, Seite selbst 403): Volle MCP-Unterstützung inkl. Schreibaktionen läuft als Beta für Business, Enterprise und Edu; Admins müssen Developer Mode im Workspace freischalten. Pro-Nutzer können MCPs mit Read/Fetch-Rechten im Developer Mode verbinden. Nur ChatGPT Web, nicht Mobil. Business-Admins können veröffentlichte Apps nicht nachträglich ändern (müssen neu anlegen).
  - URL: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt-beta. Abruf: nur Suchausschnitt 07.10.2026. Belastbarkeit: mittel (Hersteller-Hilfe, aber nicht selbst geöffnet; Stand des Artikels unklar).
- Sekundärquellen widersprechen sich zu Plus (teils "Plus mit Developer Mode", teils "nur Business/Enterprise"). Nicht verwertbar. Belastbarkeit: niedrig.
- Für ein rein lesendes Plugin passt der Pro-Weg (Read/Fetch), sofern das Konto den Developer Mode anbietet. Ob Plus genügt, ist nicht belegt.
- Zusätzlich dokumentiert: Der Developer-Account für die Einreichung braucht eine Organisation auf platform.openai.com (siehe 6).

---

## 5. Hosting auf Cloudflare Workers

**5.1 Empfehlung der Cloudflare-Doku (Stand 07.10.2026).**
- Streamable HTTP ist der Standard, SSE veraltet.
- `createMcpHandler` (Paket `agents`, Import `agents/mcp/server`) ist für neue Server empfohlen. Er ist zustandslos: pro Request wird ein neuer `McpServer` aus einer Factory erzeugt, "No MCP session ID persists", GET und DELETE liefern 405. Durable Objects sind dafür nicht nötig.
- `McpAgent` ist "deprecated and feature-frozen", braucht Durable-Object-Bindings samt Migration (`new_sqlite_classes`). Für neue Server nicht empfohlen.
- Wichtig: `createMcpHandler` erwartet den `McpServer` aus **`@modelcontextprotocol/server` (SDK v2, Version 2.0.0)**, nicht aus `@modelcontextprotocol/sdk` (v1). Für v1-Server gibt es `createLegacyMcpHandler` (mit Sessions über `WorkerTransport`).
- Standard-Pfad `/mcp`, änderbar per `route`. CORS standardmäßig Wildcard, einstellbar. Der Handler prüft keine Tokens (für anonymes Plugin kein Problem).
- Mindest-Code (Cloudflare-Doku):
```ts
import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";
export default { fetch(request, env, ctx) { return createMcpHandler(createServer)(request, env, ctx); } };
```
- Installationsbefehl: `npm i agents @modelcontextprotocol/server@2.0.0 zod`.
- Quellen: https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/index.md; https://developers.cloudflare.com/agents/model-context-protocol/transport/index.md (Abruf 07.10.2026), [Hersteller-Doku]. Belastbarkeit: hoch.

**5.2 Schlankste zustandslose Variante ohne Durable Objects.**
- Das MCP-SDK v2 (stabil seit 2026-07-27, setzt Spec 2026-07-28 um) hat selbst `createMcpHandler` (aus `@modelcontextprotocol/server`), ein Web-Standard-Handler ohne Node-Abhängigkeit. Die SDK-Doku zeigt ihn mit Hono (`@modelcontextprotocol/hono`), `export default app` läuft laut Doku direkt auf Cloudflare Workers, und das Repo enthält einen Integrationstest "Cloudflare Workers ... WITHOUT nodejs_compat". Pro Request wird eine frische `McpServer`-Instanz erzeugt.
  - Quellen: https://github.com/modelcontextprotocol/typescript-sdk (README main, Abruf 07.10.2026); https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/docs/serving/hono.md; https://github.com/modelcontextprotocol/typescript-sdk/blob/main/test/integration/test/server/cloudflareWorkers.test.ts. Belastbarkeit: hoch.
- Damit sind zwei schlanke Wege dokumentiert: (a) nur `@modelcontextprotocol/server` + `zod` mit dessen `createMcpHandler`, (b) zusätzlich das `agents`-Paket (bringt CORS-/Origin-Voreinstellungen). Dass (a) ohne Hono direkt als nacktes `export default { fetch }` läuft, habe ich nicht als fertiges Beispiel gesehen; das Hono-Beispiel exportiert `{ fetch }`-kompatibel. Das ist meine Ableitung. Belastbarkeit: mittel.
- Der alte Weg (SDK v1 `@modelcontextprotocol/sdk`, `StreamableHTTPServerTransport` stateless) ist weiter in der OpenAI-Doku als Beispiel zu sehen; v1 erhält laut SDK-README noch "at least six months" Bugfixes nach dem v2-Release (2026-07-27). Die v1-Variante auf Workers mit einem Web-Standard-Transport habe ich nicht verifiziert.
- Offen: Ob ChatGPT als MCP-Client mit einem SDK-v2-Server (Spec 2026-07-28) einwandfrei redet, ist nirgends dokumentiert. Der Cloudflare-Handler nennt "legacy compatibility by default" (`legacy: "stateless"`: gewöhnliche Legacy-Tools, -Prompts und -Ressourcen werden akzeptiert). Praktisch: mit Inspector und ChatGPT-Verbindung testen.

**5.3 Kostenlose Kontingente (Workers Free).**
- 100.000 Requests pro Tag, 10 ms CPU-Zeit pro Aufruf, 50 Subrequests pro Request, Workerspeicher 64 MiB (unkomprimiert), keine Dauerbegrenzung (Duration ohne Gebühr).
- Paid ("Standard"): 5 USD/Monat, 10 Mio. Requests und 30 Mio. CPU-ms inklusive.
- Meine Einordnung (keine Messung): Ob 10 ms CPU für SDK-Start + Zod-Validierung + Wohngeld-Formel reichen, ist nicht dokumentiert und muss gemessen werden, weil bei jedem Request ein neuer Server erzeugt wird.
- Quellen: https://developers.cloudflare.com/workers/platform/pricing/index.md; https://developers.cloudflare.com/workers/platform/limits/index.md (Abruf 07.10.2026), [Hersteller-Doku]. Belastbarkeit: hoch (Preise und Limits ändern sich; Stand 07.10.2026).

---

## 6. Einreichung

**6.1 Voraussetzungen.** Organisation + Projekt auf der OpenAI Platform; Owner dürfen einreichen, andere Mitglieder brauchen "Apps Management Write". Individuelle oder Business-Verifizierung (Organization Settings) ist nötig; die dort gewählte "Developer identity" erscheint im Verzeichnis. Projekte mit EU-Data-Residency können derzeit keine Plugins mit MCP-Servern einreichen; ein Projekt mit globaler Residency ist nötig.
- Quellen: https://developers.openai.com/plugins/deploy/submission.md; https://developers.openai.com/plugins/deploy/app-review.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**6.2 Ablauf.** ZIP unter platform.openai.com/plugins hochladen -> Metadaten-/Skill-Prüfung -> MCP-Server verbinden (Domain-Verifizierung, Tool-Scan) -> Review-Details (Testfälle, Demo-Video, Release Notes) -> "Submit for review" mit Attestations -> nach Freigabe "Publish plugin". Nach Veröffentlichung scannt OpenAI den Server täglich; zulässige Server-Änderungen gehen ohne neues ZIP live. Änderungen an Metadaten/Skills brauchen neues ZIP.
- Quelle: https://developers.openai.com/plugins/deploy/submission.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**6.3 Pflicht-URLs.** Website, Support, Datenschutz, AGB: je einzeln als `websiteURL`, `supportURL`, `privacyPolicyURL`, `termsOfServiceURL`, HTTPS, max. 1024 Zeichen, ohne Zugangsdaten in der URL. Öffentliche URLs müssen erreichbar sein und denselben Herausgeber wie die Einreichung ausweisen.
- Quelle: https://developers.openai.com/plugins/deploy/submission.md; https://developers.openai.com/plugins/deploy/submission-errors.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**6.4 Domain-Verifizierung.** Das Dashboard zeigt einen Token; der exakte Token ist als Klartext (kein JSON, keine Liste) unter `https://<challenge-base-host>/.well-known/openai-apps-challenge` abzulegen. Basis muss ein HTTPS-Origin auf dem MCP-Hostnamen oder einer zulässigen Elterndomain sein; Pfade werden ignoriert. Ob ein `*.workers.dev`-Hostname als MCP-Host akzeptiert wird: nicht dokumentiert (der Worker könnte den Pfad selbst ausliefern).
- Quelle: https://developers.openai.com/plugins/deploy/submission.md#domain-verification (Abruf 07.10.2026). Belastbarkeit: hoch.

**6.5 Testfälle.** Genau 5 positive und genau 3 negative.
- Positiv: Pflichtfelder `description`, `prompt`, `tools_triggered`, `expected_behavior`; optional `file_attachment_urls`, `expected_output_url`.
- Negativ: Pflichtfelder `description`, `prompt` (laut Prosa zusätzlich: Begründung/erwartete Ablehnung).
- Dazu `review.demo_recording_url` (Video, Pflicht), `commerce` (boolean) und `commerce_description`, Release Notes. Testfälle lassen sich in `extensions.com.openai.review.test_cases` im ZIP mitgeben; dann im Dashboard schreibgeschützt. Reviewer-Zugangsdaten nur über das Dashboard-Formular (bei anonymem Plugin entfällt das).
- Quelle: https://developers.openai.com/plugins/deploy/submission.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**6.6 Länder-Targeting.** `extensions.com.openai.publication.countries`: Array großgeschriebener ISO-Ländercodes (Beispiel in der Doku `["US","GB"]`). Feld weglassen = bestehende Einstellung bleibt; `[]` = alle Einschränkungen entfernen. Gilt bei Veröffentlichung. Ob "DE" zulässig ist oder ob Deutschland/EWR aus Produktgründen ausgenommen sind: siehe 6.8.
- Quelle: https://developers.openai.com/plugins/deploy/submission.md (Abruf 07.10.2026). Belastbarkeit: hoch (Feldsemantik), Zulässigkeit von DE: nicht belegt.

**6.7 Weitere Fallen.**
- Origin (Schema, Host, Port) ist zwischen Versionen nicht änderbar; neuer Origin = neues Plugin. MCP-Server-URL-Änderung ist im Update-Flow nicht möglich (nur Support). Domain also von Anfang an endgültig wählen.
- Pro MCP-Integration nur eine Version in Review und eine veröffentlicht.
- Keine Secrets im ZIP (`test_credentials`, `reviewer_instructions` werden abgelehnt).
- Quelle: https://developers.openai.com/plugins/deploy/app-review.md; https://developers.openai.com/plugins/deploy/submission.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**6.8 Verfügbarkeit in Deutschland/EWR (kritisch fürs Vorhaben).**
- Start der Apps im Oktober 2025: verfügbar "outside of the European Economic Area, Switzerland, and the United Kingdom". Seitdem habe ich keine offizielle Aussage gefunden, die EWR-Verfügbarkeit von Apps/Plugins bestätigt. Hilfe-Seite (nur Suchausschnitt): "Whether you can install or invoke a plugin depends on your plan, workspace settings, role, supported surface, region..."; Plugin-Verzeichnis seit 09.07.2026 (Umbenennung aus App-Verzeichnis).
- Quellen: https://openai.com/index/introducing-apps-in-chatgpt/ (nur Suchausschnitt, Seite 403); https://help.openai.com/en/articles/11487775-apps-in-chatgpt (nur Suchausschnitt); https://community.openai.com/t/request-for-eu-developer-access-to-chatgpt-apps-sdk/1362721 (Forum, nur Ausschnitt). Abruf 07.10.2026. Belastbarkeit: niedrig bis mittel. Der Befund "nicht gefunden" ist das eigentliche Ergebnis; Sekundärquellen zum Thema sind veraltet (2025).

---

## 7. Richtlinien zu Finanz-, Rechts- und Behördenthemen

**7.1 Kein Pflicht-Disclaimer gefunden.** In den Plugin-Guidelines gibt es keinen eigenen Abschnitt zu Finanz-/Rechts-/Behördenthemen und keine vorgeschriebenen Pflichthinweise ("Ergebnis unverbindlich"). Geprüft: https://developers.openai.com/plugins/plugin-guidelines.md (Rohtext vollständig gelesen, Abruf 07.10.2026), https://developers.openai.com/plugins/guides/security-privacy.md. Belastbarkeit: hoch für "nicht gefunden".

**7.2 Relevante Verbote (Guidelines, Abschnitt "Prohibited fraudulent, deceptive, or high-risk services").** Unter anderem: "Unregulated, deceptive, or abusive financial services", "Execution of money transfers, crypto transfers, or investment trades", "Government-service abuse, impersonation, or benefit manipulation", "Certain legal or quasi-legal services that facilitate fraud, evasion, or misrepresentation", "Debt relief, credit repair, or credit-score manipulation schemes".
- Meine Einordnung (Auslegung, nicht Doku): Ein Rechner, der Wohngeld nur schätzt und keinen Antrag stellt, fällt nach Wortlaut nicht darunter. Er darf sich nur nicht als Wohngeldstelle oder als Behörde ausgeben ("impersonation").
- Quelle: https://developers.openai.com/plugins/plugin-guidelines.md (Abruf 07.10.2026). Belastbarkeit: hoch (Wortlaut), Einordnung mittel.

**7.3 Weitere Auflagen, die den Rechner betreffen.**
- Beschreibungen ohne "unverifiable claims"; "Do not advertise pricing, subscriptions, free trials, discounts, or promotions." Das heißt: "kostenlos" besser nicht in Untertitel/Beschreibung bewerben (Auslegung, mittel).
- Nicht als von OpenAI betrieben/unterstützt darstellen.
- "Purpose and originality": Funktionalität, die nicht nativ in ChatGPT steckt; "Trial or demo plugins will not be accepted"; Ergebnisse müssen "accurate and relevant" sein, Fehler mit klaren Meldungen behandeln.
- Datenschutz: veröffentlichte Datenschutzerklärung mit Datenkategorien, Zwecken, Empfängern, Aufbewahrung, Nutzerkontrollen; Datenminimierung; Restricted Data (u. a. Zahlungskarten, PHI, staatliche Kennungen, Zugangsdaten) tabu; "Regulated Sensitive Data" nur bei zwingender Notwendigkeit mit Einwilligung. Wohngeld-Eingaben (Einkommen, Haushaltsgröße, Miete) sind als personenbezogene Daten in die Erklärung aufzunehmen (Auslegung).
- Mindestalter: geeignet für Nutzer ab 13; keine Ausrichtung auf Kinder unter 13.
- Werbung verboten; Commerce nur für physische Waren (für kostenloses Plugin ohne Bedeutung, `commerce: false`).
- Quelle: https://developers.openai.com/plugins/plugin-guidelines.md; https://developers.openai.com/plugins/deploy/app-review.md (Abruf 07.10.2026). Belastbarkeit: hoch.

**7.4 OpenAI Usage Policies (übergeordnet).** Verbot von "tailored advice that requires a license, such as legal or medical advice, without appropriate involvement by a licensed professional" sowie Automatisierung folgenreicher Entscheidungen ohne menschliche Prüfung. Allgemeine Erläuterungen bleiben erlaubt; Trennlinie laut Kanzlei-Kommentar: Erklären vs. auf die persönliche Lage zugeschnittene Beratung.
- Quelle: https://openai.com/policies/usage-policies/ (Seite 403, nur Suchausschnitt; Stand der Policy laut Ausschnitt 2025-10-29) und https://kjk.com/?p=48498 (Kanzlei, [Sekundär]). Abruf 07.10.2026. Belastbarkeit: mittel bis niedrig. Wortlaut vor Einreichung auf openai.com selbst prüfen.

---

## Offene Fragen, die das Web nicht beantwortet hat

1. Ist das Plugin-Verzeichnis (und Nutzung von Plugins) für ChatGPT-Konten in Deutschland/EWR aktuell freigeschaltet? Offizielle Bestätigung nicht gefunden (Stand Start Okt. 2025: ausgenommen; Hilfe-Text 2026 nennt nur "region" als Bedingung). Ohne Bestätigung ist unklar, ob ein deutscher Rechner dort Nutzer erreicht. Geprüft: openai.com/index/introducing-apps-in-chatgpt, help.openai.com Artikel 11487775 und 6825453 (403 beim Abruf).
2. Zulässigkeit von `publication.countries: ["DE"]` (und ob DE im Portal wählbar ist): nicht dokumentiert.
3. Welcher ChatGPT-Tarif genügt für Add custom MCP server rein lesend (Plus/Pro/Business)? Entwicklerdoku schweigt; Hilfe-Artikel nur als Ausschnitt; Sekundärquellen widersprüchlich.
4. Kompatibilität ChatGPT-Client mit SDK-v2-/Spec-2026-07-28-Servern und mit dem Cloudflare-`createMcpHandler` (stateless): nicht dokumentiert; selbst testen.
5. Reichen 10 ms CPU im Workers-Free-Plan für SDK-Start pro Request plus Rechnung? Nicht dokumentiert; messen.
6. Nimmt der Validator ein MCP-Plugin ohne `skills/`-Ordner an? Konzeptseite sagt ja, ein ausdrücklicher Test fehlt.
7. Vollständige Kategorienliste im Dashboard (gibt es z. B. eine passende Kategorie außer "Other"): nicht gefunden.
8. Akzeptiert die Domain-Verifizierung `*.workers.dev`-Hosts? Nicht dokumentiert.
9. Auflösung des Widerspruchs "Annotations-Begründung nicht mehr nötig" (Guidelines) vs. `justification_required` (Fehlerliste).
10. Mindestanzahl für das Golden-Prompt-Set: nicht angegeben.
11. Wortlaut der OpenAI Usage Policies und des Hilfe-Artikels zum Developer Mode: Seiten per Abruf gesperrt (403); nur Suchausschnitte.
