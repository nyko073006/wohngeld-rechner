import { describe, expect, it } from "vitest";
import { berechneWohngeld, HINWEIS_UNVERBINDLICH } from "../../src/engine/berechnen";
import type { HaushaltEingabe, MitgliedEingabe } from "../../src/engine/eingabe";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { RechtsstandFehlt } from "../../src/rechtsstand";
import { BMWSB_2025 } from "../fixtures/bmwsb-2025";
import { EINGABEN_BMWSB_2025 } from "../fixtures/bmwsb-2025-eingaben";

const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
const leer = (): MitgliedEingabe => ({ einnahmen: [], ...ohne });
// noUncheckedIndexedAccess: Record<number, …> liefert `| undefined`, die Fixture enthält alle 11 Nummern.
const eingabe = (nr: number): HaushaltEingabe => {
  const h = EINGABEN_BMWSB_2025[nr];
  if (!h) throw new Error(`Fixture ${nr} fehlt`);
  return h;
};
const beispiel = (nr: number, aenderung: Partial<HaushaltEingabe> = {}): HaushaltEingabe => ({ ...eingabe(nr), ...aenderung });
const rentnerin = (betrag: number): MitgliedEingabe => ({ einnahmen: [{ art: "rente", betragMonatlich: betrag }], ...ohne, zahltKvPv: true });

