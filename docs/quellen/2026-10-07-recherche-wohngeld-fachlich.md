# Recherche Wohngeld-Rechner (fachlich), Stand 07.10.2026

Alle Abrufe am 07.10.2026. Quellenarten: **P** = Primärquelle (Gesetzestext, Bundestags-/Bundesratsdrucksache, Ministerium), **S** = Sekundär (Presse, Verbände, Suchmaschinen-Zusammenfassung), **L** = Länder-/Behördenhinweis. Belegstärke: hoch / mittel / niedrig.
Abkürzung "gii" = gesetze-im-internet.de (Bundesamt für Justiz, "nichtamtliches Inhaltsverzeichnis", Text aber tagesaktuell konsolidiert).

## 0. Wichtigste Befunde vorab

1. **Rechtsstand heute (gilt bis 31.12.2026):** WoGG mit den Werten der 2. Fortschreibungsverordnung (BGBl. 2024 I Nr. 314, Wirkung ab 01.01.2025). Quelle: gii Anlage 1 bis 3 (Fundstellenvermerk dort). Belegstärke hoch.
2. **Ab 01.01.2027 ist ein anderes Recht angekündigt, aber NICHT beschlossen.** Regierungsentwurf "Gesetz zur Vereinfachung und Fortentwicklung des Wohngeldgesetzes" (BT-Drs. 21/8284 vom 30.09.2026): Fortschreibung zum 01.01.2027 entfällt, Heizkostenkomponente halbiert, Parameter c plus 58 %, Bagatellgrenze 15 statt 10 Euro, Mietenstufen neu zugeordnet, Einkommensermittlung vereinfacht. Erste Lesung im Bundestag laut Bundestagsseite am 08.10.2026 (morgen). Zustimmung des Bundesrates im 2. Durchgang nötig. Ein Rechner muss also mindestens zwei Rechtsstände tragen oder auf den Ausgang warten.
3. **Es gibt keine Fortschreibungsverordnung 2027** (nicht gefunden, und der Entwurf streicht sie ausdrücklich per neuem § 43 Abs. 11 WoGG).
4. **Korrektur der Annahme im Auftrag:** Die Mietenstufen-Liste (Anlage zur WoGV) trägt die Überschrift "ab 1. Januar 2023", nicht 2025. Die Fortschreibung 2025 hat die Gemeindezuordnung nicht verändert. Zuordnung der Anlagen im WoGG: Anlage 1 = Höchstbeträge, Anlage 2 = a, b, c, Anlage 3 = Rechenschritte, Rundung und Mindestwerte M und Y (im Auftrag waren 1 und 2 anders belegt).
5. **Paragraphennummern:** § 13 Gesamteinkommen, § 14 Jahreseinkommen, § 15 Ermittlung, § 16 Abzugsbeträge (Steuern/SV), § 17 Freibeträge, § 17a Grundrentenfreibetrag, § 18 Unterhaltsabzug. Der pauschale Abzug steht in § 16, nicht in § 14.
6. **Amtliche Rechenbeispiele gefunden:** BMWSB "Beispiele für die Berechnung des Wohngelds", 11 Fälle, Stand 01.01.2025 (Abschnitt 6). Dazu ein Länderhinweis mit vollständiger Zehn-Nachkommastellen-Rechnung (Abschnitt 6b).
7. **Maschinenlesbare Mietenstufen-Liste mit AGS: nicht gefunden.** Amtlich nur als Text/HTML/PDF mit Gemeindenamen (Abschnitt 5).

---

## 1. Formel § 19 WoGG und Rundung

**1.1 Wortlaut § 19 (gültig heute).**
- Abs. 1: "Das ungerundete monatliche Wohngeld für bis zu zwölf zu berücksichtigende Haushaltsmitglieder beträgt 1,15 · (M – (a + b · M + c · Y) · Y) Euro." M = zu berücksichtigende monatliche Miete oder Belastung in Euro, Y = monatliches Gesamteinkommen in Euro, a, b, c nach Haushaltsgröße aus Anlage 2.
- Abs. 2: "Die zur Berechnung des Wohngeldes erforderlichen Rechenschritte und Rundungen sind in der Reihenfolge auszuführen, die sich aus der Anlage 3 ergibt."
- Abs. 3: "Sind mehr als zwölf Haushaltsmitglieder zu berücksichtigen, erhöht sich für das 13. und jedes weitere zu berücksichtigende Haushaltsmitglied das nach den Absätzen 1 und 2 berechnete monatliche Wohngeld um jeweils 65 Euro, höchstens jedoch bis zur Höhe der zu berücksichtigenden Miete oder Belastung."
- Quelle: https://www.gesetze-im-internet.de/wogg/__19.html, abgerufen 07.10.2026. Art: P. Belegstärke hoch.

**1.2 Anlage 3 (Rechenschritte und Rundungen).** Quelle: https://www.gesetze-im-internet.de/wogg/anlage_3.html, 07.10.2026, P, hoch. Fundstelle dort: BGBl. 2024 I Nr. 314, S. 3.
1. Werte für M und Y **unterhalb** der Tabellenwerte werden durch diese ersetzt (Mindestwerte, Tabelle unten). Eine Rundung von M oder Y selbst ist in Anlage 3 **nicht** vorgesehen.
2. Einsetzen in die Formel in vier Schritten: z1 = a + b·M + c·Y; z2 = z1·Y; z3 = M – z2; z4 = 1,15·z3. "Hierbei sind die Dezimalzahlen als Festkommazahlen mit zehn Nachkommastellen zu berechnen."
3. Das ungerundete Wohngeld (z4) "ist bis unter 0,50 Euro auf den nächsten vollen Euro-Betrag abzurunden sowie von 0,50 Euro an auf den nächsten vollen Euro-Betrag aufzurunden" (kaufmännisch auf ganze Euro).
- Ob die zehnte Nachkommastelle abgeschnitten oder gerundet wird: **nicht öffentlich dokumentiert** (Gesetzestext sagt nur "Festkommazahlen mit zehn Nachkommastellen"). Geprüft: Anlage 3 und das Länder-Beispiel (6b), das Zwischenwerte mit zehn Stellen zeigt, aber keine Regel nennt.

