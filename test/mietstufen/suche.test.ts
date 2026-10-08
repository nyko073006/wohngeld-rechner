import { describe, expect, it } from "vitest";
import { MAX_AEHNLICH, MAX_KANDIDATEN, erzeugeSuche } from "../../src/mietstufen/suche";
import type { GemeindeZeile, MietstufenDaten, SuchErgebnis } from "../../src/mietstufen/typen";

// Kleiner, von Hand gebauter Bestand: jede Regel der Suche hat hier einen Fall mit bekanntem Ausgang.
const LAENDER = { "01": "Schleswig-Holstein", "06": "Hessen", "07": "Rheinland-Pfalz", "09": "Bayern", "12": "Brandenburg", "14": "Sachsen", "16": "Thüringen" };
const KREISE = {
  "01059": "Schleswig-Flensburg",
  "06534": "Marburg-Biedenkopf", "06412": "Frankfurt am Main, Stadt",
  "07138": "Neuwied", "09162": "München, Landeshauptstadt", "09184": "München", "09279": "Dingolfing-Landau",
  "09186": "Pfaffenhofen a.d.Ilm", "12053": "Frankfurt (Oder), Stadt", "14713": "Leipzig, Stadt", "14729": "Leipzig",
  "16055": "Weimar, Stadt",
};
const GEMEINDEN: GemeindeZeile[] = [
  ["01059100", "Süderbrarup", 1, "k"],
  ["06412000", "Frankfurt am Main, Stadt", 6, "g"],
  ["06534016", "Neustadt (Hessen), Stadt", 1, "g"],
  ["06534020", "Weimar (Lahn)", 1, "k"],
  ["07138060", "Neustadt (Wied)", 1, "k"],
  ["09162000", "München, Landeshauptstadt", 7, "g"],
  ["09184145", "Taufkirchen", 2, "g"],
  ["09279122", "Landau a.d.Isar, St", 2, "g"],
  ["09186143", "Pfaffenhofen a.d.Ilm, St", 4, "g"],
  ["12053000", "Frankfurt (Oder), Stadt", 2, "g"],
  ["14713000", "Leipzig, Stadt", 2, "g"],
  ["14729010", "Borna, Stadt", 1, "g"],
  ["14729999", "Neuort", 1, "n"],
  ["16055000", "Weimar, Stadt", 3, "g"],
  ["16055100", "Muster-Insel", 5, "i"],
  ["07138070", "Köln-Test", 3, "g"],
];
const DATEN = (extra: GemeindeZeile[] = []): MietstufenDaten => ({
  meta: {
    rechtsgrundlage: "Test",
    anlage: { titel: "a", url: "u", abruf: "2026-10-08", sha256: "0" },
    gemeindeverzeichnis_basis: { titel: "b", url: "u", abruf: "2026-10-08", sha256: "0", gebietsstand: "31.12.2020" },
    gemeindeverzeichnis_aktuell: { titel: "c", url: "u", abruf: "2026-10-08", sha256: "0", gebietsstand: "31.12.2025" },
    hinweis: "",
    anzahl: { anlage_zeilen: 0, gemeinden: GEMEINDEN.length + extra.length, kreise: 0, je_herkunft: { g: 0, k: 0, i: 0, n: 0 } },
  },
  laender: LAENDER,
  kreise: KREISE,
  gemeinden: [...GEMEINDEN, ...extra],
});
const suche = erzeugeSuche(DATEN());

function eindeutig(e: SuchErgebnis) {
  if (e.status !== "eindeutig") throw new Error(`erwartet eindeutig, war ${e.status}: ${JSON.stringify(e)}`);
  return e.treffer;
}
const namen = (e: SuchErgebnis) => (e.status === "mehrdeutig" ? e.kandidaten : e.status === "nicht_gefunden" ? e.aehnlich : []).map((k) => k.gemeinde);

