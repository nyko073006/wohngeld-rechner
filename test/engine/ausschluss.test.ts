import { describe, expect, it } from "vitest";
import { pruefeAusschluss } from "../../src/engine/ausschluss";
import type { MitgliedEingabe } from "../../src/engine/eingabe";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { WOGG_2025 } from "../../src/rechtsstand";

const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
const frei = (): MitgliedEingabe => ({ einnahmen: [], ...ohne });
const mit = (ausschluss: MitgliedEingabe["ausschluss"]): MitgliedEingabe => ({ einnahmen: [], ...ohne, ausschluss });
function fehlerFeld(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof EingabeFehler) return e.feld;
    throw e;
  }
  throw new Error("kein Fehler geworfen");
}

describe("pruefeAusschluss: § 7 WoGG", () => {
  it("§ 7 Abs. 1 Satz 1 Nr. 1 WoGG: Bezieher von Grundsicherungsgeld zählt nicht mit (Beispiel 10)", () => {
    const r = pruefeAusschluss(WOGG_2025, [frei(), mit("grundsicherungsgeld_sgb2")]);
    expect(r.zuBeruecksichtigen).toEqual([0]);
    expect(r.ausgeschlossen).toEqual([{ index: 1, leistung: "grundsicherungsgeld_sgb2", norm: "§ 7 Abs. 1 Satz 1 Nr. 1 WoGG" }]);
    expect(r.grund).toBeUndefined();
    expect(r.schritte[0]).toMatchObject({ norm: "§§ 5 bis 7 WoGG", wert: "1 von 2" });
    expect(r.hinweise.join(" ")).toContain("Darlehen");
    expect(r.hinweise.join(" ")).toContain("Kosten der Unterkunft");
  });
  it("§ 7 Abs. 2 WoGG: in der Bedarfsgemeinschaft berücksichtigtes Mitglied", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei(), mit("in_bedarf_beruecksichtigt")]).ausgeschlossen[0]?.norm).toBe("§ 7 Abs. 2 WoGG");
  });
  it("§ 21 Nr. 2 WoGG: alle ausgeschlossen ergibt Grund statt Rechnung", () => {
    const r = pruefeAusschluss(WOGG_2025, [mit("grundsicherung_alter_em"), mit("grundsicherungsgeld_sgb2")]);
    expect(r.zuBeruecksichtigen).toEqual([]);
    expect(r.grund).toMatchObject({ code: "alle_ausgeschlossen", norm: "§ 21 Nr. 2 WoGG" });
  });
  it("ohne Ausschluss kein Darlehens-Hinweis", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei()]).hinweise.join(" ")).not.toContain("Darlehen");
  });
});

describe("pruefeAusschluss: SGB VIII nur im reinen SGB-VIII-Haushalt", () => {
  it("§ 7 Abs. 1 Satz 1 Nr. 9 WoGG: SGB VIII schließt nicht aus, wenn nicht alle Mitglieder es beziehen", () => {
    const r = pruefeAusschluss(WOGG_2025, [frei(), frei(), mit("sgb8_kdu")]);
    expect(r.zuBeruecksichtigen).toEqual([0, 1, 2]);
    expect(r.ausgeschlossen).toEqual([]);
    expect(r.grund).toBeUndefined();
    expect(r.hinweise.join(" ")).toContain("§ 7 Abs. 1 Satz 1 Nr. 9");
    expect(r.hinweise).toContain(
      "Leistungen nach SGB VIII schließen nur aus, wenn alle Haushaltsmitglieder sie beziehen (§ 7 Abs. 1 Satz 1 Nr. 9 WoGG). Die halbe Pauschale zählt dann als Einkommen: als sonstige_haelfte mit Nummer 24 (Kind) bzw. 25 (Pflegeperson) eintragen.",
    );
  });
  it("§ 7 Abs. 1 Satz 1 Nr. 9 WoGG: beziehen alle Mitglieder SGB VIII, sind alle ausgeschlossen", () => {
    const r = pruefeAusschluss(WOGG_2025, [mit("sgb8_kdu"), mit("sgb8_kdu")]);
    expect(r.zuBeruecksichtigen).toEqual([]);
    expect(r.grund?.code).toBe("alle_ausgeschlossen");
  });
});

describe("pruefeAusschluss: Vermögen § 21 Nr. 3 WoGG, WoGVwV 21.37", () => {
  it("genau an der Grenze kein Ausschluss, darüber Ausschluss (1 Mitglied, 60.000 €)", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei()], 60000).grund).toBeUndefined();
    expect(pruefeAusschluss(WOGG_2025, [frei()], 60000.01).grund).toMatchObject({ code: "vermoegen", norm: "§ 21 Nr. 3 WoGG" });
  });
  it("30.000 € je weiterem zu berücksichtigendem Mitglied, Ausgeschlossene zählen nicht", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei(), frei()], 90000).grund).toBeUndefined();
    const r = pruefeAusschluss(WOGG_2025, [frei(), frei(), mit("grundsicherungsgeld_sgb2")], 90000.01);
    expect(r.vermoegensgrenze?.toFixed(2)).toBe("90000.00");
    expect(r.grund?.code).toBe("vermoegen");
  });
  it("ohne Angabe: Annahme kein erhebliches Vermögen", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei()]).annahmen.join(" ")).toContain("§ 21 Nr. 3");
  });
  it("mit Angabe: Rechenschritt und Hinweis auf den Einzelfall", () => {
    const r = pruefeAusschluss(WOGG_2025, [frei()], 1000);
    expect(r.schritte.map((s) => s.norm)).toContain("§ 21 Nr. 3 WoGG, Nr. 21.37 WoGVwV");
    expect(r.hinweise.join(" ")).toContain("Einzelfall");
  });
});

describe("pruefeAusschluss: unmögliche Eingaben", () => {
  it("leerer Haushalt", () => {
    expect(fehlerFeld(() => pruefeAusschluss(WOGG_2025, []))).toBe("mitglieder");
  });
  it("unbekannte Leistung", () => {
    expect(fehlerFeld(() => pruefeAusschluss(WOGG_2025, [mit("buergergeld" as never)]))).toBe("mitglieder[0].ausschluss");
  });
  it("Listenelement kein Objekt", () => {
    expect(fehlerFeld(() => pruefeAusschluss(WOGG_2025, [frei(), null as never]))).toBe("mitglieder[1]");
  });
  it("negatives Vermögen", () => {
    expect(fehlerFeld(() => pruefeAusschluss(WOGG_2025, [frei()], -1))).toBe("vermoegen");
  });
});