**1.3 Mindestwerte M und Y (Anlage 3 Nr. 1), ab 01.01.2025.** Quelle wie 1.2. P, hoch.

| HH | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M min | 54 | 67 | 79 | 92 | 103 | 103 | 115 | 128 | 140 | 152 | 187 | 298 |
| Y min | 396 | 679 | 906 | 1132 | 1358 | 1585 | 1811 | 2037 | 2264 | 2490 | 2717 | 2943 |

**1.4 Obergrenzen und Sonderfälle.**
- Obergrenze der Miete: M wird nach § 11 Abs. 1 auf Höchstbetrag plus Klimakomponente gekappt; dann kommt der Heizkosten-Gesamtbetrag dazu (siehe 3). Wortlaut § 11 Abs. 1 Satz 1: Summe aus (1.) Miete/Belastung, "jedoch nur bis zur Höhe der Summe, die sich aus dem Höchstbetrag nach § 12 Absatz 1 und der Klimakomponente nach § 12 Absatz 7 ergibt", und (2.) Gesamtbetrag zur Entlastung bei den Heizkosten. Quelle: https://www.gesetze-im-internet.de/wogg/__11.html, 07.10.2026, P, hoch.
- Ausgeschlossene Haushaltsmitglieder (§ 11 Abs. 3): nur der Anteil der zu berücksichtigenden an allen Haushaltsmitgliedern von Miete, Höchstbetrag, Heizkosten-Gesamtbetrag und Klimakomponente; für die Ermittlung der Beträge zählt die Gesamtzahl der Haushaltsmitglieder. Quelle wie oben. P, hoch.
- Mehr als 12 Mitglieder: erst Berechnung mit den Werten für 12 (Höchstbetrag, a/b/c, Mindestwerte, Heizkosten, Klimakomponente jeweils für 12 plus Mehrbeträge für weitere), dann plus 65 Euro je weiterem Mitglied. Quelle: Länderhinweis zu WoGVwV Nr. 19.31 (siehe 6b). L, mittel (Herausgeber im PDF nicht lesbar).
- Mindestbetrag: **nicht in § 19**, sondern § 21 Nr. 1 WoGG: kein Anspruch, "wenn das Wohngeld weniger als 10 Euro monatlich betragen würde". Quelle: https://www.gesetze-im-internet.de/wogg/__21.html, 07.10.2026. P, hoch. (Im Entwurf 2027: 15 Euro, siehe 2.4.)
- Hinweis eines Suchergebnisses (S, niedrig, nicht verifiziert): ein Konsolidierungsportal nannte 57 Euro statt 65 für das 13. Mitglied. Das ist vermutlich der Vorwert vor 2025; gii und Länderhinweis nennen übereinstimmend 65.

---

## 2. Anlagen 1 und 2, Fortschreibung 2027

**2.1 Anlage 1 (Höchstbeträge für Miete und Belastung, Euro/Monat), ab 01.01.2025.**
Quelle: https://www.gesetze-im-internet.de/wogg/anlage_1.html, 07.10.2026. P, hoch. Fundstelle: BGBl. 2024 I Nr. 314, S. 1-2. (Gegenprobe: identische Werte in der Anlage 1 des Regierungsentwurfs BT-Drs. 21/8284, Art. 1 Nr. 28.)

| HH \ Stufe | I | II | III | IV | V | VI | VII |
|---|---|---|---|---|---|---|---|
| 1 | 361 | 408 | 456 | 511 | 562 | 615 | 677 |
| 2 | 437 | 493 | 551 | 619 | 680 | 745 | 820 |
| 3 | 521 | 587 | 657 | 737 | 809 | 887 | 975 |
| 4 | 608 | 686 | 766 | 858 | 946 | 1035 | 1139 |
| 5 | 694 | 782 | 875 | 982 | 1080 | 1183 | 1302 |
| Mehrbetrag je weiteres Mitglied | 82 | 94 | 106 | 119 | 129 | 149 | 163 |

Für 6 bis 12 Mitglieder gibt es keine eigene Zeile: Wert für 5 plus (n-5) mal Mehrbetrag (so auch im Länderhinweis 6b: Stufe III, 12 Mitglieder = 875 + 7·106 = 1617; BMWSB-Beispiel 9: 6 Mitglieder Stufe II = 876).

**2.2 Anlage 2 (a, b, c), ab 01.01.2025.** Quelle: https://www.gesetze-im-internet.de/wogg/anlage_2.html, 07.10.2026. P, hoch. Notation im Gesetz: "E-2 = geteilt durch 100", "E-4 = geteilt durch 10 000", "E-5 = geteilt durch 100 000", "E-1 = geteilt durch 10".

| HH | a | b | c |
|---|---|---|---|
| 1 | 4,000E-2 (0,04) | 4,797E-4 (0,0004797) | 4,080E-5 (0,0000408) |
| 2 | 3,000E-2 (0,03) | 3,571E-4 (0,0003571) | 3,040E-5 (0,0000304) |
| 3 | 2,000E-2 (0,02) | 2,917E-4 (0,0002917) | 2,450E-5 (0,0000245) |
| 4 | 1,000E-2 (0,01) | 2,163E-4 (0,0002163) | 1,760E-5 (0,0000176) |
| 5 | 0 | 1,907E-4 (0,0001907) | 1,720E-5 (0,0000172) |
| 6 | -1,000E-2 (-0,01) | 1,722E-4 (0,0001722) | 1,660E-5 (0,0000166) |
| 7 | -2,000E-2 (-0,02) | 1,592E-4 (0,0001592) | 1,650E-5 (0,0000165) |
| 8 | -3,000E-2 (-0,03) | 1,583E-4 (0,0001583) | 1,650E-5 (0,0000165) |
| 9 | -4,000E-2 (-0,04) | 1,376E-4 (0,0001376) | 1,660E-5 (0,0000166) |
| 10 | -6,000E-2 (-0,06) | 1,249E-4 (0,0001249) | 1,660E-5 (0,0000166) |
| 11 | -9,000E-2 (-0,09) | 1,141E-4 (0,0001141) | 1,960E-5 (0,0000196) |
| 12 | -1,200E-1 (-0,12) | 1,107E-4 (0,0001107) | 2,210E-5 (0,0000221) |

