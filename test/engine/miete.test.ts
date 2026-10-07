import { describe, expect, it } from "vitest";
import { berechneMiete } from "../../src/engine/miete";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { rechtsstandFuer } from "../../src/rechtsstand";
import { BMWSB_2025, LAENDERFALL_14 } from "../fixtures/bmwsb-2025";

const rechtsstand = rechtsstandFuer("2025-06-01");

describe("berechneMiete: amtliche Beispiele", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt M = ${fall.m}`, () => {
      const e = berechneMiete({
        rechtsstand,
        mietstufe: fall.mietstufe,
        haushaltsmitglieder: fall.haushaltsmitglieder,
        zuBeruecksichtigen: fall.zuBeruecksichtigen,
        mieteMonatlich: fall.miete,
      });
      expect(e.m.toFixed(2)).toBe(fall.m);
    });
  }

  it("Länderfall mit 14 Mitgliedern ergibt M = 2018.60", () => {
    const e = berechneMiete({
      rechtsstand,
      mietstufe: LAENDERFALL_14.mietstufe,
      haushaltsmitglieder: LAENDERFALL_14.haushaltsmitglieder,
      zuBeruecksichtigen: LAENDERFALL_14.zuBeruecksichtigen,
      mieteMonatlich: LAENDERFALL_14.miete,
    });
    expect(e.m.toFixed(2)).toBe("2018.60");
  });
});

describe("berechneMiete: Einzelregeln", () => {
  it("kappt auf Höchstbetrag plus Klimakomponente (§ 11 Abs. 1, Beispiel 6)", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 7, haushaltsmitglieder: 4, zuBeruecksichtigen: 4, mieteMonatlich: 1225 });
    expect(e.grenze.toFixed(2)).toBe("1173.40");
    expect(e.mieteBeruecksichtigt.toFixed(2)).toBe("1173.40");
    expect(e.heizkosten.toFixed(2)).toBe("197.80");
  });

  it("Mischhaushalt rechnet anteilig (§ 11 Abs. 3, Beispiel 10)", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 4, haushaltsmitglieder: 2, zuBeruecksichtigen: 1, mieteMonatlich: 570 });
    expect(e.anteil.toString()).toBe("0.5");
    expect(e.grenze.toFixed(2)).toBe("321.90");
    expect(e.mieteBeruecksichtigt.toFixed(2)).toBe("285.00");
    expect(e.heizkosten.toFixed(2)).toBe("71.30");
  });

  it("Mischhaushalt mit Drittel-Anteil bleibt exakt", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 3, haushaltsmitglieder: 3, zuBeruecksichtigen: 1, mieteMonatlich: 333.33 });
    // Miete 333,33 / 3 = 111,11; Heizkosten 170,20 / 3 = 56,7333…
    expect(e.mieteBeruecksichtigt.toFixed(10)).toBe("111.1100000000");
    expect(e.m.toFixed(10)).toBe("167.8433333333");
  });

  it("schreibt einen Rechenweg mit Normen", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 1, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, mieteMonatlich: 335 });
    const normen = e.schritte.map((s) => s.norm);
    expect(normen).toContain("§ 12 Abs. 1 WoGG, Anlage 1");
    expect(normen).toContain("§ 12 Abs. 7 WoGG");
    expect(normen).toContain("§ 12 Abs. 6 WoGG");
    expect(normen).toContain("§ 11 Abs. 1 WoGG");
  });
});

describe("berechneMiete: unmögliche Eingaben", () => {
  const basis = { rechtsstand, mietstufe: 1 as const, haushaltsmitglieder: 2, zuBeruecksichtigen: 2, mieteMonatlich: 400 };

  it.each([
    ["zuBeruecksichtigen", { zuBeruecksichtigen: 0 }],
    ["zuBeruecksichtigen", { zuBeruecksichtigen: 3 }],
    ["haushaltsmitglieder", { haushaltsmitglieder: 1.5 }],
    ["mietstufe", { mietstufe: 8 as any }],
    ["mieteMonatlich", { mieteMonatlich: -1 }],
    ["mieteMonatlich", { mieteMonatlich: Number.NaN }],
  ])("wirft EingabeFehler für Feld %s", (feld, aenderung) => {
    try {
      berechneMiete({ ...basis, ...aenderung });
      expect.unreachable("kein Fehler geworfen");
    } catch (fehler) {
      expect(fehler).toBeInstanceOf(EingabeFehler);
      expect((fehler as EingabeFehler).feld).toBe(feld);
    }
  });
});

describe("berechneMiete: Rechenweg mit Anteil (§ 11 Abs. 3)", () => {
  it("Beispiel 10: Anteil als eigener erster Schritt, sechs Schritte mit Werten", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 4, haushaltsmitglieder: 2, zuBeruecksichtigen: 1, mieteMonatlich: 570 });
    expect(e.schritte[0]).toMatchObject({ norm: "§ 11 Abs. 3 WoGG", wert: "1/2" });
    expect(e.schritte.map((s) => s.wert)).toEqual(["1/2", "309.50", "12.40", "285.00", "71.30", "356.30"]);
  });
  it("Beispiel 1: ohne Mischhaushalt kein Anteil-Schritt, fünf Schritte", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 1, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, mieteMonatlich: 335 });
    expect(e.schritte).toHaveLength(5);
    expect(e.schritte.map((s) => s.norm)).not.toContain("§ 11 Abs. 3 WoGG");
  });
});
