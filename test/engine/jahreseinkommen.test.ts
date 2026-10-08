import { describe, expect, it } from "vitest";
import type { Einnahme, MitgliedEingabe } from "../../src/engine/eingabe";
import { berechneJahreseinkommen } from "../../src/engine/einkommen/jahreseinkommen";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { WOGG_2025 } from "../../src/rechtsstand";

const ohneAbzug = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
function rechne(einnahmen: Einnahme[], extra: Partial<MitgliedEingabe> = {}) {
  return berechneJahreseinkommen(WOGG_2025, { einnahmen, ...ohneAbzug, ...extra }, 0);
}
const jahr = (einnahmen: Einnahme[], extra?: Partial<MitgliedEingabe>) => rechne(einnahmen, extra).jahreseinkommen.toFixed(2);
function fehlerFeld(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof EingabeFehler) return e.feld;
    throw e;
  }
  throw new Error("kein Fehler geworfen");
}

describe("Jahreseinkommen: Einkünfte nach § 14 Abs. 1 WoGG", () => {
  it("§ 9a Nr. 1a EStG: Arbeitslohn minus Pauschbetrag 1.230 €", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000 }])).toBe("22770.00");
  });
  it("§ 9a EStG: höhere Werbungskosten statt Pauschbetrag", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000, werbungskostenMonatlich: 150 }])).toBe("22200.00");
  });
  it("§ 9a Satz 2 EStG: Pauschbetrag höchstens bis zur Höhe der Einnahmen", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 50 }])).toBe("0.00");
  });
  it("§ 15 Abs. 3 WoGG: Sonderzahlung kommt zum Jahresbetrag", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000, sonderzahlungJaehrlich: 1200 }])).toBe("23970.00");
  });
  it("§ 14 Abs. 1 Satz 3 Nr. 2 WoGG: Minijob minus tatsächliche Aufwendungen, ohne Pauschbetrag", () => {
    expect(jahr([{ art: "minijob_pauschal", betragMonatlich: 520, werbungskostenMonatlich: 20 }])).toBe("6000.00");
    expect(jahr([{ art: "minijob_pauschal", betragMonatlich: 100, werbungskostenMonatlich: 150 }])).toBe("0.00");
  });
  it("§ 14 Abs. 2 Nr. 3 WoGG, § 9a Nr. 3 EStG: Rente voll minus 102 €", () => {
    expect(jahr([{ art: "rente", betragMonatlich: 1000 }])).toBe("11898.00");
  });
  it("§ 14 Abs. 2 Nr. 1 WoGG, § 9a Nr. 1b EStG: Versorgungsbezug mit eigenem Pauschbetrag neben der Rente", () => {
    expect(
      jahr([
        { art: "versorgungsbezug", betragMonatlich: 1000 },
        { art: "rente", betragMonatlich: 1000 },
      ]),
    ).toBe("23796.00");
  });
  it("§ 14 Abs. 1 Satz 4 WoGG: negative Einkünfte zählen 0 und werden nicht verrechnet", () => {
    const r = rechne([
      { art: "selbstaendig", betragMonatlich: -500 },
      { art: "nichtselbstaendig", betragMonatlich: 2000 },
    ]);
    expect(r.jahreseinkommen.toFixed(2)).toBe("22770.00");
    expect(r.hinweise.join(" ")).toContain("§ 14 Abs. 1 Satz 4");
  });
  it("§ 14 Abs. 1 WoGG: Vermietung mit Überschuss", () => {
    expect(jahr([{ art: "vermietung", betragMonatlich: 300 }])).toBe("3600.00");
  });
  it("§ 14 Abs. 2 Nr. 15 WoGG, WoGVwV 17.03.5: Kapitalerträge über 100 € im Jahr zählen", () => {
    expect(jahr([{ art: "kapital", betragMonatlich: 8 }])).toBe("0.00"); // 96 € im Jahr
    expect(jahr([{ art: "kapital", betragMonatlich: 9 }])).toBe("8.00"); // 108 € im Jahr
    expect(jahr([{ art: "kapital", betragMonatlich: 50 }])).toBe("500.00"); // 600 €
    expect(jahr([{ art: "kapital", betragMonatlich: 87.5 }])).toBe("950.00"); // 1.050 € − 100 €
    expect(jahr([{ art: "kapital", betragMonatlich: 1000 }])).toBe("11900.00");
    expect(rechne([{ art: "kapital", betragMonatlich: 50 }]).annahmen.join(" ")).toContain("WoGVwV Nr. 17.03.5");
  });
});

