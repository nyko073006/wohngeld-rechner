import { describe, expect, it } from "vitest";
import { leseGv } from "../../scripts/mietstufen/gv";
import { leseXlsx } from "../../scripts/mietstufen/xlsx";
import { leseQuellen, leseRohdatei } from "../../scripts/mietstufen/quellen";

const SATZARTEN = new Set(["10", "20", "30", "40", "50", "60"]);

describe("xlsx-Leser: Gemeindeverzeichnis", () => {
  it("liest Blattnamen und alle Datenzeilen (Zählung unabhängig mit openpyxl am 08.10.2026)", () => {
    const q = leseQuellen();
    const a = leseXlsx(leseRohdatei(q.gv_basis));
    const b = leseXlsx(leseRohdatei(q.gv_aktuell));
    expect(a.map((x) => x.name)).toEqual(["Inhalt", "Onlineprodukt_Gemeinden"]);
    expect(b.map((x) => x.name)).toEqual(["Inhalt", "Onlineprodukt_Gemeinden31122025"]);
    expect(a[1]!.zeilen.filter((z) => SATZARTEN.has(z[0] ?? "")).length).toBe(16068);
    expect(b[1]!.zeilen.filter((z) => SATZARTEN.has(z[0] ?? "")).length).toBe(16000);
  });

  it("lehnt Dateien ohne ZIP-Aufbau ab", () => {
    expect(() => leseXlsx(Buffer.from("das ist kein zip, nur Text mit genug Zeichen drin"))).toThrow(/ZIP/);
  });
});

describe("Gemeindeverzeichnis lesen: Zählungen und Vermerk", () => {
  const q = leseQuellen();
  const basis = leseGv(leseRohdatei(q.gv_basis));
  const aktuell = leseGv(leseRohdatei(q.gv_aktuell));

  it("Gebietsstand aus dem Blatt Inhalt", () => {
    expect(basis.gebietsstand).toBe("31.12.2020");
    expect(aktuell.gebietsstand).toBe("31.12.2025");
  });

  it("Gemeinden ohne gemeindefreie Gebiete, Kreise und Landkreise (Datenbefund 2.2, 3.3)", () => {
    expect(basis.gemeinden).toHaveLength(10794);
    expect(basis.kreise).toHaveLength(401);
    expect(aktuell.gemeinden).toHaveLength(10751);
    expect(aktuell.kreise).toHaveLength(400);
    expect(basis.kreise.filter((k) => ["43", "44", "45"].includes(k.textkennzeichen))).toHaveLength(294);
    expect(aktuell.kreise.filter((k) => ["43", "44", "45"].includes(k.textkennzeichen))).toHaveLength(294);
    expect(aktuell.kreise.filter((k) => k.kreisfrei)).toHaveLength(106);
  });

  it("AGS führende Nullen bleiben erhalten, Einwohner sind Zahlen", () => {
    expect(aktuell.gemeinden[0]).toMatchObject({ ags: "01001000", name: "Flensburg, Stadt" });
    expect(aktuell.gemeinden.every((g) => /^\d{8}$/.test(g.ags))).toBe(true);
    expect(aktuell.gemeinden.every((g) => g.einwohner !== null && Number.isFinite(g.einwohner))).toBe(true);
  });

  it("Verbreitungsvermerk steht in beiden Dateien (Lizenzbericht: Quellenangabe Pflicht, Änderungen kennzeichnen)", () => {
    for (const gv of [basis, aktuell]) {
      expect(gv.vermerk).toContain("Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder");
      expect(gv.vermerk).toContain("Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet.");
    }
  });
});
