# Wohngeld-Rechner als ChatGPT-Plugin: Design

Stand: 07.10.2026. Status: vom Auftraggeber freigegeben am 08.10.2026.

## 1. Ziel

Ein kostenloser Wohngeld-Rechner als MCP-Server, der in ChatGPT als Plugin läuft. Er rechnet das Wohngeld nach § 19 WoGG aus Haushalt, Einkommen, Miete und Wohnort und erklärt den Rechenweg mit Normen.

Zweck:

1. Portfolio-Projekt für Lebenslauf und GitHub. Der Code ist öffentlich ab dem ersten Commit.
2. Billiger Test, ob ChatGPT deutsche Plugins im Gespräch vorschlägt.

Erfolg für diesen Bau: Die Engine rechnet die amtlichen Beispiele exakt nach, und der Server lässt sich in ChatGPT als eigener MCP-Server einbinden und im Gespräch benutzen.

Grenzen:

- Nur öffentliche Quellen (Gesetze, Verordnungen, Veröffentlichungen von BMWSB, Destatis, Bundestag). Kein Wissen aus Fachverfahren.
- Unverbindliche Schätzung. Kein Auftreten als Behörde, kein „amtlich“, kein Bundesadler.
- Keine Speicherung und kein Logging von Eingaben.

## 2. Entscheidungen

| Thema | Entscheidung | Grund |
|---|---|---|
| Repo | `wohngeld-rechner`, öffentlich, MIT-Lizenz | Portfolio |
| Sprache | TypeScript | Workers nativ, MCP-SDK, spätere Ergebniskarte in einer Sprache, Zod-Schemas |
| Hosting | Cloudflare Workers, zustandslos, ohne Durable Objects | kostenlos, MCP-Unterstützung |
| Rechengenauigkeit | `decimal.js` in der Formel | § 19 rechnet mit zehn Nachkommastellen und kaufmännischer Rundung; Gleitkomma kann an der Grenze einen Euro kosten |
| Rechtsstand | Recht ab 01.01.2025 jetzt; Recht ab 01.01.2027 als eigene Etappe nach Verkündung | Nur für 2025 gibt es amtliche Beispiele. Der Entwurf 2027 (BT-Drs. 21/8284) ist nicht beschlossen |
| Einkommen | vollständig: alle Einnahmearten nach § 14, Werbungskosten, §§ 16 bis 18 | Wunsch des Auftraggebers |
| Mietstufe | Nachschlagen nach Gemeindename | Kaum jemand kennt seine Mietstufe |
| Oberfläche | Etappe 1 ohne Widget, später Ergebniskarte | schlanker erster Bau |
| Login | keiner (noauth) | anonym, nur lesend |

## 3. Aufbau

```
wohngeld-rechner/
├── src/
│   ├── rechtsstand/      Daten je Rechtsstand, keine Logik
│   ├── engine/           reine Rechenfunktionen, kein I/O
│   │   ├── einkommen/    Einnahmen je Mitglied → Y
│   │   ├── miete.ts      Miete/Belastung → M
│   │   ├── formel.ts     § 19 → Betrag
│   │   ├── ausschluss.ts §§ 7, 21
│   │   └── berechnen.ts  Gesamtablauf mit Rechenweg
│   ├── mietstufen/       Suche über die erzeugte Ortsliste
│   └── server/           MCP-Hülle für Workers
├── data/
│   ├── roh/              Quellen unverändert (WoGV-Anlage, Gemeindeverzeichnis)
│   └── mietstufen-2023.json   erzeugt, eingecheckt
├── scripts/              Build- und Prüfskripte für die Daten
├── test/
└── docs/quellen/         Rechercheberichte mit allen Fundstellen
```

Abhängigkeiten laufen in eine Richtung: `server` → `engine`, `mietstufen` → `rechtsstand`. Engine und Mietstufen sind ohne Server testbar und Node-frei, damit sie auf Workers und später im Widget laufen.

### 3.1 `rechtsstand/`

Eine Datei je Rechtsstand mit `gueltigAb` (ISO-Datum). Inhalt für 2025:

- Anlage 1 WoGG: Koeffizienten a, b, c je Haushaltsgröße 1 bis 12
- Anlage 2 WoGG: Höchstbeträge je Mietstufe I bis VII und Haushaltsgröße, Zuschlag je weiterem Mitglied
- Anlage 3 WoGG: Mindestwerte für M und Y
- § 12 Abs. 6: Heizkostenentlastung, § 12 Abs. 7: Klimakomponente, je Haushaltsgröße und Zuschlag
- § 19 Abs. 3: Zuschlag je Mitglied ab dem 13. (65 €)
- § 21 Nr. 1: Bagatellgrenze (10 €), Vermögensgrenzen nach § 21 Nr. 3 mit Verwaltungsvorschrift, soweit öffentlich belegt
- Pauschbeträge (§ 9a EStG), Freibeträge §§ 17, 17a, Höchstbeträge § 18
- Verweis auf die Mietstufenliste