describe("Ortssuche: eindeutige Treffer", () => {
  it("findet den Ort mit und ohne Zusatz, in jeder Groß- und Kleinschreibung", () => {
    for (const eingabe of ["Leipzig", "leipzig", "LEIPZIG", "Leipzig, Stadt", "Stadt Leipzig", "  Leipzig  "]) {
      const t = eindeutig(suche({ gemeinde: eingabe }));
      expect([t.gemeinde, t.mietstufe]).toEqual(["Leipzig, Stadt", 2]);
    }
  });

  it("ß, Umlaute und Umschreibungen: Köln-Test / Koeln-Test, München / Muenchen / Munchen", () => {
    expect(eindeutig(suche({ gemeinde: "Muenchen" })).gemeinde).toBe("München, Landeshauptstadt");
    expect(eindeutig(suche({ gemeinde: "MÜNCHEN" })).gemeinde).toBe("München, Landeshauptstadt");
    expect(eindeutig(suche({ gemeinde: "Munchen" })).gemeinde).toBe("München, Landeshauptstadt");
    expect(eindeutig(suche({ gemeinde: "Koeln-Test" })).gemeinde).toBe("Köln-Test");
  });

  it("Abkürzungen des Verzeichnisses: „Landau an der Isar“ findet „Landau a.d.Isar, St“", () => {
    expect(eindeutig(suche({ gemeinde: "Landau an der Isar" })).gemeinde).toBe("Landau a.d.Isar, St");
    expect(eindeutig(suche({ gemeinde: "Pfaffenhofen an der Ilm" })).mietstufe).toBe(4);
  });

  it("Ausgabe nennt Kreis, Land und die Quelle der Stufe", () => {
    expect(eindeutig(suche({ gemeinde: "Süderbrarup" }))).toEqual({
      gemeinde: "Süderbrarup",
      kreis: "Schleswig-Flensburg",
      land: "Schleswig-Holstein",
      mietstufe: 1,
      quelle: "WoGV-Anlage, Kreistabelle Schleswig-Holstein: Schleswig-Flensburg (Gemeinde nicht gesondert aufgeführt, Vorbemerkung der Anlage)",
    });
    expect(eindeutig(suche({ gemeinde: "Leipzig" })).quelle).toBe("WoGV-Anlage, Gemeindetabelle Sachsen");
    expect(eindeutig(suche({ gemeinde: "Muster-Insel" })).quelle).toBe("WoGV-Anlage, Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG)");
    const neu = eindeutig(suche({ gemeinde: "Neuort" }));
    expect(neu.mietstufe).toBe(1);
    expect(neu.quelle).toContain("Annahme");
    expect(neu.quelle).toContain("Gemeindeverzeichnis 31.12.2020");
  });
});

describe("Ortssuche: mehrdeutig (Spec 3.3, Test 6)", () => {
  it("„Neustadt“ gibt es als Klammer-Name mehrfach: Kandidatenliste statt Raten", () => {
    const e = suche({ gemeinde: "Neustadt" });
    expect(e.status).toBe("mehrdeutig");
    expect(namen(e)).toEqual(["Neustadt (Hessen), Stadt", "Neustadt (Wied)"]);
  });

  it("Land oder Kreis machen den Treffer eindeutig, auch als Kürzel und Landkreis-Schreibweise", () => {
    expect(eindeutig(suche({ gemeinde: "Neustadt", land: "Hessen" })).gemeinde).toBe("Neustadt (Hessen), Stadt");
    expect(eindeutig(suche({ gemeinde: "Neustadt", land: "HE" })).gemeinde).toBe("Neustadt (Hessen), Stadt");
    expect(eindeutig(suche({ gemeinde: "Neustadt", land: "rp" })).gemeinde).toBe("Neustadt (Wied)");
    expect(eindeutig(suche({ gemeinde: "Neustadt", kreis: "Landkreis Neuwied" })).gemeinde).toBe("Neustadt (Wied)");
    expect(eindeutig(suche({ gemeinde: "Weimar", land: "Freistaat Thüringen" })).mietstufe).toBe(3);
  });

  it("Weimar: Stadt in Thüringen (III) und Weimar (Lahn) in Hessen (I) sind zwei verschiedene Orte", () => {
    const e = suche({ gemeinde: "Weimar" });
    expect(e.status).toBe("mehrdeutig");
    expect(e.status === "mehrdeutig" ? e.kandidaten.map((k) => [k.land, k.mietstufe]) : []).toEqual([["Hessen", 1], ["Thüringen", 3]]);
  });

  it("Frankfurt: nur über den Klammerzusatz gefunden, aber ein Ort beginnt mit dem Namen – beide kommen", () => {
    const e = suche({ gemeinde: "Frankfurt" });
    expect(e.status).toBe("mehrdeutig");
    expect(namen(e)).toEqual(["Frankfurt (Oder), Stadt", "Frankfurt am Main, Stadt"].sort());
  });

  it("Leipzig Stadt gegen Leipzig Kreis: die Stadt hat II, die Gemeinde Borna im Landkreis I", () => {
    expect(eindeutig(suche({ gemeinde: "Leipzig" })).mietstufe).toBe(2);
    expect(eindeutig(suche({ gemeinde: "Borna", kreis: "Landkreis Leipzig" })).mietstufe).toBe(1);
    // Der Kreisvergleich ignoriert „Landkreis/Kreis/Stadt“: Stadt und Landkreis Leipzig heißen für ihn gleich.
    // Das schadet nicht, weil die kreisfreie Stadt nur eine Gemeinde hat; Borna bleibt eindeutig.
    expect(eindeutig(suche({ gemeinde: "Borna", kreis: "Leipzig, Stadt" })).mietstufe).toBe(1);
  });

  it("Ausreißer im Kreis behält seine eigene Stufe: Taufkirchen II im Kreis München", () => {
    expect(eindeutig(suche({ gemeinde: "Taufkirchen", kreis: "München" })).mietstufe).toBe(2);
  });

  it(`Ergebnislisten sind auf ${MAX_KANDIDATEN} Einträge begrenzt, die Gesamtzahl steht in anzahl`, () => {
    const viele: GemeindeZeile[] = Array.from({ length: 30 }, (_, i) => [`07138${String(100 + i).padStart(3, "0")}`, `Zell (Ort ${String(i).padStart(2, "0")})`, 1, "k"]);
    const e = erzeugeSuche(DATEN(viele))({ gemeinde: "Zell" });
    expect(e.status).toBe("mehrdeutig");
    if (e.status === "mehrdeutig") {
      expect(e.anzahl).toBe(30);
      // Literal statt Konstante: der Test soll rot werden, wenn jemand die Grenze verschiebt.
      expect(e.kandidaten).toHaveLength(25);
    }
  });
});

