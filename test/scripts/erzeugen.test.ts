import { describe, expect, it } from "vitest";
import type { AnlageZeile } from "../../scripts/mietstufen/anlage";
import { ladeEingabe } from "../../scripts/mietstufen/eingabe";
import { erzeugeMietstufen, type ErzeugenEingabe } from "../../scripts/mietstufen/erzeugen";
import type { Gv } from "../../scripts/mietstufen/gv";

const eingabe = ladeEingabe();
const ergebnis = erzeugeMietstufen(eingabe);
const { daten, aliase } = ergebnis;
const zeile = (ags: string) => daten.gemeinden.find((g) => g[0] === ags);

describe("Mietstufen-Daten erzeugen: Zählungen mit echten Daten", () => {
  it("10.751 Gemeinden des Verzeichnisses 31.12.2025 haben genau eine Stufe, keine fehlt", () => {
    expect(daten.gemeinden).toHaveLength(10751);
    expect(new Set(daten.gemeinden.map((g) => g[0])).size).toBe(10751);
    expect(Object.keys(daten.kreise)).toHaveLength(400);
  });

  it("Herkunft: 1.601 Gemeindezeilen, 9.116 über den Kreis, 28 Inseln, 6 neu (Kreisstufe als Annahme)", () => {
    const zaehle = (h: string) => daten.gemeinden.filter((g) => g[3] === h).length;
    expect([zaehle("g"), zaehle("k"), zaehle("i"), zaehle("n")]).toEqual([1601, 9116, 28, 6]);
    expect(daten.meta.anzahl).toEqual({ anlage_zeilen: 1881, gemeinden: 10751, kreise: 400, je_herkunft: { g: 1601, k: 9116, i: 28, n: 6 } });
  });

  it("Stufenverteilung über alle Gemeinden (Stufe I bis VII)", () => {
    const verteilung = [1, 2, 3, 4, 5, 6, 7].map((s) => daten.gemeinden.filter((g) => g[2] === s).length);
    expect(verteilung).toEqual([6311, 2619, 917, 580, 176, 97, 51]);
  });

  it("jede Gemeindezeile der Anlage kehrt mit ihrer Stufe im Ergebnis wieder (Schlüsselwechsel eingerechnet)", () => {
    const bruecke = new Map(aliase.map((a) => [a.von, a.nach]));
    for (const z of ergebnis.verknuepfung.gemeinden) {
      const ags = bruecke.get(z.ags) ?? z.ags;
      expect(zeile(ags)?.[2], `${z.zeile.land} ${z.zeile.name}`).toBe(z.zeile.stufe);
      expect(zeile(ags)?.[3]).toBe("g");
    }
  });

  it("jede Kreiszeile der Anlage: Gemeinden ohne eigene Zeile erben ihre Stufe", () => {
    const kreisGemeinden = daten.gemeinden.filter((g) => g[3] === "k" || g[3] === "n");
    for (const k of ergebnis.verknuepfung.kreise) {
      const unter = kreisGemeinden.filter((g) => g[0].startsWith(k.kkz));
      expect(unter.every((g) => g[2] === k.zeile.stufe), `${k.zeile.land} ${k.zeile.name}`).toBe(true);
    }
  });
});

describe("Mietstufen-Daten erzeugen: Einzelfälle mit Quelle", () => {
  it("Taufkirchen (Kreis München): Stufe II bei Kreisstufe VII, amtlich der einzige Ausreißer im Kreis (BMWSB-Liste, CSU-Landtag Antrag 2023)", () => {
    expect(zeile("09184145")).toEqual(["09184145", "Taufkirchen", 2, "g"]);
    expect(zeile("09184119")?.[2]).toBe(7); // Garching bei München, Kreisgenosse
  });

  it("Inseln: Pellworm V, obwohl der Kreis Nordfriesland I hat; Sylt hat eine eigene Zeile (V)", () => {
    expect(zeile("01054103")).toEqual(["01054103", "Pellworm", 5, "i"]);
    expect(zeile("01054025")?.[2]).toBe(5);
    expect(daten.gemeinden.find((g) => g[1] === "Sylt")).toMatchObject([expect.any(String), "Sylt", 5, "g"]);
    expect(zeile("01054001")?.[2]).toBe(1); // Aventoft, Kreis Nordfriesland ohne Insel
  });

  it("Schlüsselwechsel: Langelsheim (I) und Eisenach (II) behalten ihre Anlage-Stufe unter neuem AGS", () => {
    expect(aliase).toEqual([
      { von: "03153007", nach: "03153019", name: "Langelsheim, Stadt" },
      { von: "16056000", nach: "16063105", name: "Eisenach, Stadt" },
    ]);
    expect(zeile("03153019")).toEqual(["03153019", "Langelsheim, Stadt", 1, "g"]);
    expect(zeile("16063105")).toEqual(["16063105", "Eisenach, Stadt", 2, "g"]);
  });

  it("Neu gegenüber dem Basisverzeichnis: sechs Gemeinden mit Kreisstufe I und Herkunft n", () => {
    const neu = daten.gemeinden.filter((g) => g[3] === "n").map((g) => `${g[0]} ${g[1]} ${g[2]}`);
    expect(neu).toEqual([
      "07132502 Neitersen 1",
      "07232503 Obergeckler 1",
      "14522275 Jahnatal 1",
      "16061119 Uder 1",
      "16065089 Greußen, Stadt 1",
      "16076094 Berga-Wünschendorf, Stadt 1",
    ]);
  });

  it("Gemeinde über 10.000 Einwohner ohne Anlagezeile erbt die Kreisstufe: Pasewalk (Vorpommern-Greifswald)", () => {
    expect(zeile("13075105")).toEqual(["13075105", "Pasewalk, Stadt", 1, "k"]);
  });

  it("Leipzig: Stadt II (Gemeindezeile), Landkreis I gilt für Borna", () => {
    expect(zeile("14713000")?.[2]).toBe(2);
    const borna = daten.gemeinden.find((g) => g[1] === "Borna, Stadt");
    expect(borna?.[0].startsWith("14729")).toBe(true);
    expect(borna?.[2]).toBe(1);
    expect(daten.kreise["14729"]).toBe("Leipzig");
    expect(daten.kreise["14713"]).toBe("Leipzig, Stadt");
  });
});

