import { describe, expect, it } from "vitest";
import { MIETSTUFEN_DATEN, pruefeMietstufenDaten, sucheMietstufe } from "../../src/mietstufen/daten";
import { vorKomma } from "../../src/mietstufen/normalisieren";
import type { SuchEingabe, SuchErgebnis } from "../../src/mietstufen/typen";
import { BMWSB_2025 } from "../fixtures/bmwsb-2025";

// Test 6 der Spec: Mietstufen. Sollwerte stammen aus der WoGV-Anlage (Stufe je Zeile), dem
// Gemeindeverzeichnis 31.12.2025 (Namen, Kreise) und den BMWSB-Beispielen (Stand 01.01.2025).

const eindeutig = (e: SuchErgebnis) => {
  if (e.status !== "eindeutig") throw new Error(`erwartet eindeutig, war ${e.status}: ${JSON.stringify(e)}`);
  return e.treffer;
};
const kandidaten = (e: SuchErgebnis) => (e.status === "mehrdeutig" ? e.kandidaten : e.status === "nicht_gefunden" ? e.aehnlich : []);

// Das BMWSB nennt nur „Jüterbog“, „Ludwigshafen“, „Weimar“ usw. Die Suche braucht den vollen Namen
// oder einen Zusatz, wo der Name mehrfach vorkommt (Weimar in Thüringen und Weimar (Lahn) in Hessen).
const SUCHE_ZU_BEISPIEL: Record<number, SuchEingabe> = {
  1: { gemeinde: "Jüterbog" },
  2: { gemeinde: "Ludwigshafen am Rhein" },
  3: { gemeinde: "Leipzig" },
  4: { gemeinde: "Süderbrarup", kreis: "Schleswig-Flensburg" }, // Gemeinde unter 10.000 Einwohnern im „Kreis Schleswig-Flensburg“
  5: { gemeinde: "Wiesbaden" },
  6: { gemeinde: "München" },
  7: { gemeinde: "Weimar", land: "Thüringen" },
  8: { gemeinde: "Friedrichshafen" },
  9: { gemeinde: "Attendorn" },
  10: { gemeinde: "Lübeck" },
  11: { gemeinde: "Neubrandenburg" },
};

describe("Mietstufen: die 11 Beispielorte des BMWSB", () => {
  for (const fall of BMWSB_2025) {
    it(`Beispiel ${fall.nr} (${fall.ort}) hat Stufe ${fall.mietstufe}`, () => {
      const eingabe = SUCHE_ZU_BEISPIEL[fall.nr];
      expect(eingabe).toBeDefined();
      expect(eindeutig(sucheMietstufe(eingabe!)).mietstufe).toBe(fall.mietstufe);
    });
  }

  it("„Ludwigshafen“ allein ist ein Teilname: kein Treffer, sondern Vorschläge (auch Bodman-Ludwigshafen am Bodensee)", () => {
    const e = sucheMietstufe({ gemeinde: "Ludwigshafen" });
    expect(e.status).toBe("nicht_gefunden");
    expect(kandidaten(e).map((k) => k.gemeinde)).toEqual(["Bodman-Ludwigshafen", "Ludwigshafen am Rhein, Stadt"]);
  });
});

describe("Mietstufen: Ort unter 10.000 Einwohnern über seinen Kreis (Vorbemerkung der Anlage)", () => {
  it("Süderbrarup erbt die Stufe I des Kreises Schleswig-Flensburg, Handewitt (über 10.000) hat II aus der Gemeindetabelle", () => {
    const klein = eindeutig(sucheMietstufe({ gemeinde: "Süderbrarup" }));
    expect(klein).toMatchObject({ kreis: "Schleswig-Flensburg", land: "Schleswig-Holstein", mietstufe: 1 });
    expect(klein.quelle).toContain("Kreistabelle Schleswig-Holstein: Schleswig-Flensburg");
    const gross = eindeutig(sucheMietstufe({ gemeinde: "Handewitt" }));
    expect(gross.mietstufe).toBe(2);
    expect(gross.quelle).toBe("WoGV-Anlage, Gemeindetabelle Schleswig-Holstein");
  });

  it("Pasewalk hat über 10.000 Einwohner, steht aber nicht in der Anlage: Kreisstufe, wie die Anlage es festlegt", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Pasewalk" }))).toMatchObject({ kreis: "Vorpommern-Greifswald", mietstufe: 1 });
  });
});

