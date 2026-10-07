import { describe, expect, it } from "vitest";
import { RechtsstandFehlt, WOGG_2025, rechtsstandFuer } from "../../src/rechtsstand";
import {
  heizkostenentlastung,
  hoechstbetrag,
  klimakomponente,
  koeffizienten,
  mindestwerte,
  zaehltAls,
} from "../../src/rechtsstand/zugriff";

const rs = rechtsstandFuer("2025-06-01");

describe("rechtsstandFuer", () => {
  it("liefert den Rechtsstand 2025 auf beiden Grenzen", () => {
    expect(rechtsstandFuer("2025-01-01").id).toBe("wogg-2025");
    expect(rechtsstandFuer("2026-12-31").id).toBe("wogg-2025");
  });

  it("wirft für Stichtage ab 2027", () => {
    expect(() => rechtsstandFuer("2027-01-01")).toThrow(RechtsstandFehlt);
  });

  it("wirft für Stichtage vor 2025", () => {
    expect(() => rechtsstandFuer("2024-12-31")).toThrow(RechtsstandFehlt);
  });

  it("wirft bei ungültigem Datum", () => {
    expect(() => rechtsstandFuer("01.01.2025")).toThrow(RechtsstandFehlt);
  });
});

describe("Tabellenzugriff 2025", () => {
  it("Höchstbeträge Anlage 1, bis 5 Mitglieder direkt", () => {
    expect(hoechstbetrag(rs, 1, 1)).toBe(361);
    expect(hoechstbetrag(rs, 4, 7)).toBe(1139);
    expect(hoechstbetrag(rs, 5, 3)).toBe(875);
  });

  it("Höchstbeträge ab 6 Mitgliedern mit Mehrbetrag", () => {
    expect(hoechstbetrag(rs, 6, 2)).toBe(876); // BMWSB-Beispiel 9
    expect(hoechstbetrag(rs, 12, 3)).toBe(1617); // Länderhinweis
  });

  it("über 12 Mitglieder zählen die Werte für 12", () => {
    expect(zaehltAls(14)).toBe(12);
    expect(hoechstbetrag(rs, 14, 3)).toBe(1617);
    expect(klimakomponente(rs, 14)).toBeCloseTo(72.8, 10);
    expect(heizkostenentlastung(rs, 14)).toBeCloseTo(418.6, 10);
  });

  it("Klimakomponente und Heizkosten § 12 Abs. 6, 7", () => {
    expect(klimakomponente(rs, 1)).toBe(19.2);
    expect(klimakomponente(rs, 5)).toBe(39.2);
    expect(heizkostenentlastung(rs, 3)).toBe(170.2);
    expect(heizkostenentlastung(rs, 6)).toBeCloseTo(253, 10); // BMWSB-Beispiel 9
  });

  it("Koeffizienten Anlage 2 als Dezimal-Strings", () => {
    expect(koeffizienten(rs, 1)).toEqual({ a: "0.04", b: "0.0004797", c: "0.0000408" });
    expect(koeffizienten(rs, 12)).toEqual({ a: "-0.12", b: "0.0001107", c: "0.0000221" });
    expect(koeffizienten(rs, 14)).toEqual(koeffizienten(rs, 12));
  });

  it("Mindestwerte Anlage 3", () => {
    expect(mindestwerte(rs, 1)).toEqual({ m: 54, y: 396 });
    expect(mindestwerte(rs, 12)).toEqual({ m: 298, y: 2943 });
  });

  it("wirft bei Haushaltsgröße unter 1", () => {
    expect(() => hoechstbetrag(rs, 0, 1)).toThrow();
  });
});

describe("Rechtsstand 2025: Einkommenswerte vorhanden (§§ 14 bis 18, 21 WoGG)", () => {
  it("jeder Einkommenswert ist eine Zahl oder ein Dezimal-String", () => {
    const { unterhaltHoechst, ...rest } = WOGG_2025.einkommen;
    expect(Object.keys(rest)).toHaveLength(17);
    for (const wert of [...Object.values(rest), ...Object.values(unterhaltHoechst)])
      expect(typeof wert === "number" || /^\d+(\.\d+)?$/.test(String(wert))).toBe(true);
    expect(Object.keys(unterhaltHoechst).sort()).toEqual(["auswaerts_ausbildung", "ehegatte", "kind_wechselmodell", "sonstige"]);
  });
});

describe("Rechtsstand ist tief eingefroren", () => {
  it("verschachtelte Werte lassen sich zur Laufzeit nicht ändern", () => {
    expect(Object.isFrozen(WOGG_2025)).toBe(true);
    expect(Object.isFrozen(WOGG_2025.hoechstbetraege.bis5[1])).toBe(true);
    expect(Object.isFrozen(WOGG_2025.einkommen.unterhaltHoechst)).toBe(true);
    expect(() => {
      (WOGG_2025.koeffizienten[1] as { a: string }).a = "9";
    }).toThrow(TypeError);
    expect(WOGG_2025.koeffizienten[1]?.a).toBe("0.04");
  });
});
