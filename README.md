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

## Quellen

Nur öffentliche Quellen: Wohngeldgesetz, Wohngeldverordnung, Veröffentlichungen von BMWSB, Destatis und Bundestag. Alle Fundstellen mit Abrufdatum stehen in [`docs/quellen/`](docs/quellen/).

## Haftungsausschluss

Die Ergebnisse sind unverbindliche Schätzungen. Über einen Anspruch entscheidet allein die zuständige Wohngeldbehörde. Dieses Projekt ist kein Angebot einer Behörde.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
