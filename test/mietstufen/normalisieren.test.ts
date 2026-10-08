import { describe, expect, it } from "vitest";
import { abstand, gemeindeSchluessel, kreisSchluessel, lockerSchluessel, normalisiere, ohneTitel } from "../../src/mietstufen/normalisieren";

describe("normalisiere: Schreibweisen der Eingabe", () => {
  it("Groß- und Kleinschreibung, ß, Umlaute und Satzzeichen (Spec 3.3)", () => {
    expect(normalisiere("München")).toBe("muenchen");
    expect(normalisiere("MUENCHEN")).toBe("muenchen");
    expect(normalisiere("Dießen")).toBe("diessen");
    expect(normalisiere("Köln")).toBe("koeln");
    expect(normalisiere("Äußere Neustadt")).toBe("aeussere neustadt");
    expect(normalisiere("Aalen,  Stadt")).toBe("aalen stadt");
    expect(normalisiere("Baden-Württemberg")).toBe("baden wuerttemberg");
  });

  it("sorbische Namensteile aus dem Verzeichnis: Akzente fallen weg, ł wird l", () => {
    expect(normalisiere("Lubin (Błota)")).toBe("lubin blota");
    expect(normalisiere("Chóśebuz")).toBe("chosebuz");
  });

  it("Abkürzungen des Gemeindeverzeichnisses werden aufgelöst (Bayern, Hessen, Niedersachsen)", () => {
    expect(normalisiere("Landau a.d.Isar")).toBe(normalisiere("Landau an der Isar"));
    expect(normalisiere("Weiden i.d.OPf.")).toBe("weiden in der oberpfalz");
    expect(normalisiere("Höchst i. Odw.")).toBe(normalisiere("Höchst im Odenwald"));
    expect(normalisiere("Hude (Oldb)")).toBe(normalisiere("Hude (Oldenburg)"));
    expect(normalisiere("St. Georgen")).toBe(normalisiere("Sankt Georgen"));
  });

  it("am und im gelten als an und in", () => {
    expect(normalisiere("Dießen a. Ammersee")).toBe(normalisiere("Dießen am Ammersee"));
    expect(normalisiere("Reichenbach im Vogtland")).toBe(normalisiere("Reichenbach in Vogtland"));
  });
});

describe("ohneTitel: nur Statusworte fallen weg", () => {
  it("Stadt, Gemeinde, Markt, Landeshauptstadt", () => {
    expect(ohneTitel("stadt aalen")).toBe("aalen");
    expect(ohneTitel("muenchen landeshauptstadt")).toBe("muenchen");
    expect(ohneTitel("markt schwaben")).toBe("schwaben");
  });

  it("„St“ bleibt, weil es Sankt heißen kann", () => {
    expect(ohneTitel(normalisiere("St. Ingbert"))).toBe("sankt ingbert");
  });
});

describe("gemeindeSchluessel: starke und schwache Schlüssel", () => {
  it("Name mit Zusatz: stark ganzer Name und Name vor dem Komma", () => {
    expect(gemeindeSchluessel("Aalen, Stadt")).toEqual({ stark: ["aalen stadt", "aalen"], schwach: [] });
  });

  it("Klammerzusatz und Schrägstrich geben schwache Schlüssel", () => {
    expect(gemeindeSchluessel("Neustadt (Hessen), Stadt")).toEqual({ stark: ["neustadt hessen stadt", "neustadt hessen"], schwach: ["neustadt"] });
    expect(gemeindeSchluessel("Neustadt/Vogtl.")).toEqual({ stark: ["neustadt vogtland"], schwach: ["neustadt"] });
  });
});

describe("kreisSchluessel", () => {
  it("Landkreis München und München sind gleich, Rhein-Neckar-Kreis bleibt unterscheidbar", () => {
    expect(kreisSchluessel("Landkreis München")).toBe(kreisSchluessel("München"));
    expect(kreisSchluessel("Leipzig, Stadt")).toBe(kreisSchluessel("Leipzig"));
    expect(kreisSchluessel("Rhein-Neckar-Kreis")).toBe("rhein neckar");
  });
});

describe("lockerSchluessel und abstand", () => {
  it("Umlautschreibweisen laufen zusammen", () => {
    expect(lockerSchluessel(normalisiere("München"))).toBe(lockerSchluessel("munchen"));
  });

  it("Levenshtein-Abstand", () => {
    expect(abstand("hamburg", "hamburg")).toBe(0);
    expect(abstand("hamburk", "hamburg")).toBe(1);
    expect(abstand("muenchne", "muenchen")).toBe(2);
    expect(abstand("", "abc")).toBe(3);
  });
});