describe("Mietstufen: Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG) vor dem Kreisfallback", () => {
  it("Pellworm V statt Kreis Nordfriesland I; Borkum V statt Kreis Leer I; Hiddensee V statt Vorpommern-Rügen II", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Pellworm" }))).toMatchObject({ kreis: "Nordfriesland", mietstufe: 5 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Borkum" }))).toMatchObject({ kreis: "Leer", mietstufe: 5 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Insel Hiddensee" }))).toMatchObject({ kreis: "Vorpommern-Rügen", mietstufe: 5 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Pellworm" })).quelle).toContain("Inseln ohne Festlandanschluss");
  });

  it("Festlandnachbar bleibt bei der Kreisstufe: Aventoft (Nordfriesland) I; Sylt hat eine eigene Zeile mit V", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Aventoft" })).mietstufe).toBe(1);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Sylt" }))).toMatchObject({ mietstufe: 5, quelle: "WoGV-Anlage, Gemeindetabelle Schleswig-Holstein" });
  });
});

describe("Mietstufen: Leipzig Stadt gegen Leipzig Kreis", () => {
  it("die Stadt Leipzig hat II, eine Gemeinde im Landkreis Leipzig I", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Leipzig" }))).toMatchObject({ kreis: "Leipzig, Stadt", mietstufe: 2 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Borna", kreis: "Landkreis Leipzig" }))).toMatchObject({ kreis: "Leipzig", mietstufe: 1 });
  });
});

describe("Mietstufen: mehrdeutige Namen", () => {
  it("„Neustadt“ hat fünf Gemeinden gleichen Namens mit Klammer- oder Schrägstrichzusatz", () => {
    const e = sucheMietstufe({ gemeinde: "Neustadt" });
    expect(e.status).toBe("mehrdeutig");
    expect(e.status === "mehrdeutig" ? e.anzahl : 0).toBe(5);
    expect(kandidaten(e).map((k) => `${k.gemeinde} | ${k.land}`)).toEqual([
      "Neustadt (Dosse), Stadt | Brandenburg",
      "Neustadt (Hessen), Stadt | Hessen",
      "Neustadt (Wied) | Rheinland-Pfalz",
      "Neustadt/ Westerwald | Rheinland-Pfalz",
      "Neustadt/Vogtl. | Sachsen",
    ]);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Neustadt", land: "Hessen" })).gemeinde).toBe("Neustadt (Hessen), Stadt");
  });

  it("Frankfurt: Frankfurt (Oder) über den Klammerzusatz, dazu Frankfurt am Main, dessen Name mit der Eingabe beginnt", () => {
    const e = sucheMietstufe({ gemeinde: "Frankfurt" });
    expect(e.status).toBe("mehrdeutig");
    expect(kandidaten(e).map((k) => `${k.gemeinde}:${k.mietstufe}`)).toEqual(["Frankfurt (Oder), Stadt:2", "Frankfurt am Main, Stadt:6"]);
  });

  it("Eisenach gibt es in Thüringen (Stadt, II) und in Rheinland-Pfalz (Gemeinde, I)", () => {
    const e = sucheMietstufe({ gemeinde: "Eisenach" });
    expect(e.status).toBe("mehrdeutig");
    expect(kandidaten(e).map((k) => [k.land, k.mietstufe])).toEqual([["Rheinland-Pfalz", 1], ["Thüringen", 2]]);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Eisenach", land: "TH" })).mietstufe).toBe(2);
  });

  it("Taufkirchen: drei Gemeinden in Bayern; Landkreis München ist II (Ausreißer im Kreis mit VII)", () => {
    const e = sucheMietstufe({ gemeinde: "Taufkirchen" });
    expect(e.status).toBe("mehrdeutig");
    expect(kandidaten(e).map((k) => `${k.kreis}:${k.mietstufe}`).sort()).toEqual(["Erding:5", "Mühldorf a.Inn:1", "München:2"]);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Taufkirchen", kreis: "Landkreis München" })).mietstufe).toBe(2);
  });
});

describe("Mietstufen: lockere Umlautsuche (Endreview C-1)", () => {
  it("„Aue“ und „Hochheim“ liefern nicht eindeutig Au bzw. Höchheim", () => {
    const aue = sucheMietstufe({ gemeinde: "Aue" });
    expect(aue.status).not.toBe("eindeutig");
    expect(kandidaten(aue).map((k) => k.gemeinde)).toContain("Aue-Bad Schlema, Stadt");
    const hochheim = sucheMietstufe({ gemeinde: "Hochheim" });
    expect(hochheim.status).not.toBe("eindeutig");
    expect(kandidaten(hochheim).map((k) => k.gemeinde)).toContain("Hochheim am Main, Stadt");
  });
});

describe("Mietstufen: neu gebildete Gemeinden (Annahme: Kreisstufe)", () => {
  it("Jahnatal (Mittelsachsen) und Berga-Wünschendorf (Greiz) bekommen I mit Hinweis auf die Annahme", () => {
    const j = eindeutig(sucheMietstufe({ gemeinde: "Jahnatal" }));
    expect(j).toMatchObject({ kreis: "Mittelsachsen", mietstufe: 1 });
    expect(j.quelle).toContain("Annahme");
    expect(eindeutig(sucheMietstufe({ gemeinde: "Berga-Wünschendorf" }))).toMatchObject({ kreis: "Greiz", mietstufe: 1 });
  });

  it("Langelsheim und Eisenach (neuer Schlüssel, gleiche Gemeinde) behalten ihre Stufe aus der Anlage ohne Annahme", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Langelsheim" }))).toMatchObject({ mietstufe: 1, quelle: "WoGV-Anlage, Gemeindetabelle Niedersachsen" });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Eisenach", land: "Thüringen" })).quelle).not.toContain("Annahme");
  });
});