(Dezimalschreibweise von mir aus der Gesetzesnotation übertragen; Gesetzesnotation ist maßgeblich. Das Länderbeispiel 6b bestätigt die Umrechnung für 12 Mitglieder: a = -0,12, b = 0,0001107, c = 0,0000221.)

**2.3 Fortschreibung zum 01.01.2027 (Stand des Verfahrens).**
- Gesetzliche Pflicht: § 43 WoGG, Fortschreibung "zum 1. Januar jedes zweiten Jahres" per Rechtsverordnung mit Zustimmung des Bundesrates (Höchstbeträge, b, c, M, Y, 65-Euro-Zuschlag). Quelle: https://www.gesetze-im-internet.de/wogg/__43.html, 07.10.2026. P, hoch.
- **Keine Verordnung für 2027 beschlossen oder verkündet; nach Entwurf soll sie ausfallen.** Der Regierungsentwurf fügt § 43 Abs. 11 ein: "Abweichend von Absatz 1 findet keine Fortschreibung zum 1. Januar 2027 statt." Quelle: BT-Drs. 21/8284 vom 30.09.2026, Art. 1 Nr. 26, https://dserver.bundestag.de/btd/21/082/2108284.pdf, 07.10.2026. P, hoch (für den Inhalt des Entwurfs).
- Verfahrensstand: Kabinettsbeschluss 06.07.2026 (laut Bundesregierungsantwort BT-Drs. 21/7689 vom 21.08.2026: "vom Bundeskabinett inzwischen beschlossene Reform", https://dserver.bundestag.de/btd/21/076/2107689.pdf, P, hoch; das Datum 06.07. stammt aus einer Suchmaschinen-Zusammenfassung, S, mittel). Bundesrat 1. Durchgang am 25.09.2026: Stellungnahme mit Änderungswünschen, nicht Ablehnung (Bundestagsseite, 07.10.2026: https://www.bundestag.de/dokumente/textarchiv/2026/kw41-de-wohngeldgesetz-1217564, P, hoch; Details Freibetrag Alleinerziehende 1.320 auf 1.920 in BT-Drs. 21/8284, Stellungnahme des Bundesrates). Gegenäußerung der Bundesregierung lehnt die Anhebung ab (BT-Drs. 21/8284, Gegenäußerung zu Nr. 2). Erste Lesung Bundestag: 08.10.2026, Überweisung an den Ausschuss für Wohnen, Stadtentwicklung, Bauwesen und Kommunen (Bundestagsseite, P, hoch). Inkrafttreten laut Entwurf 01.01.2027. Zustimmungsbedürftig (Entwurf: "mit Zustimmung des Bundesrates").
- BMWSB-Rechnerseite bestätigt: "Wohngeldnovelle zum 1. Januar 2027 ... im parlamentarischen Gesetzgebungsverfahren ... rechtzeitig vor Inkrafttreten ... angepasster Wohngeldrechner". https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeldrechner/wohngeldrechner-2025_node.html, 07.10.2026. P, hoch.
- Widerspruch zu älteren Pressemeldungen: einige Artikel (gegen-hartz.de, finanz.de, S, niedrig) sprachen vor dem Kabinettsbeschluss von einer Erhöhung zum 01.01.2027 per "Dritter Fortschreibungsverordnung". Das ist durch den Regierungsentwurf (P) überholt. Eine Zusammenfassung behauptete außerdem, die Mietenstufen würden nicht neu zugeordnet; der Entwurf selbst enthält dagegen eine neue Anlage zur WoGV "ab dem 1. Januar 2027" (siehe 5.4). Belastbarer ist der Gesetzestext (P).

**2.4 Werte laut Regierungsentwurf (nur gültig, wenn so beschlossen).** Quelle: BT-Drs. 21/8284, Art. 1 Nr. 8, 10, 11, 12, 28, 29 und Begründung; Kabinettsfassung inhaltsgleich: https://www.bmwsb.bund.de/SharedDocs/gesetzgebungsverfahren/DE/wohngeld-2026/kabinettsentwurf.pdf?__blob=publicationFile&v=1. Beide abgerufen 07.10.2026. P (Entwurf, nicht Gesetz), hoch für "steht im Entwurf".
- Anlage 1: Höchstbeträge **unverändert** (gleiche Tabelle wie 2.1); Klimakomponente wird in die Anlage verschoben (Werte unverändert 19,20 / 24,80 / 29,60 / 34,40 / 39,20, Mehrbetrag 4,80), mit Spalte "Gesamtbetrag aus Höchstbetrag und Klimakomponente" (z. B. HH1 Stufe I 380,20; HH5 Stufe VII 1341,20; Mehrbetrag Stufe I 86,80 bis Stufe VII 167,80).
- Anlage 2: a und b **unverändert**; c steigt für alle Haushaltsgrößen um 58 Prozent (Begründung Nr. 29). Neue c-Werte (Entwurf, Notation Gesetz): HH1 6,446E-5; HH2 4,803E-5; HH3 3,871E-5; HH4 2,781E-5; HH5 2,718E-5; HH6 2,623E-5; HH7 2,607E-5; HH8 2,607E-5; HH9 2,623E-5; HH10 2,623E-5; HH11 3,097E-5; HH12 3,492E-5.
- Anlage 3 (Mindestwerte M, Y): im Entwurf **nicht geändert** (Anlage 3 kommt im Artikel 1 nicht vor).
- § 21 Abs. 1 Nr. 1: Bagatellgrenze **15 Euro** (heute 10). Neuer § 21 Abs. 2: erhebliches Vermögen "in der Regel", wenn verwertbares Vermögen 60.000 Euro für das erste Mitglied plus 30.000 je weiteres, höchstens 120.000 Euro, übersteigt.
- Neuer § 19 Abs. 4: Wohngeld darf die zu berücksichtigende Miete oder Belastung nicht übersteigen; Abs. 3 (65 Euro) bleibt, ohne den bisherigen Zusatz "höchstens ... Miete".
- Einkommen: Werbungskosten bei Einnahmen mit § 9a-EStG-Pauschbetrag nur noch in Höhe der Pauschbeträge; § 17 Nr. 1 Freibetrag 1.800 Euro künftig bei GdB 100 **oder** Pflegegrad 3; Einkommenskatalog § 14 Abs. 2 gestrafft (Nummern 8 bis 23). Freibetrag Alleinerziehende bleibt 1.320.
- WoGV § 6 Abs. 2 Nr. 4: Pauschale für Garage/Stellplatz einheitlich 36 Euro monatlich.

---

## 3. Heizkosten-Entlastung und Klimakomponente (§ 12 Abs. 6 und 7), heute gültig

Quelle: https://www.gesetze-im-internet.de/wogg/__12.html, 07.10.2026. P, hoch.

**Gesamtbetrag zur Entlastung bei den Heizkosten (Abs. 6), Euro/Monat.** Er wird zur (gekappten) Miete addiert (§ 11 Abs. 1 Nr. 2), zählt also nicht gegen den Höchstbetrag.

| HH | CO2-Bepreisung | dauerhafte Heizkostenkomponente | Gesamtbetrag |
|---|---|---|---|
| 1 | 14,40 | 96 | 110,40 |
| 2 | 18,60 | 124 | 142,60 |
| 3 | 22,20 | 148 | 170,20 |
| 4 | 25,80 | 172 | 197,80 |
| 5 | 29,40 | 196 | 225,40 |
| je weiteres Mitglied | 3,60 | 24 | 27,60 |

**Klimakomponente (Abs. 7), Zuschlag zu den Höchstbeträgen, Euro/Monat.** 1: 19,20 / 2: 24,80 / 3: 29,60 / 4: 34,40 / 5: 39,20 / je weiteres Mitglied 4,80.

**Entwurf 2027 (nicht beschlossen):** Heizkosten-Gesamtbetrag halbiert bei der dauerhaften Komponente, CO2-Anteil bleibt. HH1 14,40 + 48 = 62,40; HH2 18,60 + 62 = 80,60; HH3 22,20 + 74 = 96,20; HH4 25,80 + 86 = 111,80; HH5 29,40 + 98 = 127,40; je weiteres Mitglied 3,60 + 12 = 15,60. Quelle: BT-Drs. 21/8284 Art. 1 Nr. 8 d). P (Entwurf), hoch. Klimakomponente unverändert, nur verschoben (siehe 2.4).