Jeder Wert trägt die Fundstelle als Kommentar. Die Werte stammen aus `docs/quellen/2026-10-07-recherche-wohngeld-fachlich.md`, Abschnitte 1 bis 4, und werden gegen gesetze-im-internet.de geprüft (siehe 6.3).

Die Auswahl des Rechtsstands läuft über den Stichtag. Ein Stichtag ohne passenden Rechtsstand ergibt einen Fehler, keine stille Rückfallstufe.

### 3.2 `engine/`

Alle Funktionen sind rein: gleiche Eingabe, gleiche Ausgabe, kein I/O, keine Uhr. Der Stichtag ist Eingabe.

**Einkommen** (§§ 13 bis 18): Je Mitglied eine Liste von Einnahmen mit Art und Monatsbetrag. Einnahmearten:

- nichtselbständige Arbeit (Werbungskosten, mindestens Pauschbetrag 1.230 €/Jahr, höchstens bis zur Höhe der Einnahmen)
- Renten und Versorgungsbezüge (Pauschbetrag 102 €/Jahr)
- selbständige Arbeit und Gewerbe (Gewinn als Eingabe)
- Vermietung und Verpachtung (Überschuss als Eingabe)
- Kapitalvermögen (nach Sparer-Pauschbetrag)
- pauschal versteuerter Minijob (ohne Werbungskostenabzug, Beispiel 6)
- Einnahmen nach § 14 Abs. 2 (u. a. Arbeitslosengeld I, Krankengeld, Elterngeld, Unterhalt, Unterhaltsvorschuss, BAföG zur Hälfte, Zuschläge nach § 3b EStG), je mit der Regel aus der Norm

Danach je Mitglied der Abzug nach § 16 (10 % je zutreffender Kategorie Steuern, KV/PV, RV), Summe über die zu berücksichtigenden Mitglieder, Freibeträge (§§ 17, 17a), Unterhaltsabzüge (§ 18), Ergebnis Y als Monatswert. Negative Einkünfte werden nicht verrechnet (§ 14 Abs. 1).

Welche Einnahmearten aus § 14 Abs. 2 einzeln gebaut werden, legt der Implementierungsplan als Liste mit Norm fest. Jede Art bekommt mindestens einen Test mit Norm im Testnamen.

**Miete** (§§ 9 bis 12): Miete (Mietzuschuss) oder Belastung (Lastenzuschuss) wird auf Höchstbetrag plus Klimakomponente begrenzt, dann kommt die Heizkostenentlastung dazu. Ergebnis M. Mischhaushalte nach § 11 Abs. 3: Miete, Höchstbetrag und Entlastungsbeträge werden anteilig nach der Zahl der zu berücksichtigenden Mitglieder angesetzt (Beispiel 10).

**Formel** (§ 19): mit `decimal.js`, zehn Nachkommastellen, Mindestwerte aus Anlage 3, kaufmännische Rundung auf volle Euro, Zuschlag ab dem 13. Mitglied, Bagatellgrenze. Offener Punkt: Ob die zehnte Nachkommastelle gerundet oder abgeschnitten wird, ist nicht dokumentiert. Die Engine rundet kaufmännisch. Ein Test am Länderfall (6b) zeigt, ob das die veröffentlichten Zwischenwerte trifft. Weicht er ab, wird auf Abschneiden umgestellt und das in der README vermerkt.

**Ausschluss**: Bezug von Bürgergeld, Grundsicherung und vergleichbaren Transferleistungen schließt das Mitglied aus (§ 7). Sind alle ausgeschlossen, ist das Ergebnis 0 € mit Grund. Erhebliches Vermögen (§ 21 Nr. 3) ergibt 0 € mit Grund.

**Rechenweg**: Jeder Schritt erzeugt einen Eintrag `{ schritt, norm, wert, erklaerung }`. Annahmen, die aus Voreinstellungen stammen (z. B. „kein Schwerbehinderten-Freibetrag angegeben“), stehen in einer eigenen Liste `annahmen`.

### 3.3 `mietstufen/`

Ein Skript in `scripts/` erzeugt `data/mietstufen-2023.json` aus

