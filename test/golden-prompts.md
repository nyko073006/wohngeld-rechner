# Golden-Prompt-Set

Prüffälle für die Abnahme in ChatGPT (Spec 4 und 7, E4). Dieselben Fälle dienen später als Testfälle der Einreichung.
Eine Abnahme gilt als bestanden, wenn ChatGPT bei allen positiven Fällen das genannte Tool aufruft und bei allen
negativen Fällen keines dieser Tools.

## Positive Fälle

### P1 Rentnerin, Mietstufe über den Ort

**Prompt:** „Wie viel Wohngeld bekomme ich? Ich bin Rentnerin, bekomme 1.300 € Rente im Monat und wohne allein in Jüterbog. Meine Miete ohne Heizung beträgt 335 €.“

**Erwartetes Tool:** `wohngeld_berechnen` (ggf. vorher `mietstufe_finden`)

**Erwartetes Verhalten:** ChatGPT fragt nach Steuern, Kranken- und Pflegeversicherung und Rentenversicherung, bevor es rechnet, und setzt sie nicht selbst. Mit „nur Kranken- und Pflegeversicherung“ und nach Rechtsstand 2025 (gilt bis 31.12.2026) ergibt sich 110 € (BMWSB-Beispiel 1). Die Antwort enthält den Hinweis auf die unverbindliche Schätzung.

### P2 Mietstufe eines mehrdeutigen Orts

**Prompt:** „Welche Mietstufe hat Esslingen?“

**Erwartetes Tool:** `mietstufe_finden`

**Erwartetes Verhalten:** Das Tool liefert „mehrdeutig“ (Esslingen am Neckar, Eßlingen in der Eifel). ChatGPT fragt nach dem Bundesland oder nennt beide mit Stufe.

### P3 Alleinerziehende in Wiesbaden

**Prompt:** „Ich bin alleinerziehend mit zwei Kindern in Wiesbaden, verdiene 1.530 € brutto, zahle Kranken- und Rentenversicherung, aber keine Steuern. Ein Kind bekommt 696 € Unterhaltsvorschuss. Die Miete ohne Heizung liegt bei 700 €. Habe ich Anspruch auf Wohngeld Plus?“

**Erwartetes Tool:** `wohngeld_berechnen`

**Erwartetes Verhalten:** Rechnung mit Mietstufe VI über den Wohnort. Ergebnis 372 € nach Rechtsstand 2025 (gilt bis 31.12.2026) (BMWSB-Beispiel 5), mit Rechenweg und Hinweis.

### P4 Lastenzuschuss für Eigentümer

**Prompt:** „Wir haben ein Eigenheim in Süderbrarup, sind zu dritt, ich verdiene 2.150 € brutto mit Kranken- und Rentenversicherung, die anderen haben kein Einkommen. Die Belastung liegt bei 750 € im Monat. Bekommen wir Lastenzuschuss?“

**Erwartetes Tool:** `wohngeld_berechnen` mit `art: "lastenzuschuss"`

**Erwartetes Verhalten:** Mietstufe I über den Kreis Schleswig-Flensburg, Ergebnis 320 € nach Rechtsstand 2025 (gilt bis 31.12.2026) (BMWSB-Beispiel 4).

### P5 Ort mit Landangabe

**Prompt:** „Ich ziehe nach Monheim in NRW. Welche Mietstufe gilt dort fürs Wohngeld?“

**Erwartetes Tool:** `mietstufe_finden` mit `land: "NRW"`

**Erwartetes Verhalten:** Eindeutig Monheim am Rhein, Mietstufe VI.

## Negative Fälle

### N1 Bürgergeld

**Prompt:** „Wie viel Bürgergeld steht mir als Single zu?“

**Erwartetes Tool:** keines

**Erwartetes Verhalten:** ChatGPT antwortet ohne die Tools des Wohngeld-Rechners.

### N2 Mietspiegel

**Prompt:** „Wie hoch ist der Mietspiegel in Köln pro Quadratmeter?“

**Erwartetes Tool:** keines

**Erwartetes Verhalten:** Kein Aufruf von `mietstufe_finden`; Mietstufe und Mietspiegel sind verschiedene Dinge.

### N3 Kindergeld

**Prompt:** „Wie beantrage ich Kindergeld für mein Neugeborenes?“

**Erwartetes Tool:** keines

**Erwartetes Verhalten:** ChatGPT antwortet ohne die Tools des Wohngeld-Rechners.
