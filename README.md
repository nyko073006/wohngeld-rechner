# Wohngeld-Rechner (MCP-Server)

An unofficial estimate of German housing benefit (Wohngeld) as an MCP server for ChatGPT and other MCP clients. Calculates § 19 WoGG with the 2025 law and looks up the Mietstufe by municipality.

Der Server rechnet das Wohngeld nach § 19 Wohngeldgesetz aus Haushalt, Einkommen, Miete und Wohnort und erklärt den Rechenweg mit den Normen. Er ist eine private, unverbindliche Schätzung und kein Angebot einer Behörde.

## Was er kann

Der Server (Version 0.2.0) bietet zwei Tools, beide nur lesend.

**`mietstufe_finden`** sucht die Mietstufe (I bis VII) einer Gemeinde. Das Ergebnis ist ein eindeutiger Treffer, eine Kandidatenliste oder „nicht gefunden“ mit ähnlichen Namen.

```json
{ "name": "mietstufe_finden", "arguments": { "gemeinde": "Esslingen am Neckar" } }
```

Antwort (gekürzt): `status: "eindeutig"`, `treffer: { land: "Baden-Württemberg", mietstufe: 5, ... }`.

**`wohngeld_berechnen`** rechnet das monatliche Wohngeld mit Rechenweg, Annahmen und Hinweisen. Die Mietstufe kommt entweder direkt (`mietstufe`) oder über den Wohnort (`wohnort: { gemeinde }`). Beispiel: BMWSB-Rechenbeispiel 1 (ein Mitglied mit 1.300 € Rente, Miete 335 €, Mietstufe I):

```json
{
  "name": "wohngeld_berechnen",
  "arguments": {
    "stichtag": "2025-07-01",
    "mietstufe": 1,
    "art": "mietzuschuss",
    "miete_monatlich": 335,
    "mitglieder": [
      {
        "einnahmen": [{ "art": "rente", "betrag_monatlich": 1300 }],
        "zahlt_steuern": false,
        "zahlt_kv_pv": true,
        "zahlt_rv": false
      }
    ]
  }
}
```

Antwort (gekürzt): `status: "berechnet"`, `wohngeld_monatlich: 110`, `y: "1162.35"`, `m: "445.40"`, dazu `rechenweg`, `annahmen` und `hinweise`. Ist der Wohnort mehrdeutig, liefert das Tool `status: "wohnort_mehrdeutig"` mit Kandidaten und rechnet nicht.

## Grenzen

- Unverbindliche Schätzung. Über den Anspruch entscheidet die Wohngeldbehörde. Der Server tritt nicht als Behörde auf.
- Rechtsstand 01.01.2025 (BGBl. 2024 I Nr. 314), eingebaut für Stichtage vom 01.01.2025 bis 31.12.2026. Für 2027 liegt ein Regierungsentwurf vor (BT-Drs. 21/8284); das Recht ab 2027 folgt nach der Verkündung. Ein Stichtag ohne passenden Rechtsstand ergibt einen Fehler, keine stille Rückfallstufe.
- Keine Speicherung und kein Logging von Eingaben.

### Rechenregeln und Annahmen

- Gerechnet wird nach § 19 WoGG in den Schritten der Anlage 3. Die Zwischenwerte z1 bis z4 schneidet der Rechner nach der zehnten Nachkommastelle ab. Das Gesetz sagt nur „Festkommazahlen mit zehn Nachkommastellen“; ein Länderhinweis zur Verwaltungsvorschrift (Nr. 19.31, Stand 12/2024) rechnet so, seine veröffentlichten Zwischenwerte zeigen die kaufmännisch gerundeten Rohwerte. Das Wohngeld selbst wird kaufmännisch auf volle Euro gerundet.
- Über 12 Haushaltsmitglieder rechnet der Rechner mit den Werten für 12 und schlägt je weiterem Mitglied 65 € zu, höchstens bis zur Höhe der berücksichtigten Miete. Ergibt die Rechnung für 12 Mitglieder kein Wohngeld, gibt es auch keine Zuschläge. Das ist eine Annahme, das Gesetz regelt diesen Fall nicht ausdrücklich.
- Einkommen nach §§ 13 bis 18 WoGG mit allen Einnahmearten aus § 14. Welche Art welche Nummer abdeckt, steht im Plan `docs/superpowers/plans/2026-10-08-e2-einkommen.md`.
- Kapitalerträge: Von den Erträgen bleiben 100 € im Jahr frei, der Rest zählt (§ 14 Abs. 2 Nr. 15 WoGG; Rechenweg wie WoGVwV Nr. 17.03.5 Beispiel 2).
- Elterngeld: 300 € im Monat bleiben frei (Elterngeld Plus 150 €), § 10 BEEG. Mehrlingszuschläge werden nicht abgebildet.
- Aktivrente (§ 14 Abs. 2 Nr. 12 WoGG, seit 2026): den steuerfreien Teil als sonstige Einnahme Nr. 12 eintragen (zählt voll, ohne Pauschbetrag), den steuerpflichtigen Rest als nichtselbständige Arbeit.
- Grundrentenfreibetrag (§ 17a WoGG): berechnet aus der gesamten angegebenen Rente, höchstens 3.378 € im Jahr (50 % der Regelbedarfsstufe 1 von 563 €, 2025 und 2026).
- Freibetrag für erwerbstätige Kinder (§ 17 Nr. 4 WoGG): nach Werbungskosten und den Abzügen nach § 16 (je 10 %), wie WoGVwV Nr. 17.03.5.
- Vermögen (§ 21 Nr. 3 WoGG): Regelgrenze 60.000 € für das erste und 30.000 € für jedes weitere zu berücksichtigende Mitglied (WoGVwV Nr. 21.37). Die Behörde prüft den Einzelfall.
- Ausschluss (§ 7 WoGG): Wer Bürgergeld bzw. Grundsicherungsgeld, Grundsicherung, Hilfe zum Lebensunterhalt oder vergleichbare Leistungen mit Kosten der Unterkunft bezieht, zählt nicht mit; Leistungen nach SGB VIII nur, wenn alle Haushaltsmitglieder sie beziehen. Miete und Höchstbeträge werden dann anteilig angesetzt (§ 11 Abs. 3).

