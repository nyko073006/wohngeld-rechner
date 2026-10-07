import { describe, expect, it } from "vitest";
import { aufVolleEuro, D } from "../../src/engine/dezimal";
import { berechneFormel } from "../../src/engine/formel";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { rechtsstandFuer } from "../../src/rechtsstand";
import { BMWSB_2025, LAENDERFALL_14 } from "../fixtures/bmwsb-2025";

const rechtsstand = rechtsstandFuer("2025-06-01");

describe("berechneFormel: amtliche Beispiele", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt ${fall.wohngeld} €`, () => {
      const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: fall.zuBeruecksichtigen, m: fall.m, y: fall.y });
      expect(e.wohngeld).toBe(fall.wohngeld);
    });
  }

  it("Länderfall: 12er-Rechnung, dann 2 × 65 € Zuschlag", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: LAENDERFALL_14.m, y: LAENDERFALL_14.y });
    expect(e.z1.toFixed(10)).toBe(LAENDERFALL_14.z1);
    expect(e.z2.toFixed(10)).toBe(LAENDERFALL_14.z2);
    expect(e.grundbetrag).toBe(LAENDERFALL_14.wohngeldFuer12);
    expect(e.zuschlag).toBe(130);
    expect(e.wohngeld).toBe(LAENDERFALL_14.wohngeld);
  });

  it("Zwischenwerte Beispiel 1 auf zehn Stellen", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1162.35" });
    expect(e.z1.toFixed(10)).toBe("0.3010822600");
    expect(e.z2.toFixed(10)).toBe("349.9629649110");
    expect(e.z3.toFixed(10)).toBe("95.4370350890");
    expect(e.z4.toFixed(10)).toBe("109.7525903524");
  });
});

describe("berechneFormel: Mindestwerte (Anlage 3 Nr. 1)", () => {
  it("Y unter dem Mindestwert wird durch ihn ersetzt", () => {
    const klein = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "100" });
    const mindest = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "396" });
    expect(klein.yEingesetzt.toString()).toBe("396");
    expect(klein.wohngeld).toBe(mindest.wohngeld);
    expect(klein.wohngeld).toBe(389);
  });

  it("M unter dem Mindestwert wird durch ihn ersetzt", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "40", y: "396" });
    expect(e.mEingesetzt.toString()).toBe("54");
    expect(e.wohngeld).toBe(25);
  });
});

describe("berechneFormel: Bagatellgrenze (§ 21 Nr. 1)", () => {
  it("genau 10 € werden gezahlt (z4 = 9,5284… gerundet 10)", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1405.50" });
    expect(e.grundbetrag).toBe(10);
    expect(e.wohngeld).toBe(10);
    expect(e.unterBagatellgrenze).toBe(false);
  });

  it("9 € werden nicht gezahlt", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1405.75" });
    expect(e.grundbetrag).toBe(9);
    expect(e.wohngeld).toBe(0);
    expect(e.unterBagatellgrenze).toBe(true);
  });

  it("negatives z4 ergibt 0 €", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "2500" });
    expect(e.z4.toFixed(10)).toBe("-510.3078425000");
    expect(e.grundbetrag).toBe(0);
    expect(e.wohngeld).toBe(0);
  });
});

describe("berechneFormel: über 12 Mitglieder (§ 19 Abs. 3)", () => {
  it("keine Zuschläge, wenn die 12er-Rechnung nichts ergibt", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "2018.60", y: "20000" });
    expect(e.grundbetrag).toBe(0);
    expect(e.zuschlag).toBe(0);
    expect(e.wohngeld).toBe(0);
  });

  it("Zuschläge höchstens bis zur Höhe von M", () => {
    // 12er-Rechnung mit M = 298 und Y = 5000: z4 = 207,6405500000, Grundbetrag 208 €.
    // 2 Zuschläge à 65 € ergäben 338 € > M, also nur 90 € Zuschlag.
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "298", y: "5000" });
    expect(e.grundbetrag).toBe(208);
    expect(e.zuschlag).toBe(90);
    expect(e.wohngeld).toBe(298);
  });

  it("Grundbetrag über M bleibt, aber ohne Zuschlag (Recht 2025 kennt keine Kappung auf M)", () => {
    // Negatives a für 12 Mitglieder: z4 = 417,0600893950 > M = 298.
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "298", y: "2943" });
    expect(e.grundbetrag).toBe(417);
    expect(e.zuschlag).toBe(0);
    expect(e.wohngeld).toBe(417);
  });
});

describe("Rundung auf volle Euro (Anlage 3 Nr. 3)", () => {
  it("unter 0,50 ab, ab 0,50 auf", () => {
    expect(aufVolleEuro(new D("109.4999999999"))).toBe(109);
    expect(aufVolleEuro(new D("109.5"))).toBe(110);
  });
});

describe("berechneFormel: unmögliche Eingaben", () => {
  it.each([
    ["y", { y: "-1" }],
    ["m", { m: "-1" }],
    ["y", { y: "abc" }],
    ["zuBeruecksichtigen", { zuBeruecksichtigen: 0 }],
  ])("wirft EingabeFehler für Feld %s", (feld, aenderung) => {
    try {
      berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1162.35", ...aenderung });
      expect.unreachable("kein Fehler geworfen");
    } catch (fehler) {
      expect(fehler).toBeInstanceOf(EingabeFehler);
      expect((fehler as EingabeFehler).feld).toBe(feld);
    }
  });
});
