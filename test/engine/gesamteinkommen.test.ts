import { describe, expect, it } from "vitest";
import { D } from "../../src/engine/dezimal";
import type { HaushaltEingabe, MitgliedEingabe, UnterhaltZahlung } from "../../src/engine/eingabe";
import { berechneGesamteinkommen } from "../../src/engine/einkommen/gesamteinkommen";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { WOGG_2025 } from "../../src/rechtsstand";
import { BMWSB_2025 } from "../fixtures/bmwsb-2025";
import { EINGABEN_BMWSB_2025 } from "../fixtures/bmwsb-2025-eingaben";

// noUncheckedIndexedAccess: fehlende Fixture ist ein Testfehler, kein undefined.
function eingabe(nr: number): HaushaltEingabe {
  const h = EINGABEN_BMWSB_2025[nr];
  if (!h) throw new Error(`Fixture für BMWSB-Beispiel ${nr} fehlt`);
  return h;
}
const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
function ausHaushalt(h: HaushaltEingabe) {
  return berechneGesamteinkommen({
    rechtsstand: WOGG_2025,
    mitglieder: h.mitglieder.flatMap((mitglied, index) => (mitglied.ausschluss ? [] : [{ index, mitglied }])),
    alleinerziehend: h.alleinerziehend,
    unterhaltGezahlt: h.unterhaltGezahlt,
  });
}
function rechne(mitglieder: MitgliedEingabe[], extra: { alleinerziehend?: boolean; unterhaltGezahlt?: UnterhaltZahlung[] } = {}) {
  return berechneGesamteinkommen({ rechtsstand: WOGG_2025, mitglieder: mitglieder.map((mitglied, index) => ({ index, mitglied })), ...extra });
}
function fehlerFeld(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof EingabeFehler) return e.feld;
    throw e;
  }
  throw new Error("kein Fehler geworfen");
}
const y = (mitglieder: MitgliedEingabe[], extra?: Parameters<typeof rechne>[1]) => rechne(mitglieder, extra).y.toFixed(2);
const rentner = (betrag: number, extra: Partial<MitgliedEingabe> = {}): MitgliedEingabe => ({
  einnahmen: [{ art: "rente", betragMonatlich: betrag }],
  ...ohne,
  ...extra,
});

