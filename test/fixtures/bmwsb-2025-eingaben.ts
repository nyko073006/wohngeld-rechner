import type { HaushaltEingabe, MitgliedEingabe } from "../../src/engine/eingabe";

// Vollständige Eingaben zu den 11 BMWSB-Beispielen (Stand 01.01.2025), Quelle wie test/fixtures/bmwsb-2025.ts.
// Monatsbeträge laut Dokument; Kinder ohne Einkommen und arbeitslose Partner ohne ALG I haben keine Einnahmen.
const STICHTAG = "2025-07-01";
const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
const ohneEinnahmen = (): MitgliedEingabe => ({ einnahmen: [], ...ohne });

export const EINGABEN_BMWSB_2025: Record<number, HaushaltEingabe> = {
  1: {
    stichtag: STICHTAG, mietstufe: 1, art: "mietzuschuss", mieteMonatlich: 335,
    mitglieder: [{ einnahmen: [{ art: "rente", betragMonatlich: 1300 }], ...ohne, zahltKvPv: true }],
  },
  2: {
    stichtag: STICHTAG, mietstufe: 4, art: "mietzuschuss", mieteMonatlich: 470,
    mitglieder: [{ einnahmen: [{ art: "lohnersatz", betragMonatlich: 1350 }], ...ohne }],
  },
  3: {
    stichtag: STICHTAG, mietstufe: 2, art: "mietzuschuss", mieteMonatlich: 480,
    mitglieder: [
      { einnahmen: [{ art: "rente", betragMonatlich: 1410 }], ...ohne, zahltKvPv: true, schwerbehindert: true },
      { einnahmen: [{ art: "rente", betragMonatlich: 540 }], ...ohne, zahltKvPv: true },
    ],
  },
  4: {
    stichtag: STICHTAG, mietstufe: 1, art: "lastenzuschuss", mieteMonatlich: 750,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2150 }], ...ohne, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  5: {
    stichtag: STICHTAG, mietstufe: 6, art: "mietzuschuss", mieteMonatlich: 700, alleinerziehend: true,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 1530 }], ...ohne, zahltKvPv: true, zahltRv: true },
      { einnahmen: [{ art: "unterhaltsvorschuss", betragMonatlich: 696 }], ...ohne },
      ohneEinnahmen(),
    ],
  },
  6: {
    stichtag: STICHTAG, mietstufe: 7, art: "mietzuschuss", mieteMonatlich: 1225,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2490 }], zahltSteuern: true, zahltKvPv: true, zahltRv: true },
      { einnahmen: [{ art: "minijob_pauschal", betragMonatlich: 556 }], ...ohne },
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  7: {
    stichtag: STICHTAG, mietstufe: 3, art: "mietzuschuss", mieteMonatlich: 580,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2240 }], ...ohne, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  8: {
    stichtag: STICHTAG, mietstufe: 5, art: "mietzuschuss", mieteMonatlich: 870,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2750 }], zahltSteuern: true, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      { einnahmen: [{ art: "minijob_pauschal", betragMonatlich: 60 }], ...ohne, kindUnter25: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  9: {
    stichtag: STICHTAG, mietstufe: 2, art: "mietzuschuss", mieteMonatlich: 780,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 4000 }], zahltSteuern: true, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
      ohneEinnahmen(),
      ohneEinnahmen(),
      { einnahmen: [{ art: "rente", betragMonatlich: 645 }], ...ohne, zahltKvPv: true },
    ],
  },
  10: {
    stichtag: STICHTAG, mietstufe: 4, art: "mietzuschuss", mieteMonatlich: 570,
    mitglieder: [
      { einnahmen: [{ art: "rente", betragMonatlich: 880 }], ...ohne, zahltKvPv: true },
      { einnahmen: [], ...ohne, ausschluss: "grundsicherungsgeld_sgb2" },
    ],
  },
  11: {
    stichtag: STICHTAG, mietstufe: 2, art: "lastenzuschuss", mieteMonatlich: 345,
    mitglieder: [{ einnahmen: [{ art: "rente", betragMonatlich: 945 }], ...ohne, zahltKvPv: true, grundrentenzeiten33: true }],
  },
};