Hinweis zur Mechanik (Wortlaut § 11 Abs. 1): M = min(Miete, Höchstbetrag + Klimakomponente) + Heizkosten-Gesamtbetrag. Bestätigt durch BMWSB-Beispiel 4 (Belastung 750 gekappt auf 521 + 29,60, plus 170,20 = 720,80).

---

## 4. Einkommensseite in Kurzform

Alle Normen: https://www.gesetze-im-internet.de/wogg/__13.html, __14.html, __15.html, __16.html, __17.html, __17a.html, __18.html, abgerufen 07.10.2026. P, hoch. (Einzelseiten: gleiche Basis-URL mit jeweiliger Nummer.)

- **§ 13:** Gesamteinkommen = Summe der Jahreseinkommen (§ 14) der zu berücksichtigenden Mitglieder, abzüglich Freibeträge (§§ 17, 17a) und Unterhaltsabzüge (§ 18). Monatliches Gesamteinkommen (= Y) = **ein Zwölftel** (§ 13 Abs. 2). Eine Rundung von Y ist im Gesetz nicht genannt (siehe 1.2).
- **§ 14 Abs. 1:** Jahreseinkommen des Mitglieds = Summe der **positiven** Einkünfte nach § 2 Abs. 1 und 2 EStG plus Einnahmen nach § 14 Abs. 2 (Katalog, u. a. steuerfreie Lohnersatzleistungen, Unterhalt, Unterhaltsvorschuss, ALG II/Sozialhilfe-Leistungen, Hälfte von BAföG-Zuschüssen, Zuschläge nach § 3b EStG) **abzüglich** der Abzugsbeträge nach § 16. Kein Ausgleich mit negativen Einkünften. Bei Arbeitnehmern: Einnahmen minus Werbungskosten, mindestens Pauschbetrag 1.230 Euro/Jahr (§ 9a EStG Nr. 1a; Versorgungsbezüge sowie Renten nach § 22: 102 Euro/Jahr). Quelle § 9a: https://www.gesetze-im-internet.de/estg/__9a.html, 07.10.2026, P, hoch. Pauschal besteuerte Minijobs (§ 40a EStG) zählen, nach BMWSB-Beispiel 6 ohne Werbungskostenabzug.
- **§ 16:** "jeweils 10 Prozent" des Betrags nach §§ 14, 15 werden abgezogen, wenn im Bewilligungszeitraum zu erwarten sind: (1) Steuern vom Einkommen, (2) Pflichtbeiträge zur gesetzlichen Kranken- und Pflegeversicherung, (3) Pflichtbeiträge zur gesetzlichen Rentenversicherung. Also 0, 10, 20 oder 30 % **je Mitglied**. Sätze 2 bis 4: gleiche Wirkung für laufende Beiträge zu vergleichbaren privaten/öffentlichen Versicherungen, wenn keine Pflichtbeiträge anfallen (nicht bei im Wesentlichen beitragsfreier Sicherung oder Beiträgen durch Dritte).
- **§ 17 Freibeträge (jährlich, vom Gesamteinkommen):** 1.800 Euro je schwerbehindertem Mitglied (GdB 100, oder GdB unter 100 bei Pflegebedürftigkeit nach SGB XI mit häuslicher/teilstationärer Pflege oder Kurzzeitpflege); 750 Euro je NS-Verfolgtem; **1.320 Euro** für Alleinerziehende (Mitglied wohnt ausschließlich mit Kind(ern), mindestens ein Kind unter 18 mit Kindergeld); Einnahmen aus Erwerbstätigkeit je Kind (zu berücksichtigendes Mitglied, unter 25), höchstens 1.200 Euro.
- **§ 17a Grundrentenfreibetrag:** bei mindestens 33 Jahren Grundrentenzeiten: 1.200 Euro der Rente plus 30 % des übersteigenden Rentenanteils, Obergrenze 12 mal 50 % der Regelbedarfsstufe 1 (BMWSB-Beispiel 11 nennt für 2025 "monatlich max. 281,50 Euro"; Wert für 2027 nicht geprüft).
- **§ 18 Unterhaltsabzug (jährlich):** bis 3.000 Euro für auswärts wohnendes, in Ausbildung befindliches Mitglied; bis 3.000 Euro für Kind im Wechselmodell-Fall nach § 5 Abs. 4 (nur gezahlt an anderen Elternteil); bis 6.000 Euro für früheren/getrennt lebenden Ehegatten; bis 3.000 Euro für sonstige Person. Bei Titel/Vereinbarung bis zum festgelegten Betrag.
- **§ 15:** Prognose zum Zeitpunkt der Antragstellung für den Bewilligungszeitraum; Sonderzahlungen auf zwölf Monate verteilt (Abs. 2, 3); bei abweichendem Bewilligungszeitraum das Zwölffache des durchschnittlichen Monatseinkommens (Abs. 4).