1. der Anlage zu § 1 Abs. 3 WoGV, https://www.gesetze-im-internet.de/wogv/anlage.html (Gemeinden ab 10.000 Einwohnern einzeln, Kreise für die übrigen, etwa 1.881 Zeilen), und
2. dem Destatis-Gemeindeverzeichnis (Zuordnung Gemeinde → Kreis mit AGS).

Regeln:

- Gemeinden unter 10.000 Einwohnern bekommen die Stufe ihres Kreises (Anlage, Vorbemerkung).
- Inseln ohne Festlandanschluss nach § 12 Abs. 4a: Stufe V.
- Gleiche Namen für Stadt und Kreis (Leipzig, München) und mehrfach vorkommende Gemeindenamen (Neustadt) werden über Kreis und Land unterschieden.
- Gebietsstand der Liste ist der 31.03.2021, das Gemeindeverzeichnis ist neuer. Gemeinden, die das Skript nicht zuordnen kann, werden aufgelistet und von Hand entschieden, nicht verworfen.

Die Rohdaten liegen unverändert in `data/roh/`, damit jede Stufe nachprüfbar bleibt. Lizenz des Gemeindeverzeichnisses vor dem Einchecken prüfen und in der README nennen.

Suche: normalisierter Name (Groß- und Kleinschreibung, ß/ss, Umlaute, Zusätze wie „Stadt“), optional Kreis und Land. Ergebnis ist genau ein Treffer, eine Kandidatenliste oder „nicht gefunden“ mit ähnlichen Namen. Postleitzahlen gehören nicht in diese Etappe.

### 3.4 `server/`

MCP über Streamable HTTP unter `/mcp`, zustandslos. Die Bibliotheksfrage klärt der Durchstich (E0): bevorzugt `createMcpHandler` mit dem MCP-SDK v2, Rückfall SDK v1. Der Server übersetzt nur zwischen MCP und Engine und enthält keine Fachlogik.

Alle Tools tragen `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false` als explizite Booleans. Eine Begründung je Annotation liegt bereit (die Fehlerliste der Einreichung verlangt sie teils).

## 4. Tools

### `mietstufe_finden`

Eingabe: `gemeinde` (Pflicht), `kreis`, `land` (optional).
Ausgabe: `{ status: "eindeutig" | "mehrdeutig" | "nicht_gefunden", treffer?: { gemeinde, kreis, land, mietstufe, quelle }, kandidaten?: [...] }`.

### `wohngeld_berechnen`

Eingabe:

- `stichtag` (optional, Standard heute)
- `wohnort` als Gemeinde (mit optional Kreis und Land) oder `mietstufe` direkt
- `art`: Mietzuschuss oder Lastenzuschuss
- `miete_monatlich`: Bruttokaltmiete bzw. Belastung
- `mitglieder`: Liste mit je Einnahmen, `zahlt_steuern`, `zahlt_kv_pv`, `zahlt_rv` (alle drei Pflicht, ohne Voreinstellung, weil jede 10 % ausmacht), Merkmalen für Freibeträge (Voreinstellung nein), Bezug von Transferleistungen
- `unterhalt_gezahlt` (optional), `vermoegen` (optional)

Ausgabe: `{ wohngeld_monatlich, rechtsstand, mietstufe, y, m, rechenweg, annahmen, hinweise, ausschlussgrund? }`. Jede Antwort enthält den Hinweis „Unverbindliche Schätzung. Über den Anspruch entscheidet die Wohngeldbehörde.“

Ist der Wohnort mehrdeutig, rechnet das Tool nicht, sondern gibt die Kandidaten zurück.

### Metadaten

- Tool-Beschreibungen zweisprachig: englischer Satz nach dem Muster „Use this when …“, dazu deutsche Stichworte (Wohngeld, Wohngeldrechner, Mietzuschuss, Lastenzuschuss, Mietstufe, Wohngeld Plus) und Ausschlussfälle (z. B. nicht für Bürgergeld-Berechnung).
- Jeder Parameter mit Beispielwerten.
- Golden-Prompt-Set in `test/golden-prompts.md`: 5 positive, 3 negative Fälle, deckungsgleich mit den Testfällen der späteren Einreichung.
- Verzeichnistexte: englisch in den Basisfeldern, deutsch unter `translations`. Kein „kostenlos“ in der Beschreibung (Werbeverbot).

## 5. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Ort mehrdeutig | Kandidatenliste, keine Rechnung |
| Ort unbekannt | ähnliche Namen, keine Rechnung |
| Stichtag ohne Rechtsstand (z. B. ab 2027) | Fehler „Rechtsstand noch nicht verfügbar“ |
| alle Mitglieder ausgeschlossen, Vermögen zu hoch | 0 € mit Grund |
| Ergebnis unter Bagatellgrenze | 0 € mit Grund |
| ungültige Eingabe | Schema-Fehler mit Feldname |
| Haushalt mit 0 Mitgliedern, negative Miete | Schema-Fehler |

