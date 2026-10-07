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
}