**Umrechnung für einen Rechner (Zusammenfassung des Gesetzes, mit den Beispielen in Abschnitt 6 gegengelesen):**
je Mitglied: (Bruttoeinnahmen − Werbungskosten, mindestens Pauschbetrag) × (1 − 0,1 × Anzahl der zutreffenden Kategorien Steuern / KV+PV / RV); dann Summe über Mitglieder, minus Freibeträge (§ 17, 17a) und Unterhaltsabzüge (§ 18), durch 12 (bzw. bei Monatswerten direkt monatlich) ergibt Y. Die BMWSB-Beispiele rechnen monatlich: Arbeitnehmer-Pauschbetrag 102,50 Euro (= 1.230/12), Rentner 8,50 Euro (= 102/12), Freibeträge als Monatsbetrag (1.800/12 = 150, 1.320/12 = 110). Beachte: Pauschbetrag nur bis zur Höhe der Einnahmen (§ 9a Satz 2 EStG). Kein Pauschbetrag bei ALG I und Unterhaltsvorschuss (BMWSB-Beispiele 2, 5).

---

## 5. Mietenstufen je Gemeinde

**5.1 Amtliche Quelle.** Anlage zu § 1 Abs. 3 Wohngeldverordnung, "Mietenstufen der Gemeinden nach Ländern ab 1. Januar 2023" (Fundstelle BGBl. I 2022, 2166-2210, mit Änderungen).
- URL (HTML, eine Seite, nur Gemeindenamen, **keine AGS**): https://www.gesetze-im-internet.de/wogv/anlage.html, abgerufen 07.10.2026. P, hoch.
- URL (PDF des BMWSB, gleiche Liste): https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/wohngeld-2023/mietstufen-2023.pdf?__blob=publicationFile&v=2 (verlinkt von der Rechnerseite), 07.10.2026. P, hoch.
- Die Fortschreibung zum 01.01.2025 hat die Zuordnung nicht verändert: WoGV-Änderung 2024 (BGBl. 2024 I Nr. 314, Art. 2) laut Entwurf "zuletzt durch Artikel 2 der Verordnung vom 21. Oktober 2024", die Anlage trägt weiter "ab 1. Januar 2023". Landesseiten sprechen von "Mietstufe 2023-2026" (S, mittel).

**5.2 Maschinenlesbar mit AGS: nicht gefunden.** Geprüft: gii (HTML ohne AGS), BMWSB (nur PDF), Suche nach xlsx/csv bei Destatis, BBSR, BMWSB, GovData (kein Treffer), GitHub-Repo-Suche per `gh search repos` (kein Treffer), Landesseiten (Sachsen, Bayern, Schleswig-Holstein: Tabellen/PDF nach Namen). Das heißt: Liste muss aus dem gii-HTML geparst und über Namen/Kreis mit dem Destatis-Gemeindeverzeichnis (AGS) verknüpft werden. Destatis bietet das Gemeindeverzeichnis als Excel und als Datei fester Satzlänge (GV100AD) an: https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html, 07.10.2026, P, mittel (Seite lieferte über das Abruftool eine Zusammenfassung; Lizenz dort nicht erkennbar; Gebietsstand der Mietenstufen-Liste ist 31.03.2021, der des Verzeichnisses neuer, daher Gemeindefusionen beachten).
- Bekannte Fehlerquelle: Bei der Liste 2023 wurden 18 Gemeinden zunächst irrtümlich über den Kreis statt einzeln zugeordnet (Suchergebnis, S, niedrig, nicht an Primärquelle belegt). Nicht verifiziert.

