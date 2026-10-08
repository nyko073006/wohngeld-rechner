import type { Mietstufe, UnterhaltArt } from "../rechtsstand";

// § 14 WoGG. Regel je Art: siehe src/engine/einkommen/jahreseinkommen.ts und den E2-Plan, Abschnitt „Einnahmearten“.
export const EINNAHME_ARTEN = [
  // Aktivrente: steuerfreien Teil als sonstige_voll Nr. 12 eintragen, nur den steuerpflichtigen Rest hier.
  "nichtselbstaendig",
  "minijob_pauschal",
  "rente",
  "versorgungsbezug",
  "selbstaendig",
  "vermietung",
  "kapital",
  "lohnersatz",
  "elterngeld",
  "zuschlaege_3b",
  "unterhalt",
  "zuwendung_dritter",
  "unterhaltsvorschuss",
  "ausbildungsfoerderung",
  "sonstige_voll",
  "sonstige_haelfte",
] as const;
export type EinnahmeArt = (typeof EINNAHME_ARTEN)[number];

// Nummern aus § 14 Abs. 2 WoGG ohne eigene Art. Nr. 13 und 23 sind weggefallen.
// Nr. 12 (Aktivrente, § 3 Nr. 21 EStG) gilt seit 01.01.2026.
export const NUMMERN_VOLL: readonly number[] = [2, 4, 5, 7, 9, 12, 14, 16, 17, 18, 20, 22, 28, 30, 31];
export const NUMMERN_HAELFTE: readonly number[] = [8, 10, 24, 25, 26, 29];

// § 7 Abs. 1 Satz 1 Nr. 1, 2, 4 bis 9 und Abs. 2 WoGG.
export const AUSSCHLUSS_LEISTUNGEN = [
  "grundsicherungsgeld_sgb2",
  "ausbildung_sgb2_zuschuss",
  "verletztengeld",
  "grundsicherung_alter_em",
  "hilfe_zum_lebensunterhalt",
  "sgb14_lebensunterhalt",
  "asylblg",
  "sgb8_kdu",
  "in_bedarf_beruecksichtigt",
] as const;
export type AusschlussLeistung = (typeof AUSSCHLUSS_LEISTUNGEN)[number];

export interface Einnahme {
  art: EinnahmeArt;
  betragMonatlich: number; // brutto; bei selbstaendig und vermietung Gewinn bzw. Überschuss, darf negativ sein
  werbungskostenMonatlich?: number; // nur nichtselbstaendig und minijob_pauschal
  sonderzahlungJaehrlich?: number; // nur nichtselbstaendig, § 15 Abs. 3 WoGG
  elterngeldPlus?: boolean; // nur elterngeld, § 10 Abs. 3 BEEG
  nummer?: number; // nur sonstige_voll und sonstige_haelfte: Nummer in § 14 Abs. 2 WoGG
}

export interface MitgliedEingabe {
  einnahmen: Einnahme[];
  zahltSteuern: boolean; // § 16 Satz 1 Nr. 1
  zahltKvPv: boolean; // § 16 Satz 1 Nr. 2, auch vergleichbare private Beiträge (Satz 2)
  zahltRv: boolean; // § 16 Satz 1 Nr. 3, auch vergleichbare private Beiträge (Satz 2)
  schwerbehindert?: boolean; // § 17 Nr. 1
  nsVerfolgt?: boolean; // § 17 Nr. 2
  kindUnter25?: boolean; // § 17 Nr. 4: Kind eines Haushaltsmitglieds, noch nicht 25
  grundrentenzeiten33?: boolean; // § 17a
  ausschluss?: AusschlussLeistung; // § 7
}

export interface UnterhaltZahlung {
  art: UnterhaltArt;
  betragMonatlich: number;
  tituliert?: boolean; // § 18 Satz 2: Titel, notarielle Vereinbarung oder Bescheid
}

export interface HaushaltEingabe {
  stichtag: string; // ISO-Datum
  mietstufe: Mietstufe;
  art: "mietzuschuss" | "lastenzuschuss";
  mieteMonatlich: number; // Bruttokaltmiete bzw. Belastung
  mitglieder: MitgliedEingabe[];
  alleinerziehend?: boolean; // § 17 Nr. 3, einmal je Haushalt
  unterhaltGezahlt?: UnterhaltZahlung[]; // § 18
  vermoegen?: number; // § 21 Nr. 3, Summe der zu berücksichtigenden Mitglieder
}
