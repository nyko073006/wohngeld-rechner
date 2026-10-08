# wohngeld-rechner

Wohngeld-Rechner als MCP-Server für ChatGPT (Plugin) und andere MCP-fähige Assistenten. Er rechnet das Wohngeld nach § 19 Wohngeldgesetz aus Haushalt, Einkommen, Miete und Wohnort und erklärt den Rechenweg mit den Normen.

**Status:** in Planung. Das Design steht in [`docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md`](docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md).

## Rechtsstand

Gerechnet wird nach dem Recht ab 01.01.2025 (BGBl. 2024 I Nr. 314). Für 2027 liegt ein Regierungsentwurf vor (BT-Drs. 21/8284); er wird eingebaut, sobald er verkündet ist.

## Rechenregeln

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

## Mietstufen

Die Höchstbeträge hängen von der Mietstufe (I bis VII) des Wohnorts ab. Sie steht in der Anlage zu § 1 Abs. 3 WoGV (Mietenstufen ab 1. Januar 2023, Gebietsstand 31.03.2021). Die Ortssuche in `src/mietstufen/` findet sie über den Gemeindenamen; das MCP-Tool `mietstufe_finden` folgt in E4.

- Gemeinden ab 10.000 Einwohnern stehen einzeln in der Anlage, alle anderen erhalten die Stufe ihres Kreises (Vorbemerkung der Anlage). Die 28 Gemeinden auf Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG) haben gemeinsam Stufe V, auch wenn ihr Kreis niedriger liegt.
- Die Anlage nennt nur Namen. Schlüssel und Kreise kommen aus dem Gemeindeverzeichnis; die Zuordnung läuft über das Verzeichnis 31.12.2020, gesucht wird in den Namen von 31.12.2025. Sechs Gemeinden, die im Verzeichnis 31.12.2020 fehlen (neu gebildet oder neu geschlüsselt), bekommen die Stufe ihres Kreises. Das ist eine Annahme, die Antwort sagt es.
- Ein Ortsname, der mehrfach vorkommt (Neustadt, Weimar, Eisenach), liefert eine Kandidatenliste, keinen Treffer. Teile eines Namens („Bad Homburg“) sind nur Vorschläge.
- Die Datei `data/mietstufen-2023.json` wird erzeugt: `npm run mietstufen:erzeugen`. Der Abgleich mit gesetze-im-internet.de läuft mit `npm run pruefe:mietstufen`.

## Quellen

Nur öffentliche Quellen: Wohngeldgesetz, Wohngeldverordnung (mit der Anlage der Mietenstufen), Veröffentlichungen von BMWSB, Destatis (Gemeindeverzeichnis) und Bundestag. Alle Fundstellen mit Abrufdatum stehen in [`docs/quellen/`](docs/quellen/), die Rohdaten der Mietstufen mit Prüfsumme in [`data/roh/quellen.json`](data/roh/quellen.json).

## Haftungsausschluss

Die Ergebnisse sind unverbindliche Schätzungen. Über einen Anspruch entscheidet allein die zuständige Wohngeldbehörde. Dieses Projekt ist kein Angebot einer Behörde.

## Lizenz

Der Code steht unter der MIT-Lizenz, siehe [LICENSE](LICENSE). **Die MIT-Lizenz gilt nicht für `data/`.** Dort liegen:

- `data/roh/anlage.html` und `data/roh/wogg-12.html`: Gesetzes- und Verordnungstexte von gesetze-im-internet.de, amtliche Werke ohne urheberrechtlichen Schutz (§ 5 UrhG). Unverändert.
- `data/roh/gv-31122020.xlsx` und `data/roh/gv-31122025.xlsx`: Gemeindeverzeichnis. © Statistisches Bundesamt (Destatis) im Auftrag der Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder, GV-ISys. Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet. Unverändert.
- `data/mietstufen-2023.json`: aus beiden abgeleitet. Das Gemeindeverzeichnis ist dort nur als Berechnungsgrundlage verwendet und verändert dargestellt (Zuordnung Gemeinde, Kreis, Mietenstufe).

Abrufdatum und Prüfsumme jeder Rohdatei stehen in `data/roh/quellen.json`.