describe("Mietstufen: Eingabevarianten", () => {
  it("Schreibweisen führen zum selben Ort", () => {
    const soll = eindeutig(sucheMietstufe({ gemeinde: "Dießen am Ammersee" }));
    expect(soll).toMatchObject({ gemeinde: "Dießen am Ammersee, M", mietstufe: 5 });
    for (const g of ["Diessen am Ammersee", "dießen a. ammersee", "Markt Dießen am Ammersee"]) {
      expect(eindeutig(sucheMietstufe({ gemeinde: g })).gemeinde, g).toBe(soll.gemeinde);
    }
    expect(eindeutig(sucheMietstufe({ gemeinde: "Koeln" })).mietstufe).toBe(6);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Munchen" })).mietstufe).toBe(7);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Lauf an der Pegnitz" })).mietstufe).toBe(4);
  });

  it("Tippfehler und Teilnamen geben Vorschläge, keine Treffer", () => {
    expect(kandidaten(sucheMietstufe({ gemeinde: "Hamburk" })).map((k) => k.gemeinde)[0]).toBe("Hamburg, Freie und Hansestadt");
    expect(sucheMietstufe({ gemeinde: "Bad Homburg" }).status).toBe("nicht_gefunden");
    expect(kandidaten(sucheMietstufe({ gemeinde: "Hiddensee" })).map((k) => k.gemeinde)).toEqual(["Insel Hiddensee, Seebad"]);
  });
});

describe("Mietstufen: Daten gegen die Quelle", () => {
  it("jede Stufe liegt zwischen I und VII, jede Gemeinde hat Land und Kreis im Bestand", () => {
    expect(MIETSTUFEN_DATEN.gemeinden.every(([, , stufe]) => stufe >= 1 && stufe <= 7)).toBe(true);
    expect(MIETSTUFEN_DATEN.gemeinden.every(([ags]) => MIETSTUFEN_DATEN.laender[ags.slice(0, 2)] && MIETSTUFEN_DATEN.kreise[ags.slice(0, 5)])).toBe(true);
  });

  it("Zeilenzahl der Anlage im Kopf: 1.881 = 1.601 Gemeinden + 279 Kreise + 1 Inselzeile, und 1.601 Gemeindezeilen tragen ihre Stufe", () => {
    expect(MIETSTUFEN_DATEN.meta.anzahl.anlage_zeilen).toBe(1601 + 279 + 1);
    expect(MIETSTUFEN_DATEN.gemeinden.filter((g) => g[3] === "g")).toHaveLength(1601);
  });
});

describe("pruefeMietstufenDaten: kaputte Dateien scheitern laut", () => {
  const ok = { meta: {}, laender: { "01": "SH" }, kreise: { "01001": "Flensburg" }, gemeinden: [["01001000", "Flensburg, Stadt", 3, "g"]] };

  it("gültiger Aufbau wird angenommen", () => {
    expect(pruefeMietstufenDaten(ok).gemeinden).toHaveLength(1);
  });

  it.each([
    ["Stufe 8", { ...ok, gemeinden: [["01001000", "Flensburg, Stadt", 8, "g"]] }, /Stufe 8/],
    ["Stufe als Text", { ...ok, gemeinden: [["01001000", "Flensburg, Stadt", "3", "g"]] }, /Stufe 3/],
    ["unbekannte Herkunft", { ...ok, gemeinden: [["01001000", "Flensburg, Stadt", 3, "x"]] }, /Herkunft x/],
    ["AGS zu kurz", { ...ok, gemeinden: [["1001000", "Flensburg, Stadt", 3, "g"]] }, /AGS 1001000/],
    ["doppelte AGS", { ...ok, gemeinden: [["01001000", "A", 3, "g"], ["01001000", "B", 3, "g"]] }, /doppelt/],
    ["Kreis unbekannt", { ...ok, gemeinden: [["01059001", "A", 3, "g"]] }, /Kreis 01059/],
    ["Land unbekannt", { ...ok, gemeinden: [["02001000", "A", 3, "g"]] }, /Land 02/],
    ["Zeile mit drei Feldern", { ...ok, gemeinden: [["01001000", "A", 3]] }, /vier Felder/],
    ["kein Objekt", [], /Aufbau/],
  ])("%s", (_name, roh, muster) => {
    expect(() => pruefeMietstufenDaten(roh)).toThrow(muster);
  });
});