describe("Ortssuche: nicht gefunden mit ähnlichen Namen", () => {
  it("Teilname ist nie ein eindeutiger Treffer, sondern ein Vorschlag", () => {
    const e = suche({ gemeinde: "Frankfurt am" });
    expect(e.status).toBe("nicht_gefunden");
    expect(namen(e)).toEqual(["Frankfurt am Main, Stadt"]);
    expect(namen(suche({ gemeinde: "Pfaffenhofen" }))).toEqual(["Pfaffenhofen a.d.Ilm, St"]);
  });

  it("Tippfehler: Abstand 2 ab fünf Buchstaben, Abstand 1 bei vier, darunter nichts", () => {
    expect(namen(suche({ gemeinde: "Muenchne" }))).toEqual(["München, Landeshauptstadt"]);
    expect(namen(suche({ gemeinde: "Leipzog" }))).toEqual(["Leipzig, Stadt"]);
    expect(namen(suche({ gemeinde: "Borma" }))).toEqual(["Borna, Stadt"]);
    expect(namen(suche({ gemeinde: "Born" }))).toEqual(["Borna, Stadt"]);
    expect(suche({ gemeinde: "Bxr" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
    expect(suche({ gemeinde: "Atlantis" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
  });

  it("Grenzfälle des Tippfehler-Abstands: genau eins über der Grenze gibt keinen Vorschlag", () => {
    // Fünf oder mehr Zeichen: Abstand 3 ist zu weit (Borna -> Bxxxa, Leipzig -> Leiaaag), Abstand 2 reicht.
    expect(suche({ gemeinde: "Bxxxa" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
    expect(suche({ gemeinde: "Leiaaag" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
    expect(namen(suche({ gemeinde: "Bxxna" }))).toEqual(["Borna, Stadt"]);
    expect(namen(suche({ gemeinde: "Leiaazig" }))).toEqual(["Leipzig, Stadt"]);
    // Genau vier Zeichen: Abstand 2 ist zu weit (Borna -> Bxna), Abstand 1 reicht.
    expect(suche({ gemeinde: "Bxna" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
    expect(namen(suche({ gemeinde: "Bona" }))).toEqual(["Borna, Stadt"]);
  });

  it(`höchstens ${MAX_AEHNLICH} Vorschläge, leere Eingabe ergibt nichts`, () => {
    const viele: GemeindeZeile[] = Array.from({ length: 12 }, (_, i) => [`07138${String(200 + i).padStart(3, "0")}`, `Berg an der Nr ${String(i).padStart(2, "0")}`, 1, "k"]);
    const e = erzeugeSuche(DATEN(viele))({ gemeinde: "Berg an" });
    expect(e.status === "nicht_gefunden" ? e.aehnlich : []).toHaveLength(5);
    expect(suche({ gemeinde: "" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
    expect(suche({ gemeinde: "   ,  " })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
  });

  it("Land oder Kreis, in dem es den Ort nicht gibt, ergibt nicht gefunden statt eines Treffers aus einem anderen Land", () => {
    expect(suche({ gemeinde: "Leipzig", land: "Bayern" }).status).toBe("nicht_gefunden");
    expect(suche({ gemeinde: "Leipzig", kreis: "Neuwied" }).status).toBe("nicht_gefunden");
  });
});