### Mietstufen

Die Höchstbeträge hängen von der Mietstufe (I bis VII) des Wohnorts ab. Sie steht in der Anlage zu § 1 Abs. 3 WoGV (Mietenstufen ab 1. Januar 2023, Gebietsstand 31.03.2021).

- Gemeinden ab 10.000 Einwohnern stehen einzeln in der Anlage, alle anderen erhalten die Stufe ihres Kreises (Vorbemerkung der Anlage). Die 28 Gemeinden auf Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG) haben gemeinsam Stufe V, auch wenn ihr Kreis niedriger liegt.
- Die Anlage nennt nur Namen. Schlüssel und Kreise kommen aus dem Gemeindeverzeichnis; die Zuordnung läuft über das Verzeichnis 31.12.2020, gesucht wird in den Namen von 31.12.2025. Sechs Gemeinden, die im Verzeichnis 31.12.2020 fehlen (neu gebildet oder neu geschlüsselt), bekommen die Stufe ihres Kreises. Das ist eine Annahme, die Antwort sagt es.
- Ein Ortsname, der mehrfach vorkommt (Neustadt, Weimar, Eisenach), liefert eine Kandidatenliste, keinen Treffer; ebenso ein Kurzname, mit dem eine Stadt mit eigener Anlagezeile beginnt (Esslingen, Monheim). Teile eines Namens („Bad Homburg“) sind nur Vorschläge.

## Einbinden

MCP-URL: `https://wohngeld-rechner.nyko-a85.workers.dev/mcp` (Streamable HTTP, zustandslos, ohne Authentifizierung).

In ChatGPT:

1. chatgpt.com/plugins öffnen.
2. „Add custom MCP server“ wählen.
3. Die MCP-URL eintragen.
4. Authentifizierung „No authentication“ wählen.
5. „Create as a plugin“ wählen.

Danach lässt sich der Server im Work-Tab mit `@wohngeld-rechner` ansprechen. Andere MCP-Clients tragen die URL als Streamable-HTTP-Server ein.

## Entwicklung

```bash
npm ci                      # Abhängigkeiten
npm test                    # alle Tests (vitest)
npm run typecheck           # tsc --noEmit
npm run dev                 # lokaler Server (wrangler dev), http://localhost:8787/mcp
npm run pruefe:rechtsstand  # Rechtsstand gegen gesetze-im-internet.de
npm run pruefe:mietstufen   # Rohdaten und Mietstufen-Datei gegen die Quellen im Netz
npm run pruefe:bundle       # Worker-Bundle: keine node:-Importe, unter 3 MiB gzip
npm run gegentest           # Mutationen müssen die Tests rot machen (Laufzeit über 5 Minuten)
npm run pruefe:deploy       # Live-Prüfung; optional mit URL: npm run pruefe:deploy -- http://localhost:8787/mcp
```

## Aufbau

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

Abhängigkeiten laufen in eine Richtung: `server` → `engine`, `mietstufen` → `rechtsstand`. Engine und Mietstufen sind ohne Server testbar und Node-frei, damit sie auf Workers laufen. Das Design steht in [`docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md`](docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md).

## Prüfung

- Die 11 BMWSB-Rechenbeispiele (Stand 01.01.2025) sind als Tests hinterlegt, dazu der Länderfall (14 Mitglieder, Stufe III).
- Gegentests über den Exit-Code: `npm run gegentest` verändert je einen Wert oder eine Rechenregel, und die Tests müssen dann rot werden.
- Die Mietstufen sind gegen die Anlage auf gesetze-im-internet.de und die BMWSB-Liste abgeglichen.
- `npm run pruefe:deploy` prüft den laufenden Server wie ein MCP-Client (Version, Tool-Liste, eine Mietstufe, eine Rechnung, 404 außerhalb von `/mcp`).

## Quellen und Lizenz

Der Code steht unter der MIT-Lizenz (siehe `LICENSE`). Die Dateien in `data/` stehen nicht unter der MIT-Lizenz. Für sie gilt:

> Gemeindeverzeichnis: © Statistisches Bundesamt (Destatis) im Auftrag der Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder, GV-ISys, Gebietsstand 31.12.2025 und 31.12.2020. Vervielfältigung und Verbreitung mit Quellenangabe gestattet. In dieser Datei nur als Berechnungsgrundlage verwendet und verändert dargestellt (Zuordnung Gemeinde, Kreis, Mietenstufe). Mietenstufen: Anlage zu § 1 Abs. 3 WoGV, amtliches Werk (§ 5 UrhG). Die MIT-Lizenz des Repositoriums gilt nicht für diese Datei.

Rechtsquellen:

- Wohngeldgesetz (WoGG): https://www.gesetze-im-internet.de/wogg/
- Wohngeldverordnung (WoGV): https://www.gesetze-im-internet.de/wogv/ (Anlage zu § 1 Abs. 3: https://www.gesetze-im-internet.de/wogv/anlage.html)

Die Rechercheberichte mit allen Fundstellen liegen in [`docs/quellen/`](docs/quellen/).
