# wohngeld-rechner

Wohngeld-Rechner als MCP-Server für ChatGPT (Plugin) und andere MCP-fähige Assistenten. Er rechnet das Wohngeld nach § 19 Wohngeldgesetz aus Haushalt, Einkommen, Miete und Wohnort und erklärt den Rechenweg mit den Normen.

**Status:** in Planung. Das Design steht in [`docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md`](docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md).

## Rechtsstand

Gerechnet wird nach dem Recht ab 01.01.2025 (BGBl. 2024 I Nr. 314). Für 2027 liegt ein Regierungsentwurf vor (BT-Drs. 21/8284); er wird eingebaut, sobald er verkündet ist.

## Rechenregeln

- Gerechnet wird nach § 19 WoGG in den Schritten der Anlage 3. Die Zwischenwerte z1 bis z4 schneidet der Rechner nach der zehnten Nachkommastelle ab. Das Gesetz sagt nur „Festkommazahlen mit zehn Nachkommastellen“; ein Länderhinweis zur Verwaltungsvorschrift (Nr. 19.31, Stand 12/2024) rechnet so, seine veröffentlichten Zwischenwerte zeigen die kaufmännisch gerundeten Rohwerte. Das Wohngeld selbst wird kaufmännisch auf volle Euro gerundet.
- Über 12 Haushaltsmitglieder rechnet der Rechner mit den Werten für 12 und schlägt je weiterem Mitglied 65 € zu, höchstens bis zur Höhe der berücksichtigten Miete. Ergibt die Rechnung für 12 Mitglieder kein Wohngeld, gibt es auch keine Zuschläge. Das ist eine Annahme, das Gesetz regelt diesen Fall nicht ausdrücklich.

## Quellen

Nur öffentliche Quellen: Wohngeldgesetz, Wohngeldverordnung, Veröffentlichungen von BMWSB, Destatis und Bundestag. Alle Fundstellen mit Abrufdatum stehen in [`docs/quellen/`](docs/quellen/).

## Haftungsausschluss

Die Ergebnisse sind unverbindliche Schätzungen. Über einen Anspruch entscheidet allein die zuständige Wohngeldbehörde. Dieses Projekt ist kein Angebot einer Behörde.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