**5.3 Regel unter 10.000 Einwohnern.** § 12 Abs. 3 WoGG: Mietenniveau gesondert für Gemeinden mit 10.000 und mehr Einwohnern; Gemeinden unter 10.000 und gemeindefreie Gebiete "nach Kreisen zusammengefasst". Einwohnerzahl nach Fortschreibung gemäß § 5 Bevölkerungsstatistikgesetz. Die Anlage sagt: "Soweit die zu einem Kreis gehörenden Gemeinden in den Tabellen nicht gesondert aufgeführt sind, gilt die Mietenstufe des Kreises für diese Gemeinden." Für die 10.000-Schwelle gilt der Stichtag 30.09.2020, Gebietsstand 31.03.2021. Zusätzlich § 12 Abs. 4a: 28 genannte Inselgemeinden (Baltrum, Borkum, Juist, Langeoog, Norderney, Spiekeroog, Wangerooge, Helgoland, Föhr-/Amrum-Gemeinden, Halligen, Pellworm, Hiddensee u. a.) bilden "Inseln ohne Festlandanschluss", Mietenstufe V. Quellen: https://www.gesetze-im-internet.de/wogg/__12.html und WoGV-Anlage, 07.10.2026. P, hoch.
- Besonderheit in der Liste: manche Namen kommen doppelt vor (Gemeinde und Kreis, z. B. Leipzig Stadt II / Leipzig Kreis I; München Stadt und Landkreis jeweils VII). Eine Abfrage nur nach Namen ist daher nicht eindeutig; Kreiszuordnung nötig.

**5.4 Zahl der Einträge.** Eigene Zählung im gii-HTML (Zeilen mit Mietenstufe I bis VII): **1.881 Zeilen**, davon 1.601 in Gemeindetabellen, 279 in Kreistabellen, 1 Zeile "Inseln ohne Festlandanschluss". Abruf 07.10.2026, Zählung per Skript über die Tabellenstruktur; Regex-Zählung, Abweichung um wenige Zeilen möglich (z. B. Tabellenzeilen mit Sonderzeichen). Belegstärke mittel.

**5.5 Neue Liste im Entwurf 2027.** BT-Drs. 21/8284 enthält in Art. 2 Nr. 2 eine **neue** Anlage zu § 1 Abs. 3 WoGV "ab dem 1. Januar 2027" mit eigenen Zuordnungen (Daten der Wohngeldstatistik 31.12.2023 und 31.12.2024; Gebietsstand 31.03.2025; Bevölkerungsstichtag 30.09.2024). Begründung: Anpassung der Mietenstufen, weil die Gesetzesänderung eine "strukturelle Änderung im Sinne des § 12 Absatz 4 Satz 1 WoGG" sei. Rund 1.880 Zeilen (Regex-Zählung, grob). Beispiel aus beiden Primärquellen: Aalen, Stadt ist 2023 Stufe III und im Entwurf 2027 Stufe IV. Quelle: BT-Drs. 21/8284 (PDF "Vorabfassung"), 07.10.2026, P, hoch für den Entwurfsinhalt. Auch hier nur Namen, keine AGS. Nur relevant, wenn das Gesetz so kommt.

---

## 6. Amtliche Rechenbeispiele (Testfälle)

### 6a. BMWSB "Beispiele für die Berechnung des Wohngelds", Stand 01.01.2025, 11 Fälle
Quelle: https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/wohngeld-2025/rechenbeispiele-2025.pdf?__blob=publicationFile&v=2 (verlinkt auf der BMWSB-Rechnerseite), abgerufen 07.10.2026 (per markitdown gewandelt). Art: P (Ministerium), Belegstärke hoch für die Zahlen; Einschränkung: Das Dokument gibt nur Zwischenwerte bis zum Gesamteinkommen und das Endergebnis an, **nicht** z1 bis z4. Ort/Mietenstufe stehen im Dokument; ich habe sie gegen die WoGV-Anlage abgeglichen (alle 11 passen: Jüterbog I, Ludwigshafen IV, Leipzig Stadt II, Kreis Schleswig-Flensburg I, Wiesbaden VI, München VII, Weimar III, Friedrichshafen V, Attendorn II, Lübeck IV, Neubrandenburg II). Alle Eurobeträge monatlich. "Pausch." = pauschaler Abzug nach § 16. Das Dokument weist darauf hin, dass die Beispiele nur der Veranschaulichung dienen.