describe("erzeugeMietstufen: kleine Fälle", () => {
  const nachweis = { titel: "t", url: "https://example.invalid/", abruf: "2026-10-08", sha256: "0" };
  const flensburg = { ags: "01001000", name: "Flensburg, Stadt", textkennzeichen: "61", einwohner: 90000 };
  const handewitt = { ags: "01059045", name: "Handewitt", textkennzeichen: "64", einwohner: 11000 };
  const klein = { ags: "01059100", name: "Kleinort", textkennzeichen: "64", einwohner: 500 };
  const kreise = [
    { kkz: "01001", name: "Flensburg, Stadt", textkennzeichen: "41", kreisfrei: true },
    { kkz: "01059", name: "Schleswig-Flensburg", textkennzeichen: "44", kreisfrei: false },
  ];
  const gv = (gemeinden: Gv["gemeinden"]): Gv => ({ gebietsstand: "31.12.2020", vermerk: "", gemeinden, kreise });
  const anlage: AnlageZeile[] = [
    { land: "Schleswig-Holstein", art: "gemeinde", name: "Flensburg, Stadt", stufe: 3 },
    { land: "Schleswig-Holstein", art: "gemeinde", name: "Handewitt", stufe: 2 },
    { land: "Schleswig-Holstein", art: "kreis", name: "Schleswig-Flensburg", stufe: 1 },
    { land: null, art: "insel", name: "Inseln ohne Festlandanschluss", stufe: 5 },
  ];
  const basis = (e: Partial<ErzeugenEingabe> = {}): ErzeugenEingabe => ({
    anlage,
    basis: gv([flensburg, handewitt, klein]),
    aktuell: gv([flensburg, handewitt, klein]),
    nachweise: { anlage: nachweis, basis: nachweis, aktuell: nachweis },
    inseln: [],
    handzuordnung: [],
    ...e,
  });

  it("Gemeindezeile g, Kreisstufe k", () => {
    const { daten: d } = erzeugeMietstufen(basis());
    expect(d.gemeinden).toEqual([
      ["01001000", "Flensburg, Stadt", 3, "g"],
      ["01059045", "Handewitt", 2, "g"],
      ["01059100", "Kleinort", 1, "k"],
    ]);
  });

  it("Gemeinde, die im Basisverzeichnis fehlt, bekommt Kreisstufe und Herkunft n", () => {
    const neu = { ags: "01059999", name: "Neuort", textkennzeichen: "64", einwohner: 800 };
    const { daten: d } = erzeugeMietstufen(basis({ aktuell: gv([flensburg, handewitt, klein, neu]) }));
    expect(d.gemeinden.at(-1)).toEqual(["01059999", "Neuort", 1, "n"]);
  });

  it("Gemeinde in einem Kreis ohne Kreiszeile bricht den Lauf ab, statt eine Stufe zu raten", () => {
    const fremd = { ags: "01060001", name: "Fremdort", textkennzeichen: "64", einwohner: 800 };
    const mitKreis = { ...gv([flensburg, handewitt, klein, fremd]), kreise: [...kreise, { kkz: "01060", name: "Segeberg", textkennzeichen: "44", kreisfrei: false }] };
    expect(() => erzeugeMietstufen(basis({ aktuell: mitKreis }))).toThrow(/Kreis 01060 hat keine Stufe/);
  });

  it("Anlage-Gemeinde, die im aktuellen Verzeichnis weder per AGS noch per Name auftaucht, bricht ab", () => {
    expect(() => erzeugeMietstufen(basis({ aktuell: gv([flensburg, klein]) }))).toThrow(/Handewitt/);
  });

  it("nicht eindeutig zugeordnete Anlagezeilen werden aufgelistet und brechen ab", () => {
    expect(() => erzeugeMietstufen(basis({ anlage: [...anlage, { land: "Schleswig-Holstein", art: "gemeinde", name: "Atlantis", stufe: 4 }] }))).toThrow(/Atlantis/);
  });
});
