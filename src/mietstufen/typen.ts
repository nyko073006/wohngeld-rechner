import type { Mietstufe } from "../rechtsstand/typen";

// Herkunft der Stufe einer Gemeinde:
//   g  eigene Zeile in der Gemeindetabelle der Anlage
//   k  Stufe des Kreises (Vorbemerkung der Anlage: Gemeinden ohne eigene Zeile)
//   i  Insel ohne Festlandanschluss (§ 12 Abs. 4a WoGG), gemeinsame Stufe der Anlage
//   n  Gemeinde fehlt im Basisverzeichnis (neu gebildet oder neu geschlüsselt), Kreisstufe als Annahme
export type Herkunft = "g" | "k" | "i" | "n";

export const HERKUENFTE: readonly Herkunft[] = ["g", "k", "i", "n"];

// [AGS (8 Stellen), Name im Gemeindeverzeichnis, Mietstufe, Herkunft]
export type GemeindeZeile = readonly [ags: string, name: string, stufe: Mietstufe, herkunft: Herkunft];

export interface QuellenNachweis {
  titel: string;
  url: string;
  abruf: string; // JJJJ-MM-TT
  sha256: string;
  gebietsstand?: string; // TT.MM.JJJJ, nur beim Gemeindeverzeichnis
}

export interface MietstufenMeta {
  rechtsgrundlage: string;
  anlage: QuellenNachweis;
  gemeindeverzeichnis_basis: QuellenNachweis; // Zuordnung Anlage -> Schlüssel
  gemeindeverzeichnis_aktuell: QuellenNachweis; // Namen und Kreise, die Nutzer heute eintippen
  hinweis: string; // Quellennachweis und Kennzeichnung als verändert (Destatis-Vermerk)
  anzahl: { anlage_zeilen: number; gemeinden: number; kreise: number; je_herkunft: Record<Herkunft, number> };
}

export interface MietstufenDaten {
  meta: MietstufenMeta;
  laender: Record<string, string>; // "01" -> "Schleswig-Holstein"
  kreise: Record<string, string>; // Kreisschlüssel (5 Stellen) -> Name
  gemeinden: readonly GemeindeZeile[]; // sortiert nach AGS
}

export interface MietstufenTreffer {
  gemeinde: string;
  kreis: string;
  land: string;
  mietstufe: Mietstufe;
  quelle: string;
}

export interface SuchEingabe {
  gemeinde: string;
  kreis?: string;
  land?: string;
}

export type SuchErgebnis =
  | { status: "eindeutig"; treffer: MietstufenTreffer }
  | { status: "mehrdeutig"; anzahl: number; kandidaten: MietstufenTreffer[] }
  | { status: "nicht_gefunden"; aehnlich: MietstufenTreffer[] };