| Nr | Fall | Stufe (Ort) | Einkommen und Abzüge | Gesamteinkommen Y | Miete / Belastung, Höchstbetrag, M | Wohngeld |
|---|---|---|---|---|---|---|
| 1 | 1 Person, Rentnerin (keine 33 Jahre Grundrentenzeiten), KV/PV ja, Steuer nein | I (Jüterbog) | Rente 1.300,00; WK-Pauschbetrag −8,50 = 1.291,50; Pausch. 10 % −129,15 | 1.162,35 | Miete 335,00; Höchstbetrag 361,00 + Klima 19,20; M = 335,00 + 110,40 = 445,40 | 110 |
| 2 | 1 Person, ALG I, keine Beiträge/Steuer | IV (Ludwigshafen) | ALG I 1.350,00; kein Pauschbetrag, kein Abzug | 1.350,00 | Miete 470,00; Höchstbetrag 511,00 + 19,20; M = 470,00 + 110,40 = 580,40 | 88 |
| 3 | 2 Personen, Ehepaar, Renten, KV/PV ja, Steuer nein, Ehemann GdB 100 | II (Leipzig, Stadt) | Mann 1.410,00 −8,50 = 1.401,50, −10 % (−140,15) = 1.231,35; Frau 540,00 −8,50 = 531,50, −10 % (−53,15) = 478,35; Summe 1.739,70; Freibetrag GdB 100: −150,00 (1.800/Jahr) | 1.589,70 | Miete 480,00; Höchstbetrag 493,00 + 24,80; M = 480,00 + 142,60 = 622,60 | 166 |
| 4 | 3 Personen, Ehepaar + Kind, Eigenheim (Lastenzuschuss); Mann Arbeitnehmer mit KV/PV und RV, keine Steuer; Frau arbeitslos ohne ALG I | I (Kreis Schleswig-Flensburg) | Brutto 2.150,00 (ohne Kindergeld); −102,50 = 2.047,50; Pausch. 20 % −409,50 | 1.638,00 | Belastung 750,00; Höchstbetrag 521,00 + Klima 29,60; M = 521,00 + 29,60 + 170,20 = 720,80 | 320 |
| 5 | 3 Personen, Alleinerziehende + 2 Kinder (9 und 13); Arbeitnehmerin KV/PV und RV, keine Steuer; Unterhaltsvorschuss | VI (Wiesbaden) | Brutto 1.530,00; −102,50 = 1.427,50; Pausch. 20 % −285,50 = 1.142,00; Unterhaltsvorschuss 696,00 (kein Abzug); Summe 1.838,00; Freibetrag Alleinerziehende −110,00 (1.320/Jahr) | 1.728,00 | Miete 700,00; Höchstbetrag 887,00 + 29,60; M = 700,00 + 170,20 = 870,20 | 372 |
| 6 | 4 Personen, Ehepaar + 2 Kinder; Mann: Steuer + KV/PV + RV; Frau Minijob pauschalversteuert, ohne WK-Abzug | VII (München) | Mann 2.490,00 −102,50 = 2.387,50, Pausch. 30 % −716,25 = 1.671,25; Frau 556,00 (kein Abzug); Summe 2.227,25 | 2.227,25 | Miete 1.225,00; Höchstbetrag 1.139,00 + 34,40; M = 1.139,00 + 34,40 + 197,80 = 1.371,20 | 691 |
| 7 | 4 Personen, Ehepaar + 2 Kinder; Frau Arbeitnehmerin KV/PV und RV, keine Steuer; Mann arbeitslos ohne ALG I | III (Weimar) | Brutto 2.240,00; −102,50 = 2.137,50; Pausch. 20 % −427,50 | 1.710,00 | Miete 580,00; Höchstbetrag 766,00 + 34,40; M = 580,00 + 197,80 = 777,80 | 485 |
| 8 | 5 Personen, Ehepaar + 3 Kinder; Mann Steuer + KV/PV + RV; Frau arbeitslos ohne ALG I; Tochter (15) Zeitungsausträgerin | V (Friedrichshafen) | Mann 2.750,00 −102,50 = 2.647,50, Pausch. 30 % −794,25 = 1.853,25; Tochter 60,00 (kein WK-Abzug); Summe 1.913,25; Freibetrag Kinder mit Erwerbseinkommen −60,00 | 1.853,25 | Miete 870,00; Höchstbetrag 1.080,00 + 39,20; M = 870,00 + 225,40 = 1.095,40 | 747 |
| 9 | 6 Personen, Ehepaar + 3 Kinder + Schwiegermutter; Frau Steuer + KV/PV + RV; Mann arbeitslos ohne ALG I; Schwiegermutter Rente, KV/PV | II (Attendorn) | Frau 4.000,00 −102,50 = 3.897,50, Pausch. 30 % −1.169,25 = 2.728,25; Schwiegermutter 645,00 −8,50 = 636,50, Pausch. 10 % −63,65 = 572,85 | 3.301,10 | Miete 780,00; Höchstbetrag 876,00 + Klima 44; M = 780,00 + 253,00 = 1.033,00 | 343 |
| 10 | 1 zu berücksichtigendes Mitglied + 1 ausgeschlossenes (Sohn ALG II); Vater Rentner, KV/PV, keine Steuer; Miete hälftig | IV (Lübeck) | Rente 880,00 −8,50 = 871,50; Pausch. 10 % −87,15 | 784,35 | Miete 570,00, anteilig 50 % = 285,00; Höchstbetrag 50 % von (619 + 24,80) = 321,90; M = 285,00 + 50 % von 142,60 = 356,30 | 191 |
| 11 | 1 Person, Rentnerin mit 33 Jahren Grundrentenzeiten, Eigenheim (Lastenzuschuss) | II (Neubrandenburg) | Rente 945,00 (mit Grundrentenzuschlag) −8,50 = 936,50; Pausch. 10 % −93,65 = 842,85; Grundrentenfreibetrag −281,50 (max.) | 561,35 | Belastung 345,00; Höchstbetrag 408,00 + 19,20; M = 345,00 + 110,40 = 455,40 | 342 |

Für Tests: Eingaben pro Fall sind Haushaltsgröße, Mietenstufe, Miete/Belastung und die Einkommensdetails; Soll-Ausgaben sind Y, M und das Wohngeld. Die Mietenstufe stammt aus der Gemeinde der Liste 2023.

### 6b. Länderhinweis mit vollständiger Rechnung (14 Mitglieder), Stand Dezember 2024
Quelle: https://www.tacheles-sozialhilfe.de/files/Weisungen/WoGG/241202-hinweise-wogmehrals12hmer_geschwaerzt.pdf, abgerufen 07.10.2026 (Datei vom 02.12.2024 laut Dateiname; Kopfzeile mit Herausgeber im PDF nicht lesbar, daher Art: L, vermutlich Landesbehörde, **Herausgeber nicht bestätigt**; Belegstärke mittel). Inhalt: ergänzte Fassung der WoGVwV Nr. 19.31 zum 01.01.2025.
- Eingaben: 14 zu berücksichtigende Mitglieder, Mietenstufe III, Miete 1.600 Euro, Y = 4.688,25 Euro (ungerundet).
- Zwischenwerte: Höchstbetrag 875 + 7·106 = 1.617; Klimakomponente 39,20 + 7·4,80 = 72,80; Gesamthöchstbetrag 1.689,80; Heizkosten-Gesamtbetrag 225,40 + 7·27,60 = 418,60; M = 1.600 + 418,60 = **2.018,60**.
- a = -0,12; b = 0,0001107; c = 0,0000221 (Werte für 12).
- z1 = 0,207069345; z2 = 970,7928566963; z3 = 1.047,8071433038; z4 = 1.204,9782147994 → aufgerundet **1.205 Euro** (für 12 Mitglieder).
- Zuschlag 2 · 65 = 130 → **Wohngeld für 14 Mitglieder: 1.335 Euro**.
- Ich habe die Zwischenwerte nicht nachgerechnet.

