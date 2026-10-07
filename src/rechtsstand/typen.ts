export type Mietstufe = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const MIETSTUFEN: readonly Mietstufe[] = [1, 2, 3, 4, 5, 6, 7];

// Tabelle mit eigenen Werten für 1 bis 5 Mitglieder und einem Mehrbetrag je weiterem Mitglied.
export interface StaffelBis5<T> {
  bis5: Record<1 | 2 | 3 | 4 | 5, T>;
  mehrbetrag: T;
}

export interface Koeffizienten {
  a: string;
  b: string;
  c: string;
}

// § 18 WoGG Satz 1 Nr. 1 bis 4.
export const UNTERHALT_ARTEN = ["auswaerts_ausbildung", "kind_wechselmodell", "ehegatte", "sonstige"] as const;
export type UnterhaltArt = (typeof UNTERHALT_ARTEN)[number];

// Beträge der Einkommensermittlung, jährlich, wenn nicht anders vermerkt.
export interface EinkommenWerte {
  arbeitnehmerPauschbetrag: number; // § 9a Satz 1 Nr. 1a EStG
  versorgungsPauschbetrag: number; // § 9a Satz 1 Nr. 1b EStG
  rentenPauschbetrag: number; // § 9a Satz 1 Nr. 3 EStG
  sparerPauschbetrag: number; // § 20 Abs. 9 EStG, je Person
  kapitalSchwelle: number; // § 14 Abs. 2 Nr. 15 WoGG
  abzugsSatz: string; // § 16 WoGG, je Kategorie
  elterngeldFreiMonatlich: number; // § 10 Abs. 1 BEEG, monatlich
  zuwendungDritterFrei: number; // § 14 Abs. 2 Nr. 19 Buchst. b WoGG
  freibetragSchwerbehindert: number; // § 17 Nr. 1 WoGG
  freibetragNsVerfolgt: number; // § 17 Nr. 2 WoGG
  freibetragAlleinerziehend: number; // § 17 Nr. 3 WoGG
  freibetragKindErwerbHoechst: number; // § 17 Nr. 4 WoGG
  grundrenteSockel: number; // § 17a Abs. 1 Satz 2 WoGG
  grundrenteSatz: string; // § 17a Abs. 1 Satz 2 WoGG
  regelbedarfsstufe1: number; // Anlage zu § 28 SGB XII, monatlich
  unterhaltHoechst: Record<UnterhaltArt, number>; // § 18 WoGG
  vermoegenErstes: number; // WoGVwV Nr. 21.37 Abs. 1 Nr. 1
  vermoegenWeiteres: number; // WoGVwV Nr. 21.37 Abs. 1 Nr. 2
}

export interface Rechtsstand {
  id: string;
  gueltigAb: string; // ISO-Datum, einschließlich
  gueltigBis: string; // ISO-Datum, einschließlich
  fundstelle: string;
  hoechstbetraege: StaffelBis5<Record<Mietstufe, number>>; // Anlage 1
  koeffizienten: Record<number, Koeffizienten>; // Anlage 2, Schlüssel 1 bis 12
  mindestwerte: Record<number, { m: number; y: number }>; // Anlage 3 Nr. 1, Schlüssel 1 bis 12
  heizkostenentlastung: StaffelBis5<number>; // § 12 Abs. 6
  klimakomponente: StaffelBis5<number>; // § 12 Abs. 7
  zuschlagAb13: number; // § 19 Abs. 3
  bagatellgrenze: number; // § 21 Nr. 1
  einkommen: EinkommenWerte; // §§ 13 bis 18, 21 Nr. 3
}
