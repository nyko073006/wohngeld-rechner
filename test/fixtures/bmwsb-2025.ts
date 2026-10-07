import type { Mietstufe } from "../../src/rechtsstand";

// BMWSB, „Beispiele für die Berechnung des Wohngelds“, Stand 01.01.2025, 11 Fälle.
// https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/wohngeld-2025/rechenbeispiele-2025.pdf
// Alle Beträge monatlich. Nachgerechnet am 08.10.2026 mit Python decimal: alle 11 Ergebnisse exakt.
export interface BeispielFall {
  nr: number;
  ort: string;
  mietstufe: Mietstufe;
  haushaltsmitglieder: number;
  zuBeruecksichtigen: number;
  miete: number;
  y: string;
  m: string;
  wohngeld: number;
}

export const BMWSB_2025: BeispielFall[] = [
  { nr: 1, ort: "Jüterbog", mietstufe: 1, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, miete: 335, y: "1162.35", m: "445.40", wohngeld: 110 },
  { nr: 2, ort: "Ludwigshafen", mietstufe: 4, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, miete: 470, y: "1350.00", m: "580.40", wohngeld: 88 },
  { nr: 3, ort: "Leipzig, Stadt", mietstufe: 2, haushaltsmitglieder: 2, zuBeruecksichtigen: 2, miete: 480, y: "1589.70", m: "622.60", wohngeld: 166 },
  { nr: 4, ort: "Kreis Schleswig-Flensburg", mietstufe: 1, haushaltsmitglieder: 3, zuBeruecksichtigen: 3, miete: 750, y: "1638.00", m: "720.80", wohngeld: 320 },
  { nr: 5, ort: "Wiesbaden", mietstufe: 6, haushaltsmitglieder: 3, zuBeruecksichtigen: 3, miete: 700, y: "1728.00", m: "870.20", wohngeld: 372 },
  { nr: 6, ort: "München", mietstufe: 7, haushaltsmitglieder: 4, zuBeruecksichtigen: 4, miete: 1225, y: "2227.25", m: "1371.20", wohngeld: 691 },
  { nr: 7, ort: "Weimar", mietstufe: 3, haushaltsmitglieder: 4, zuBeruecksichtigen: 4, miete: 580, y: "1710.00", m: "777.80", wohngeld: 485 },
  { nr: 8, ort: "Friedrichshafen", mietstufe: 5, haushaltsmitglieder: 5, zuBeruecksichtigen: 5, miete: 870, y: "1853.25", m: "1095.40", wohngeld: 747 },
  { nr: 9, ort: "Attendorn", mietstufe: 2, haushaltsmitglieder: 6, zuBeruecksichtigen: 6, miete: 780, y: "3301.10", m: "1033.00", wohngeld: 343 },
  { nr: 10, ort: "Lübeck", mietstufe: 4, haushaltsmitglieder: 2, zuBeruecksichtigen: 1, miete: 570, y: "784.35", m: "356.30", wohngeld: 191 },
  { nr: 11, ort: "Neubrandenburg", mietstufe: 2, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, miete: 345, y: "561.35", m: "455.40", wohngeld: 342 },
];

// Länderhinweis zu WoGVwV Nr. 19.31, Stand 12/2024 (Herausgeber im PDF nicht lesbar, Belegstärke mittel).
// https://www.tacheles-sozialhilfe.de/files/Weisungen/WoGG/241202-hinweise-wogmehrals12hmer_geschwaerzt.pdf
// Veröffentlichte Zwischenwerte: z1 = 0,207069345; z2 = 970,7928566963; z3 = 1047,8071433038; z4 = 1204,9782147994.
// Nachgerechnet am 08.10.2026: Der Länderhinweis rechnet mit abgeschnittenen Zwischenwerten (z1 bis z4 nach der
// zehnten Stelle). z3 = M − z2 (abgeschnitten) trifft den veröffentlichten Wert exakt. Die veröffentlichten z2 und z4
// sind die kaufmännisch auf zehn Stellen gerundeten Rohwerte z1·Y und 1,15·z3; weitergerechnet wird mit den
// abgeschnittenen Werten (z2 = ...962, z4 = ...993). Das Endergebnis 1.205 € bzw. 1.335 € ist davon unabhängig.
export const LAENDERFALL_14 = {
  mietstufe: 3 as Mietstufe,
  haushaltsmitglieder: 14,
  zuBeruecksichtigen: 14,
  miete: 1600,
  y: "4688.25",
  m: "2018.60",
  z1: "0.2070693450",
  z2Veroeffentlicht: "970.7928566963",
  z3Veroeffentlicht: "1047.8071433038",
  z4Veroeffentlicht: "1204.9782147994",
  wohngeldFuer12: 1205,
  wohngeld: 1335,
};
