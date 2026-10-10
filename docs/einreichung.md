# Einreichung ins ChatGPT-Plugin-Verzeichnis

Texte zum Einfügen ins Formular von OpenAI. Stand 10.10.2026, Server 0.3.0. Die Feldnamen im Formular sind hier nicht belegt; zuordnen nach dem, was die Maske zeigt.

## Adressen

| Zweck | URL |
|---|---|
| MCP-Server | https://wohngeld-rechner.nyko-a85.workers.dev/mcp |
| Startseite | https://wohngeld-rechner.nyko-a85.workers.dev/ |
| Datenschutz | https://wohngeld-rechner.nyko-a85.workers.dev/datenschutz |
| Impressum | https://wohngeld-rechner.nyko-a85.workers.dev/impressum |
| Support | https://wohngeld-rechner.nyko-a85.workers.dev/support |
| Support-Mail | wohngeld@patinasouthside.de |
| Quellcode | https://github.com/nyko073006/wohngeld-rechner |

Authentifizierung: keine. Kein Widget, keine UI-Einbettung.

## Name

Wohngeld-Rechner

## Kurzbeschreibung

**EN:** Estimates German housing benefit (Wohngeld) under the Wohngeldgesetz and finds the rent level (Mietstufe) of any German municipality.

**DE:** Schätzt Wohngeld nach dem Wohngeldgesetz und findet die Mietstufe jeder deutschen Gemeinde.

## Langbeschreibung

**EN:** Wohngeld-Rechner calculates an estimate of German housing benefit (Wohngeld, rent subsidy or burden subsidy for owners) for a household, following the formula in § 19 WoGG and the official income rules, and looks up the rent level (Mietstufe I–VII) of a municipality from the official list. Results show the calculation path and the legal state used. It does not store any input. The result is a non-binding estimate, not legal advice; the decision of the local housing benefit office is authoritative. German only, for residents of Germany.

**DE:** Der Wohngeld-Rechner schätzt das Wohngeld (Mietzuschuss oder Lastenzuschuss) eines Haushalts nach der Formel des § 19 WoGG und den gesetzlichen Einkommensregeln und findet die Mietstufe (I–VII) einer Gemeinde aus der amtlichen Liste. Das Ergebnis zeigt den Rechenweg und den angewandten Rechtsstand. Eingaben werden nicht gespeichert. Unverbindliche Schätzung, keine Rechtsberatung; maßgeblich ist der Bescheid der Wohngeldbehörde.

## Testfälle

Aus `test/golden-prompts.md`; erwartete Werte nach Rechtsstand 2025 (gilt bis 31.12.2026).

| # | Prompt | Expected |
|---|---|---|
| 1 | „Wie viel Wohngeld bekomme ich? Ich bin Rentnerin, bekomme 1.300 € Rente im Monat und wohne allein in Jüterbog. Meine Miete ohne Heizung beträgt 335 €.“ (answer follow-up: only health and care insurance) | Asks about taxes, health/care and pension insurance before calculating; then `wohngeld_berechnen`, result 110 €/month |
| 2 | „Ich bin alleinerziehend mit zwei Kindern in Wiesbaden, verdiene 1.530 € brutto, zahle Kranken- und Rentenversicherung, aber keine Steuern. Ein Kind bekommt 696 € Unterhaltsvorschuss. Die Miete ohne Heizung liegt bei 700 €. Habe ich Anspruch auf Wohngeld Plus?“ | `wohngeld_berechnen`, rent level VI, result 372 €/month |
| 3 | „Wir haben ein Eigenheim in Süderbrarup, sind zu dritt, ich verdiene 2.150 € brutto mit Kranken- und Rentenversicherung, die anderen haben kein Einkommen. Die Belastung liegt bei 750 € im Monat. Bekommen wir Lastenzuschuss?“ | `wohngeld_berechnen` with burden subsidy, rent level I, result 320 €/month |
| 4 | „Ich ziehe nach Monheim in NRW. Welche Mietstufe gilt dort fürs Wohngeld?“ | `mietstufe_finden`, Monheim am Rhein, rent level VI |
| 5 | „Welche Mietstufe hat Esslingen?“ | `mietstufe_finden`; asks for the state or names Esslingen am Neckar (V) |
| 6 | „Wie viel Bürgergeld steht mir als Single zu?“ | No tool call |
| 7 | „Wie hoch ist der Mietspiegel in Köln pro Quadratmeter?“ | No tool call (rent index is not rent level) |
| 8 | „Wie beantrage ich Kindergeld für mein Neugeborenes?“ | No tool call |

## Vorher erledigen

- [ ] Postfach oder Weiterleitung `wohngeld@patinasouthside.de` bei Hetzner anlegen; Testmail von einer dritten Adresse.
- [ ] Verifizierung als Person im OpenAI-Plattform-Dashboard.