### 6c. Nicht gefunden
- Beispiele für die **Rechtslage 2027** (neues c, halbierte Heizkostenkomponente): weder in BT-Drs. 21/8284 (Suche nach "Beispiel", "Modellhaushalt", "Musterhaushalt": keine Rechenbeispiele) noch im Kabinettsentwurf oder der BT-Antwort 21/7689 (diese nennt nur Haushaltszahlen und Haushaltsbelastungen; zur Wirkung einzelner Bausteine: "eine gesonderte Auswertung ... erfolgte nicht"). Suchmaschinen-Treffer (gegen-hartz.de, cash-online.de u. a., S, niedrig) nennen Modellrechnungen ohne belegte Eingaben; nicht verwendbar.
- Beispiele in der **WoGVwV** (Verwaltungsvorschrift): Nr. 19.31 mit Beispiel existiert laut Länderhinweis (6b), Volltext der WoGVwV nicht abgerufen. Geprüft: BR-Drs. 284/17 (PDF, via markitdown kein Beispieltext extrahierbar), verwaltungsvorschriften-im-internet.de (URL-Versuch 404). Nicht gefunden.
- **Gesetzesbegründung Wohngeld-Plus-Gesetz** (BT-Drs. 20/3936): keine Rechenbeispiele gefunden (Suchbegriffe Beispiel/Modell/Musterhaushalt: nur Randtreffer). **Dynamisierungsverordnung 2024** (BR-Drs. 401/24, dort laut Suche): nicht abgerufen. Die in der Suche genannte BR-Drs. 449/24 war ein anderes Vorhaben (Strafrecht).
- **Wohngeldtabellen** (frühere Anlage mit Tabellenwerten): im aktuellen WoGG nicht vorhanden; nicht gefunden.

---

## 7. Amtlicher Online-Rechner zum Gegenprüfen

- **BMWSB "Wohngeld-Plus - Rechner (ab 1. Januar 2025)":** https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeldrechner/wohngeldrechner-2025_node.html (Kurz-URL https://www.bmwsb.bund.de/wohngeldrechner leitet dorthin weiter, beide HTTP 200). Abruf 07.10.2026. Art: P (Ministerium). Belegstärke hoch.
  - Eingaben laut Seite: Heimbewohner ja/nein, monatliche Bruttokaltmiete/Belastung, PLZ und Gemeinde, Mietenstufe, Zahl der Haushaltsmitglieder (max. 12), davon ausgeschlossene, je Mitglied monatliches Einkommen, monatliche Werbungskosten, Abzüge (Einkommensteuer, KV/PV, RV, erwerbstätiges Kind unter 25, 33 Jahre Grundrentenzeiten), Alleinerziehend, monatliche Unterhaltspflichten, Zahl schwerbehinderter Mitglieder.
  - Rechtsstand: "beruht auf der aktuellen Rechtsgrundlage" (also bis 31.12.2026); Seite kündigt angepassten Rechner "rechtzeitig vor Inkrafttreten der Wohngeldnovelle" an. Ergebnisse unverbindlich ("erste Orientierung").
  - Auf der Seite verlinkt: die Mietenstufen-PDF und die Rechenbeispiele-PDF (Abschnitte 5 und 6a). Die Rechenbeispiele sind damit das offizielle Gegenstück zum Rechner.
  - Ich habe den Rechner **nicht** bedient (interaktives Formular); ob er die 11 Beispiele exakt reproduziert, ist nicht geprüft.
- **Länder-Rechner (Beispiel):** Hamburg verlinkt den Rechner des NRW-Wohngeldportals: https://www.wohngeldrechner.nrw.de/modul/wohngeldrechner/wgrbhtml/WGRBWLKM?BULA=HH (über https://www.hamburg.de/service/info/11893365/, Seite "Letzte Aktualisierung: 06.10.2026", "Daten werden nicht gespeichert"). Art: Landesseite, Belegstärke mittel (Rechtsjahr des Rechners dort nicht genannt; nicht bedient). Berlin hat laut Suchergebnis ebenfalls einen Rechner (service.berlin.de, S, niedrig, nicht geprüft).

---

## Offene Fragen, die das Web nicht beantwortet hat

1. Rundungsmodus bei den "zehn Nachkommastellen" (Abschneiden oder Runden der 10. Stelle): nicht öffentlich dokumentiert.
2. Vollständiger Text der WoGVwV (28.06.2017, mit Nr. 19.31 und weiteren Beispielen) nicht abgerufen; amtlicher Fundort auf verwaltungsvorschriften-im-internet.de nicht ermittelt.
3. Herausgeber des Länderhinweises (6b) nicht lesbar.
4. Maschinenlesbare Mietenstufen mit AGS (amtlich): nicht gefunden; die Verknüpfung Name zu AGS muss selbst gebaut und gegen Gebietsstand 31.03.2021 geprüft werden.
5. Ob der BMWSB-Rechner die 11 Beispiele reproduziert; Z1 bis z4 der BMWSB-Beispiele (nur Endergebnisse veröffentlicht).
6. Amtliche Rechenbeispiele für das Recht ab 2027: nicht gefunden. Ergebnis der ersten Lesung (08.10.2026), Ausschussberatung und Bundesratszustimmung stehen aus; Werte können sich noch ändern (Bundesrat forderte u. a. Freibetrag Alleinerziehende 1.920 Euro, von der Bundesregierung abgelehnt).
7. Grundrentenfreibetrag-Obergrenze für 2026/2027 (hängt an Regelbedarfsstufe 1): nicht geprüft; nur 281,50 Euro für 2025 belegt.
8. Primärtext der Verordnung BGBl. 2024 I Nr. 314 nicht direkt gelesen; Werte stammen aus der konsolidierten Fassung bei gii, die auf dieses BGBl verweist.

## Hinweis zur Quellenlage
Die Entwurfszahlen (Abschnitte 2.4, 3, 5.5) stammen aus der Bundestagsdrucksache 21/8284 (Vorabfassung, "wird durch die lektorierte Fassung ersetzt") und wurden mit dem Kabinettsentwurf des BMWSB abgeglichen (c-Reihe, Heizkostenwerte, Anlage 1 stimmen überein). Websuche-Zusammenfassungen dienten nur zum Auffinden von Primärquellen; wo sie von den Primärquellen abwichen, gilt die Primärquelle.
