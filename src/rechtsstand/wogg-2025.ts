import { tiefEinfrieren } from "./einfrieren";
import type { Rechtsstand } from "./typen";

// Werte ab 01.01.2025, Zweite Verordnung zur Fortschreibung des Wohngeldes, BGBl. 2024 I Nr. 314.
// Geprüft gegen gesetze-im-internet.de am 07.10.2026, siehe docs/quellen/2026-10-07-recherche-wohngeld-fachlich.md.
export const WOGG_2025: Rechtsstand = tiefEinfrieren({
  id: "wogg-2025",
  gueltigAb: "2025-01-01",
  gueltigBis: "2026-12-31",
  fundstelle: "WoGG in der ab 01.01.2025 geltenden Fassung (BGBl. 2024 I Nr. 314)",

  // Anlage 1 WoGG, https://www.gesetze-im-internet.de/wogg/anlage_1.html
  hoechstbetraege: {
    bis5: {
      1: { 1: 361, 2: 408, 3: 456, 4: 511, 5: 562, 6: 615, 7: 677 },
      2: { 1: 437, 2: 493, 3: 551, 4: 619, 5: 680, 6: 745, 7: 820 },
      3: { 1: 521, 2: 587, 3: 657, 4: 737, 5: 809, 6: 887, 7: 975 },
      4: { 1: 608, 2: 686, 3: 766, 4: 858, 5: 946, 6: 1035, 7: 1139 },
      5: { 1: 694, 2: 782, 3: 875, 4: 982, 5: 1080, 6: 1183, 7: 1302 },
    },
    mehrbetrag: { 1: 82, 2: 94, 3: 106, 4: 119, 5: 129, 6: 149, 7: 163 },
  },

  // Anlage 2 WoGG, https://www.gesetze-im-internet.de/wogg/anlage_2.html
  // Gesetzesnotation E-2 = /100, E-4 = /10 000, E-5 = /100 000, E-1 = /10.
  koeffizienten: {
    1: { a: "0.04", b: "0.0004797", c: "0.0000408" },
    2: { a: "0.03", b: "0.0003571", c: "0.0000304" },
    3: { a: "0.02", b: "0.0002917", c: "0.0000245" },
    4: { a: "0.01", b: "0.0002163", c: "0.0000176" },
    5: { a: "0", b: "0.0001907", c: "0.0000172" },
    6: { a: "-0.01", b: "0.0001722", c: "0.0000166" },
    7: { a: "-0.02", b: "0.0001592", c: "0.0000165" },
    8: { a: "-0.03", b: "0.0001583", c: "0.0000165" },
    9: { a: "-0.04", b: "0.0001376", c: "0.0000166" },
    10: { a: "-0.06", b: "0.0001249", c: "0.0000166" },
    11: { a: "-0.09", b: "0.0001141", c: "0.0000196" },
    12: { a: "-0.12", b: "0.0001107", c: "0.0000221" },
  },

  // Anlage 3 Nr. 1 WoGG, https://www.gesetze-im-internet.de/wogg/anlage_3.html
  mindestwerte: {
    1: { m: 54, y: 396 },
    2: { m: 67, y: 679 },
    3: { m: 79, y: 906 },
    4: { m: 92, y: 1132 },
    5: { m: 103, y: 1358 },
    6: { m: 103, y: 1585 },
    7: { m: 115, y: 1811 },
    8: { m: 128, y: 2037 },
    9: { m: 140, y: 2264 },
    10: { m: 152, y: 2490 },
    11: { m: 187, y: 2717 },
    12: { m: 298, y: 2943 },
  },

  // § 12 Abs. 6 WoGG (CO2-Komponente plus dauerhafte Heizkostenkomponente), https://www.gesetze-im-internet.de/wogg/__12.html
  heizkostenentlastung: {
    bis5: { 1: 110.4, 2: 142.6, 3: 170.2, 4: 197.8, 5: 225.4 },
    mehrbetrag: 27.6,
  },

  // § 12 Abs. 7 WoGG
  klimakomponente: {
    bis5: { 1: 19.2, 2: 24.8, 3: 29.6, 4: 34.4, 5: 39.2 },
    mehrbetrag: 4.8,
  },

  // § 19 Abs. 3 WoGG
  zuschlagAb13: 65,

  // § 21 Nr. 1 WoGG
  bagatellgrenze: 10,

  // Einkommen. Belege: docs/quellen/2026-10-08-recherche-einkommen-betraege.md (Abruf 08.10.2026).
  // Alle Werte gelten unverändert 2025 und 2026.
  einkommen: {
    // § 9a Satz 1 Nr. 1a, 1b und 3 EStG, https://www.gesetze-im-internet.de/estg/__9a.html
    arbeitnehmerPauschbetrag: 1230,
    versorgungsPauschbetrag: 102,
    rentenPauschbetrag: 102,
    // § 20 Abs. 9 EStG; § 14 Abs. 2 Nr. 15 WoGG (Schwelle 100 €)
    sparerPauschbetrag: 1000,
    kapitalSchwelle: 100,
    // § 16 Satz 1 WoGG: jeweils 10 Prozent
    abzugsSatz: "0.1",
    // § 10 Abs. 1 BEEG: 300 € im Monat anrechnungsfrei
    elterngeldFreiMonatlich: 300,
    // § 14 Abs. 2 Nr. 19 Buchst. b WoGG
    zuwendungDritterFrei: 480,
    // § 17 Nr. 1 bis 4 WoGG, https://www.gesetze-im-internet.de/wogg/__17.html
    freibetragSchwerbehindert: 1800,
    freibetragNsVerfolgt: 750,
    freibetragAlleinerziehend: 1320,
    freibetragKindErwerbHoechst: 1200,
    // § 17a Abs. 1 WoGG; RBS 1 = 563 € in 2025 und 2026 (RBSFV 2026, BGBl. 2025 I Nr. 243, Nullrunde)
    grundrenteSockel: 1200,
    grundrenteSatz: "0.3",
    regelbedarfsstufe1: 563,
    // § 18 Satz 1 Nr. 1 bis 4 WoGG
    unterhaltHoechst: { auswaerts_ausbildung: 3000, kind_wechselmodell: 3000, ehegatte: 6000, sonstige: 3000 },
    // WoGVwV vom 28.06.2017 Nr. 21.37 Abs. 1, https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_28062017_SWII4.htm
    vermoegenErstes: 60000,
    vermoegenWeiteres: 30000,
  },
});