describe("Jahreseinkommen: Einnahmen nach § 14 Abs. 2 WoGG", () => {
  it("§ 14 Abs. 2 Nr. 6 WoGG: Arbeitslosengeld I voll, ohne Pauschbetrag (Beispiel 2)", () => {
    expect(jahr([{ art: "lohnersatz", betragMonatlich: 1350 }])).toBe("16200.00");
  });
  it("§ 14 Abs. 2 Nr. 6 WoGG mit § 10 BEEG: Elterngeld über 300 € (Plus: 150 €)", () => {
    expect(jahr([{ art: "elterngeld", betragMonatlich: 800 }])).toBe("6000.00");
    expect(jahr([{ art: "elterngeld", betragMonatlich: 400, elterngeldPlus: true }])).toBe("3000.00");
    expect(jahr([{ art: "elterngeld", betragMonatlich: 200 }])).toBe("0.00");
  });
  it("§ 14 Abs. 2 Nr. 11 WoGG: Zuschläge nach § 3b EStG voll", () => {
    expect(jahr([{ art: "zuschlaege_3b", betragMonatlich: 100 }])).toBe("1200.00");
  });
  it("§ 14 Abs. 2 Nr. 19 und 20 WoGG: Unterhalt voll", () => {
    expect(jahr([{ art: "unterhalt", betragMonatlich: 400 }])).toBe("4800.00");
  });
  it("§ 14 Abs. 2 Nr. 19 Buchst. a, Nr. 20 Buchst. a WoGG: Annahme zur Pflegeperson bei Unterhalt und Zuwendungen", () => {
    const text = "Unterhalt und Zuwendungen ohne Abzug für eine Pflegeperson angesetzt; bis 6.540 € im Jahr dafür bleiben frei (§ 14 Abs. 2 Nr. 19 Buchst. a, Nr. 20 Buchst. a WoGG) und sind hier vorher abzuziehen.";
    expect(rechne([{ art: "unterhalt", betragMonatlich: 400 }]).annahmen).toContain(text);
    expect(rechne([{ art: "zuwendung_dritter", betragMonatlich: 50 }]).annahmen).toContain(text);
    expect(rechne([{ art: "rente", betragMonatlich: 400 }]).annahmen).not.toContain(text);
  });
  it("§ 14 Abs. 2 Nr. 19 Buchst. b WoGG: Zuwendungen Dritter über 480 € im Jahr", () => {
    expect(jahr([{ art: "zuwendung_dritter", betragMonatlich: 50 }])).toBe("120.00");
    expect(jahr([{ art: "zuwendung_dritter", betragMonatlich: 30 }])).toBe("0.00");
  });
  it("§ 14 Abs. 2 Nr. 21 WoGG: Unterhaltsvorschuss voll", () => {
    expect(jahr([{ art: "unterhaltsvorschuss", betragMonatlich: 230 }])).toBe("2760.00");
  });
  it("§ 14 Abs. 2 Nr. 27 WoGG: BAföG-Zuschuss zur Hälfte", () => {
    expect(jahr([{ art: "ausbildungsfoerderung", betragMonatlich: 600 }])).toBe("3600.00");
  });
  it("§ 14 Abs. 2 Nr. 9 WoGG über sonstige_voll: Krankentagegeld voll", () => {
    expect(jahr([{ art: "sonstige_voll", nummer: 9, betragMonatlich: 200 }])).toBe("2400.00");
  });
  it("§ 14 Abs. 2 Nr. 12 WoGG: Aktivrente voll, ohne Pauschbetrag", () => {
    expect(jahr([{ art: "sonstige_voll", nummer: 12, betragMonatlich: 1500 }])).toBe("18000.00");
  });
  it("§ 14 Abs. 2 Nr. 26 WoGG über sonstige_haelfte: Pflegeeinnahmen zur Hälfte", () => {
    expect(jahr([{ art: "sonstige_haelfte", nummer: 26, betragMonatlich: 300 }])).toBe("1800.00");
  });
});