## 6. Tests

Vitest. Testdaten der amtlichen Beispiele liegen als Fixture mit Quellenangabe.

1. **Formel**: Die 11 BMWSB-Beispiele (Stand 01.01.2025, `docs/quellen/...-fachlich.md` Abschnitt 6a) liefern Y, M, Haushaltsgröße und Ergebnis. Damit wird § 19 getrennt vom Einkommen geprüft. Dazu der Länderfall mit 14 Mitgliedern und Zwischenwerten z1 bis z4 (Abschnitt 6b), Fälle an der Rundungsgrenze (x,4999 und x,5000), an den Mindestwerten, an der Bagatellgrenze, über 12 Mitglieder.
2. **Miete**: alle 11 Beispiele von Miete und Mietstufe bis M, darunter Kappung (Beispiele 4, 6), Lastenzuschuss (4, 11) und Mischhaushalt (10).
3. **Einkommen**: alle 11 Beispiele von den Einnahmen bis Y. Einnahmearten ohne Beispiel bekommen Einzeltests mit Norm im Testnamen.
4. **Gesamt**: alle 11 Beispiele von der vollständigen Eingabe bis zum Betrag.
5. **Rechtsstand-Daten**: Ein Prüfskript liest die Tabellen der Anlagen 1 bis 3 von gesetze-im-internet.de und vergleicht sie mit der Datendatei.
6. **Mietstufen**: die 11 Beispielorte, ein Ort unter 10.000 Einwohnern über seinen Kreis, eine Insel, Leipzig Stadt gegen Leipzig Kreis, „Neustadt“ als mehrdeutiger Name, Zeilenzahl gegen die Quelle.
7. **Server**: `tools/list` (Namen, Schemas, Annotationen) und `tools/call` als Protokolltest gegen den Handler.
8. **Gegentests**: Je Baustein wird ein Wert mutiert (ein Koeffizient, die Rundung, ein Pauschbetrag, eine Mietstufe). Mindestens ein Test muss rot werden. Gezählt wird über den Exit-Code, rot und grün.

Manuelle Gegenprobe: einige Fälle zusätzlich im BMWSB-Rechner (https://www.bmwsb.bund.de/wohngeldrechner) prüfen.

## 7. Etappen

| # | Inhalt | Abnahme |
|---|---|---|
| E0 | Durchstich: Projektgerüst, Worker mit Test-Tool auf workers.dev, Wahl SDK v1 oder v2 | Auftraggeber bindet den Server in ChatGPT ein, das Tool antwortet |
| E1 | Rechtsstand 2025, Miete, Formel § 19 | Tests 1, 2, 5 grün, Gegentests rot |
| E2 | Einkommen vollständig, Ausschluss, Gesamtablauf | Tests 3, 4 grün |
| E3 | Mietstufen-Daten und Suche | Test 6 grün, Abgleich mit der Quelle |
| E4 | Beide Tools, Metadaten, Golden Prompts, README, Deploy | Test 7 grün, Gespräch in ChatGPT |

Später, je eigenes Design: Recht ab 01.01.2027 nach Verkündung (neue Rechtsstand-Datei, neue Mietstufenliste, geänderte Einkommensermittlung), Ergebniskarte als Widget, Einreichung (Domain, Datenschutz- und Supportseite, Verifizierung, Testfälle, Demo-Video).

## 8. Offene Punkte

- Ob ein deutsches ChatGPT-Konto des Auftraggebers eigene MCP-Server einbinden kann (Tarif, Region). Klärt E0.
- ChatGPT-Kompatibilität des MCP-SDK v2. Klärt E0.
- Rundungsmodus der zehnten Nachkommastelle. Klärt der Länderfall in E1.
- Vermögensgrenze § 21 Nr. 3: konkrete Beträge stehen in der Verwaltungsvorschrift; nur aufnehmen, wenn öffentlich belegt, sonst als Hinweis statt Rechnung.
- Grundrentenfreibetrag: belegt ist 281,50 €/Monat für 2025. Wert für 2026 prüfen, da er an der Regelbedarfsstufe 1 hängt.
- Lizenz des Destatis-Gemeindeverzeichnisses.

## 9. Quellen

Alle Fundstellen mit Abrufdatum in:

- `docs/quellen/2026-10-07-recherche-wohngeld-fachlich.md`
- `docs/quellen/2026-10-07-recherche-plugin-technik.md`