describe("berechneWohngeld: amtliche Beispiele von der vollständigen Eingabe bis zum Betrag", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt ${fall.wohngeld} €`, () => {
      const r = berechneWohngeld(eingabe(fall.nr));
      expect(r.wohngeldMonatlich).toBe(fall.wohngeld);
      expect(r.y).toBe(fall.y);
      expect(r.m).toBe(fall.m);
      expect(r.rechtsstand).toBe("wogg-2025");
      expect(r.hinweise).toContain(HINWEIS_UNVERBINDLICH);
      expect(r.ausschlussgrund).toBeUndefined();
    });
  }
});

describe("berechneWohngeld: Rechenweg", () => {
  it("Beispiel 1: 18 Schritte, Y, M und Betrag an fester Stelle", () => {
    const r = berechneWohngeld(eingabe(1));
    expect(r.rechenweg).toHaveLength(18);
    expect(r.rechenweg[0]).toMatchObject({ schritt: "Rechtsstand", wert: "wogg-2025" });
    expect(r.rechenweg[1]).toMatchObject({ norm: "§§ 5 bis 7 WoGG", wert: "1 von 1" });
    expect(r.rechenweg[5]).toMatchObject({ norm: "§ 13 Abs. 2 WoGG", wert: "1162.35" });
    expect(r.rechenweg[10]).toMatchObject({ schritt: "M", wert: "445.40" });
    expect(r.rechenweg[17]).toMatchObject({ norm: "§ 19 Abs. 1 WoGG", wert: "110" });
  });
  it("Beispiel 10: Mischhaushalt mit Anteil-Schritt und 19 Schritten", () => {
    const r = berechneWohngeld(eingabe(10));
    expect(r.rechenweg).toHaveLength(19);
    expect(r.rechenweg[1]?.wert).toBe("1 von 2");
    expect(r.rechenweg.find((s) => s.norm === "§ 11 Abs. 3 WoGG")?.wert).toBe("1/2");
  });
});

describe("berechneWohngeld: Review Focus", () => {
  it("Stichtag 2026 rechnet mit demselben Rechtsstand und Ergebnis", () => {
    expect(berechneWohngeld(beispiel(1, { stichtag: "2026-12-31" })).wohngeldMonatlich).toBe(110);
  });
  it("Einnahmen eines ausgeschlossenen Mitglieds zählen nicht (Beispiel 10)", () => {
    const h = beispiel(10);
    const sohn: MitgliedEingabe = { ...h.mitglieder[1]!, einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 3000 }] };
    const r = berechneWohngeld({ ...h, mitglieder: [h.mitglieder[0]!, sohn] });
    expect(r.wohngeldMonatlich).toBe(191);
    expect(r.y).toBe("784.35");
  });
  it("Freibeträge über dem Einkommen: Y = 0, Formel rechnet mit dem Mindestwert", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [{ ...rentnerin(80), grundrentenzeiten33: true }] }));
    expect(r.y).toBe("0.00");
    expect(r.wohngeldMonatlich).toBeGreaterThan(0);
  });
});

describe("berechneWohngeld: über 12 Mitglieder", () => {
  const haushalt = (anzahl: number): MitgliedEingabe[] => [
    { einnahmen: [{ art: "lohnersatz", betragMonatlich: 4688.25 }], ...ohne },
    ...Array.from({ length: anzahl - 1 }, leer),
  ];
  it("Länderfall: 14 Mitglieder, Stufe III, Miete 1.600 € ergibt 1.335 €", () => {
    const r = berechneWohngeld({ stichtag: "2025-07-01", mietstufe: 3, art: "mietzuschuss", mieteMonatlich: 1600, mitglieder: haushalt(14) });
    expect(r.y).toBe("4688.25");
    expect(r.m).toBe("2018.60");
    expect(r.wohngeldMonatlich).toBe(1335);
  });
  it("Mischhaushalt mit 15 Mitgliedern, eines ausgeschlossen: 1.261 € (Werte für 12, Anteil 14/15; nachgerechnet mit Python decimal)", () => {
    const mitglieder = haushalt(15);
    mitglieder[14] = { ...leer(), ausschluss: "grundsicherungsgeld_sgb2" };
    const r = berechneWohngeld({ stichtag: "2025-07-01", mietstufe: 3, art: "mietzuschuss", mieteMonatlich: 1600, mitglieder });
    expect(r.m).toBe("1884.03");
    expect(r.wohngeldMonatlich).toBe(1261);
  });
});

describe("berechneWohngeld: 0 € mit Grund", () => {
  it("§ 21 Nr. 2: alle ausgeschlossen, keine Rechnung", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [{ ...leer(), ausschluss: "grundsicherungsgeld_sgb2" }] }));
    expect(r.wohngeldMonatlich).toBe(0);
    expect(r.ausschlussgrund?.code).toBe("alle_ausgeschlossen");
    expect(r.y).toBeNull();
    expect(r.m).toBeNull();
    expect(r.hinweise).toContain(HINWEIS_UNVERBINDLICH);
  });
  it("§ 21 Nr. 3: Vermögen über der Regelgrenze", () => {
    expect(berechneWohngeld(beispiel(1, { vermoegen: 60000.01 })).ausschlussgrund?.code).toBe("vermoegen");
    expect(berechneWohngeld(beispiel(1, { vermoegen: 60000 })).wohngeldMonatlich).toBe(110);
  });
  it("§ 19 Abs. 1: Einkommen zu hoch", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [rentnerin(3000)] }));
    expect(r.wohngeldMonatlich).toBe(0);
    expect(r.ausschlussgrund?.code).toBe("rechnerisch_kein_wohngeld");
  });
  it("§ 21 Nr. 1: 6 € liegen unter der Bagatellgrenze", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [rentnerin(1580)] }));
    expect(r.wohngeldMonatlich).toBe(0);
    expect(r.ausschlussgrund?.code).toBe("bagatellgrenze");
  });
});

describe("berechneWohngeld: Annahmen und Fehler", () => {
  it("gleiche Annahmen erscheinen nur einmal", () => {
    const r = berechneWohngeld(
      beispiel(3, {
        mitglieder: [
          { ...rentnerin(1410), grundrentenzeiten33: true },
          { ...rentnerin(540), grundrentenzeiten33: true },
        ],
      }),
    );
    expect(r.annahmen.filter((a) => a.includes("Grundrentenfreibetrag"))).toHaveLength(1);
  });
  it("Stichtag ab 2027 ergibt RechtsstandFehlt", () => {
    expect(() => berechneWohngeld(beispiel(1, { stichtag: "2027-01-01" }))).toThrow(RechtsstandFehlt);
  });
  it("leerer Haushalt ergibt EingabeFehler", () => {
    expect(() => berechneWohngeld(beispiel(1, { mitglieder: [] }))).toThrow(EingabeFehler);
  });
  it("unbekannte Art ergibt EingabeFehler", () => {
    expect(() => berechneWohngeld(beispiel(1, { art: "wohnbeihilfe" as never }))).toThrow(EingabeFehler);
  });
});