describe("Jahreseinkommen: Abzug nach § 16 WoGG", () => {
  it("§ 16 WoGG: 30 % bei Steuern, KV/PV und RV", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000 }], { zahltSteuern: true, zahltKvPv: true, zahltRv: true })).toBe(
      "15939.00",
    );
  });
  it("§ 16 WoGG: Abzug gilt auch für Einnahmen nach § 14 Abs. 2", () => {
    const r = rechne([{ art: "lohnersatz", betragMonatlich: 1000 }], { zahltKvPv: true });
    expect(r.jahreseinkommen.toFixed(2)).toBe("10800.00");
    expect(r.abzugProzent).toBe(10);
  });
  it("§ 17 Nr. 4 WoGG, WoGVwV 17.03.5: Erwerbseinkommen nach Werbungskosten und § 16, ohne Rente", () => {
    const r = rechne(
      [
        { art: "nichtselbstaendig", betragMonatlich: 2000 },
        { art: "zuschlaege_3b", betragMonatlich: 100 },
        { art: "rente", betragMonatlich: 500 },
      ],
      { zahltKvPv: true, zahltRv: true },
    );
    expect(r.erwerbseinkommen.toFixed(2)).toBe("19176.00");
    expect(r.renteJaehrlich.toFixed(2)).toBe("6000.00");
  });
  it("schreibt einen Rechenschritt mit Norm und Wert", () => {
    const r = rechne([{ art: "rente", betragMonatlich: 1300 }], { zahltKvPv: true });
    expect(r.schritt).toMatchObject({ schritt: "Jahreseinkommen Mitglied 1", norm: "§§ 14 bis 16 WoGG", wert: "13948.20" });
  });
});

describe("Jahreseinkommen: unmögliche Eingaben", () => {
  it("negativer Betrag bei Rente", () => {
    expect(fehlerFeld(() => jahr([{ art: "rente", betragMonatlich: -1 }]))).toBe("mitglieder[0].einnahmen[0].betragMonatlich");
  });
  it("Werbungskosten bei einer Art ohne Werbungskosten", () => {
    expect(fehlerFeld(() => jahr([{ art: "rente", betragMonatlich: 100, werbungskostenMonatlich: 10 }]))).toBe(
      "mitglieder[0].einnahmen[0].werbungskostenMonatlich",
    );
  });
  it("sonstige ohne oder mit unzulässiger Nummer", () => {
    expect(fehlerFeld(() => jahr([{ art: "sonstige_voll", betragMonatlich: 100 }]))).toBe("mitglieder[0].einnahmen[0].nummer");
    expect(fehlerFeld(() => jahr([{ art: "sonstige_voll", nummer: 13, betragMonatlich: 100 }]))).toBe("mitglieder[0].einnahmen[0].nummer");
    expect(fehlerFeld(() => jahr([{ art: "sonstige_haelfte", nummer: 27, betragMonatlich: 100 }]))).toBe(
      "mitglieder[0].einnahmen[0].nummer",
    );
  });
  it("unbekannte Art", () => {
    expect(fehlerFeld(() => jahr([{ art: "kindergeld" as never, betragMonatlich: 250 }]))).toBe("mitglieder[0].einnahmen[0].art");
  });
  it.each(["schwerbehindert", "nsVerfolgt", "kindUnter25", "grundrentenzeiten33"] as const)("Merkmal %s muss ein Wahrheitswert sein", (merkmal) => {
    expect(fehlerFeld(() => jahr([], { [merkmal]: "false" } as unknown as Partial<MitgliedEingabe>))).toBe(`mitglieder[0].${merkmal}`);
  });
  it("elterngeldPlus muss ein Wahrheitswert sein", () => {
    expect(fehlerFeld(() => jahr([{ art: "elterngeld", betragMonatlich: 300, elterngeldPlus: "true" as never }]))).toBe(
      "mitglieder[0].einnahmen[0].elterngeldPlus",
    );
  });
  it("Einnahme in der Liste kein Objekt", () => {
    expect(fehlerFeld(() => jahr([null as never]))).toBe("mitglieder[0].einnahmen[0]");
  });
  it("fehlende Angabe zu § 16", () => {
    expect(
      fehlerFeld(() => berechneJahreseinkommen(WOGG_2025, { einnahmen: [], zahltKvPv: false, zahltRv: false } as unknown as MitgliedEingabe, 0)),
    ).toBe("mitglieder[0].zahltSteuern");
  });
});
