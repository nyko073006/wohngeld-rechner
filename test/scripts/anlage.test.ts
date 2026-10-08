import { describe, expect, it } from "vitest";
import { parseAnlage } from "../../scripts/mietstufen/anlage";
import { leseAnlageRoh } from "../../scripts/mietstufen/eingabe";
import { leseQuellen } from "../../scripts/mietstufen/quellen";

describe("Anlage lesen (WoGV Anlage zu § 1 Abs. 3)", () => {
  const zeilen = leseAnlageRoh(leseQuellen().anlage);
  const gemeinden = zeilen.filter((z) => z.art === "gemeinde");
  const kreise = zeilen.filter((z) => z.art === "kreis");

  it("1.881 Zeilen: 1.601 Gemeinden, 279 Kreise, 1 Inselzeile (Spec 3.3, Datenbefund 1.2)", () => {
    expect(zeilen).toHaveLength(1881);
    expect(gemeinden).toHaveLength(1601);
    expect(kreise).toHaveLength(279);
    expect(zeilen.filter((z) => z.art === "insel")).toEqual([{ land: null, art: "insel", name: "Inseln ohne Festlandanschluss", stufe: 5 }]);
  });

  it("Zeilen je Land stimmen mit der Zählung des Datenbefunds überein (inkl. Rheinland-Pfalz ohne thead)", () => {
    const soll: Record<string, [number, number]> = {
      "Baden-Württemberg": [259, 35], Bayern: [233, 71], Berlin: [1, 0], Brandenburg: [70, 14], Bremen: [2, 0], Hamburg: [1, 0],
      Hessen: [171, 21], "Mecklenburg-Vorpommern": [20, 6], Niedersachsen: [205, 35], "Nordrhein-Westfalen": [343, 18],
      "Rheinland-Pfalz": [47, 24], Saarland: [36, 6], Sachsen: [68, 10], "Sachsen-Anhalt": [54, 11], "Schleswig-Holstein": [56, 11], Thüringen: [35, 17],
    };
    const ist = Object.fromEntries(Object.keys(soll).map((land) => [land, [gemeinden.filter((z) => z.land === land).length, kreise.filter((z) => z.land === land).length]]));
    expect(ist).toEqual(soll);
  });

  it("Stufenverteilung (Datenbefund 1.2)", () => {
    const zaehle = (liste: typeof zeilen) => [1, 2, 3, 4, 5, 6, 7].map((s) => liste.filter((z) => z.stufe === s).length);
    expect(zaehle(gemeinden)).toEqual([357, 477, 337, 219, 109, 66, 36]);
    expect(zaehle(kreise)).toEqual([168, 66, 22, 16, 3, 2, 2]);
  });

  it("liest Namen wörtlich, auch Tippfehler der Anlage und Umlaute aus Entitäten", () => {
    const stufe = (land: string, art: string, name: string) => zeilen.find((z) => z.land === land && z.art === art && z.name === name)?.stufe;
    expect(stufe("Hessen", "gemeinde", "Wiesbaden, Landeshaupstadt")).toBe(6);
    expect(stufe("Baden-Württemberg", "gemeinde", "Phillipsburg, Stadt")).toBe(2);
    expect(stufe("Bayern", "gemeinde", "München")).toBe(7);
    expect(stufe("Sachsen", "kreis", "Leipzig")).toBe(1);
    expect(stufe("Rheinland-Pfalz", "kreis", "Ahrweiler")).toBe(1);
    expect(zeilen.some((z) => /&|<|>/.test(z.name))).toBe(false);
  });
});

describe("parseAnlage: Fehlerfälle", () => {
  const kopf = '<div><span>Land:</span>&#160;<span style="font-weight:bold">Testland</span></div>';
  const tabelle = (art: string, zeilen: string) => `${kopf}<table><thead><tr><th>${art}</th><th>Mietenstufe</th></tr></thead><tbody>${zeilen}</tbody></table>`;

  it("nimmt die Kopfzeile auch aus dem tbody (Rheinland-Pfalz)", () => {
    const html = `${kopf}<table><tbody><tr><td>Kreis</td><td>Mietenstufe</td></tr><tr><td>Ahrweiler</td><td>I</td></tr></tbody></table>`;
    expect(parseAnlage(html)).toEqual([{ land: "Testland", art: "kreis", name: "Ahrweiler", stufe: 1 }]);
  });

  it("bricht ab bei unbekannter Stufe, fremder Tabelle und Zeile mit drei Zellen", () => {
    expect(() => parseAnlage(tabelle("Gemeinde", "<tr><td>A</td><td>VIII</td></tr>"))).toThrow(/nicht lesbar/);
    expect(() => parseAnlage(tabelle("Ort", "<tr><td>A</td><td>I</td></tr>"))).toThrow(/unbekannte Tabelle/);
    expect(() => parseAnlage(tabelle("Gemeinde", "<tr><td>A</td><td>I</td><td>x</td></tr>"))).toThrow(/nicht lesbar/);
  });
});