describe("berechneGesamteinkommen: amtliche Beispiele von den Einnahmen bis Y", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt Y = ${fall.y}`, () => {
      const r = ausHaushalt(eingabe(fall.nr));
      expect(r.y.toFixed(2)).toBe(fall.y);
      expect(r.y.equals(new D(fall.y))).toBe(true);
    });
  }
});

describe("berechneGesamteinkommen: Freibeträge (§§ 17, 17a WoGG)", () => {
  it("§ 17 Nr. 1 WoGG: 1.800 € je schwerbehindertem Mitglied", () => {
    expect(y([rentner(1000, { schwerbehindert: true })])).toBe("841.50");
  });
  it("§ 17 Nr. 2 WoGG: 750 € je NS-Verfolgtem", () => {
    expect(y([rentner(1000, { nsVerfolgt: true })])).toBe("929.00");
  });
  it("§ 17 Nr. 3 WoGG: 1.320 € einmal je Haushalt", () => {
    expect(y([rentner(1000), rentner(1000)], { alleinerziehend: true })).toBe("1873.00");
  });
  it("§ 17 Nr. 4 WoGG: Erwerbseinkommen des Kindes, höchstens 1.200 €", () => {
    const kind: MitgliedEingabe = { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 500 }], ...ohne, kindUnter25: true };
    expect(y([rentner(1000), kind])).toBe("1289.00");
  });
  it("§ 17 Nr. 4 WoGG: kein Freibetrag für Unterhalt des Kindes", () => {
    const kind: MitgliedEingabe = { einnahmen: [{ art: "unterhalt", betragMonatlich: 300 }], ...ohne, kindUnter25: true };
    expect(y([rentner(1000), kind])).toBe("1291.50");
  });
  it("§ 17a WoGG: 1.200 € plus 30 % der übersteigenden Rente unter dem Deckel", () => {
    const r = rechne([rentner(300, { grundrentenzeiten33: true })]);
    expect(r.y.toFixed(2)).toBe("131.50");
    expect(r.annahmen.join(" ")).toContain("Grundrentenfreibetrag");
  });
  it("§ 13 WoGG: Freibeträge über dem Einkommen ergeben Y = 0, nicht negativ", () => {
    expect(y([rentner(80, { grundrentenzeiten33: true })])).toBe("0.00");
  });
  it("nennt die Annahme, wenn kein Freibetrag angegeben ist", () => {
    expect(ausHaushalt(eingabe(1)).annahmen.join(" ")).toContain("Keine Freibeträge");
    expect(ausHaushalt(eingabe(3)).annahmen.join(" ")).not.toContain("Keine Freibeträge");
  });
});

describe("berechneGesamteinkommen: Unterhaltsabzug (§ 18 WoGG)", () => {
  const basis = [rentner(3000)];
  it("§ 18 Satz 1 Nr. 3 WoGG: Ehegattenunterhalt höchstens 6.000 €", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "ehegatte", betragMonatlich: 600 }] })).toBe("2491.50");
  });
  it("§ 18 Satz 2 WoGG: mit Titel der festgelegte Betrag", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "ehegatte", betragMonatlich: 600, tituliert: true }] })).toBe("2391.50");
  });
  it("§ 18 Satz 1 Nr. 4 WoGG: sonstige Person unter dem Höchstbetrag voll", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "sonstige", betragMonatlich: 200 }] })).toBe("2791.50");
  });
  it("§ 18 Satz 1 Nr. 1 WoGG: auswärts in Ausbildung höchstens 3.000 €", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "auswaerts_ausbildung", betragMonatlich: 400 }] })).toBe("2741.50");
  });
  it("unbekannte Unterhaltsart ist ein Eingabefehler", () => {
    let feld = "";
    try {
      rechne(basis, { unterhaltGezahlt: [{ art: "kind" as never, betragMonatlich: 100 }] });
    } catch (e) {
      if (e instanceof EingabeFehler) feld = e.feld;
    }
    expect(feld).toBe("unterhaltGezahlt[0].art");
  });
});

describe("berechneGesamteinkommen: unmögliche Eingaben", () => {
  it("alleinerziehend muss ein Wahrheitswert sein", () => {
    expect(fehlerFeld(() => rechne([rentner(1000)], { alleinerziehend: "nein" as never }))).toBe("alleinerziehend");
  });
  it("unterhaltGezahlt muss eine Liste sein", () => {
    expect(fehlerFeld(() => rechne([rentner(1000)], { unterhaltGezahlt: {} as never }))).toBe("unterhaltGezahlt");
  });
  it("Unterhaltszahlung in der Liste kein Objekt", () => {
    expect(fehlerFeld(() => rechne([rentner(1000)], { unterhaltGezahlt: [null as never] }))).toBe("unterhaltGezahlt[0]");
  });
});

describe("berechneGesamteinkommen: Rechenweg", () => {
  it("Beispiel 3: Schritte mit Normen und Werten in fester Reihenfolge", () => {
    const r = ausHaushalt(eingabe(3));
    expect(r.schritte.map((s) => s.norm)).toEqual([
      "§§ 14 bis 16 WoGG",
      "§§ 14 bis 16 WoGG",
      "§ 13 Abs. 1 WoGG",
      "§ 17 Nr. 1 WoGG",
      "§ 13 Abs. 1 WoGG",
      "§ 13 Abs. 2 WoGG",
    ]);
    expect(r.schritte.map((s) => s.wert)).toEqual(["15136.20", "5740.20", "20876.40", "-1800.00", "19076.40", "1589.70"]);
  });
});
