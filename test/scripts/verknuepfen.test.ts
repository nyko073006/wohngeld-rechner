import { describe, expect, it } from "vitest";
import type { AnlageZeile } from "../../scripts/mietstufen/anlage";
import { leseAnlageRoh, leseGvRoh } from "../../scripts/mietstufen/eingabe";
import type { Gv, GvGemeinde } from "../../scripts/mietstufen/gv";
import { leseQuellen } from "../../scripts/mietstufen/quellen";
import {
  EINWOHNERSCHWELLE,
  HANDZUORDNUNG,
  findeKandidaten,
  schluesselA,
  schluesselB,
  verknuepfe,
  waehleGrosse,
} from "../../scripts/mietstufen/verknuepfen";

const g = (ags: string, name: string, textkennzeichen: string, einwohner: number | null = null): GvGemeinde => ({ ags, name, textkennzeichen, einwohner });

describe("Namensschlüssel der Verknüpfung", () => {
  it("Schlüssel A löst Abkürzungen der Anlage auf und verwirft den Zusatz nach dem Komma", () => {
    expect(schluesselA("Landau an der Isar, Stadt")).toBe(schluesselA("Landau a.d.Isar, St"));
    expect(schluesselA("Bergisch-Gladbach, Stadt")).toBe(schluesselA("Bergisch Gladbach, Stadt"));
    expect(schluesselA("Aalen, Stadt")).toBe("aalen");
    expect(schluesselA("Fürth")).toBe("fuerth");
  });

  it("Schlüssel B setzt am=an, St.=Sankt und nimmt bei zweisprachigen Namen den ersten Teil", () => {
    expect(schluesselB("Dießen a. Ammersee, Markt")).toBe(schluesselB("Dießen am Ammersee, M"));
    expect(schluesselB("Sankt Ingbert, Stadt")).toBe(schluesselB("St. Ingbert, Stadt"));
    expect(schluesselB("Bautzen / Budyšin, Stadt")).toBe(schluesselB("Bautzen, Stadt"));
  });
});

describe("findeKandidaten: Stufen A bis D", () => {
  it("A: genau ein Namensvetter genügt", () => {
    const r = findeKandidaten("Aalen, Stadt", [g("08136088", "Aalen, Stadt", "63"), g("08111000", "Stuttgart, Landeshauptstadt", "61")]);
    expect(r.verfahren).toBe("name");
    expect(r.treffer.map((t) => t.ags)).toEqual(["08136088"]);
  });

  it("B: Amberg, Stadt gegen zwei Verzeichnis-Gemeinden „Amberg“ – das Textkennzeichen trennt die kreisfreie Stadt (61) von der Gemeinde (64)", () => {
    const pool = [g("09361000", "Amberg", "61"), g("09778111", "Amberg", "64")];
    const r = findeKandidaten("Amberg, Stadt", pool);
    expect(r.verfahren).toBe("zusatzklasse");
    expect(r.treffer[0]?.ags).toBe("09361000");
  });

  it("B: Anlage-Name ohne Zusatz trifft die Gemeinde ohne Zusatz, nicht „Burgdorf, Stadt“", () => {
    const pool = [g("03158004", "Burgdorf", "64"), g("03241003", "Burgdorf, Stadt", "63")];
    expect(findeKandidaten("Burgdorf", pool).treffer[0]?.ags).toBe("03158004");
  });

  it("C: Abkürzungen („Hude (Oldenburg)“ gegen „Hude (Oldb)“) sind kein Teilname", () => {
    const r = findeKandidaten("Hude (Oldenburg)", [g("03458010", "Hude (Oldb)", "64")]);
    expect(r.verfahren).toBe("abkuerzung");
  });

  it("D: Teilname nur ab 5 Zeichen und nur mit genau einem Treffer", () => {
    expect(findeKandidaten("Senftenberg, Stadt", [g("12066304", "Senftenberg/Zły Komorow, Stadt", "63")]).verfahren).toBe("teilname");
    expect(findeKandidaten("Aue", [g("14521035", "Aue-Bad Schlema, Stadt", "63")]).verfahren).toBeNull();
    const zwei = findeKandidaten("Neustadt", [g("1", "Neustadt (Hessen), Stadt", "63"), g("2", "Neustadt (Wied)", "64")]);
    expect(zwei.verfahren).toBeNull();
    expect(zwei.treffer).toHaveLength(2);
  });
});

describe("waehleGrosse: Schwelle 10.000 Einwohner (§ 12 Abs. 3 Satz 1 Nr. 1 WoGG: „10 000 und mehr“)", () => {
  it("die Schwelle selbst zählt, 9.999 nicht", () => {
    expect(EINWOHNERSCHWELLE).toBe(10_000);
    expect(waehleGrosse([g("1", "A", "64", 10_000), g("2", "A", "64", 9_999)])?.ags).toBe("1");
    expect(waehleGrosse([g("1", "A", "64", 9_999), g("2", "A", "64", 100)])).toBeNull();
  });

  it("zwei große Namensvettern oder fehlende Einwohnerzahl ergeben keinen Treffer", () => {
    expect(waehleGrosse([g("1", "A", "64", 12_000), g("2", "A", "64", 15_000)])).toBeNull();
    expect(waehleGrosse([g("1", "A", "64", null), g("2", "A", "64", 50)])).toBeNull();
  });
});

describe("verknuepfe: Anlage gegen Gemeindeverzeichnis 31.12.2020 (echte Daten)", () => {
  const q = leseQuellen();
  const anlage = leseAnlageRoh(q.anlage);
  const basis = leseGvRoh(q.gv_basis);
  const erg = verknuepfe(anlage, basis);
  const nachVerfahren = (liste: { verfahren: string }[]) => {
    const z: Record<string, number> = {};
    for (const x of liste) z[x.verfahren] = (z[x.verfahren] ?? 0) + 1;
    return z;
  };

  it("alle 1.601 Gemeinden und 279 Kreise sind zugeordnet, nichts bleibt offen (Spec 3.3: Rest von Hand)", () => {
    expect(erg.gemeinden).toHaveLength(1601);
    expect(erg.kreise).toHaveLength(279);
    expect(erg.offen).toEqual([]);
  });

  it("Verfahren: Gemeinden 1.554 Name, 5 Zusatzklasse, 18 Abkürzung, 15 Teilname, 3 Einwohner, 6 Hand; Kreise 273/3/3", () => {
    expect(nachVerfahren(erg.gemeinden)).toEqual({ name: 1554, zusatzklasse: 5, abkuerzung: 18, teilname: 15, einwohner: 3, hand: 6 });
    expect(nachVerfahren(erg.kreise)).toEqual({ name: 273, abkuerzung: 3, hand: 3 });
  });

  it("keine zwei Anlage-Zeilen landen auf derselben Gemeinde oder demselben Kreis", () => {
    expect(new Set(erg.gemeinden.map((x) => x.ags)).size).toBe(1601);
    expect(new Set(erg.kreise.map((x) => x.kkz)).size).toBe(279);
  });

  it("jede zugeordnete Gemeinde liegt im Land der Anlage und existiert im Verzeichnis", () => {
    const ags = new Set(basis.gemeinden.map((x) => x.ags));
    const landPraefix: Record<string, string> = { Bayern: "09", Hessen: "06", Sachsen: "14", "Baden-Württemberg": "08", Brandenburg: "12", Niedersachsen: "03" };
    for (const z of erg.gemeinden) {
      expect(ags.has(z.ags)).toBe(true);
      const praefix = landPraefix[z.zeile.land ?? ""];
      if (praefix) expect(z.ags.startsWith(praefix)).toBe(true);
    }
  });

  it("Gegenprobe über die Einwohnerzahl: jede Anlage-Gemeinde hat im Verzeichnis mindestens 9.900 Einwohner", () => {
    // Die Anlage führt nur Gemeinden ab 10.000 einzeln. Ein falscher Namensvetter (Taufkirchen Kreis
    // Mühldorf mit rund 2.900) fiele hier durch. Der Stichtag der Anlage (30.09.2020) liegt nicht im
    // Verzeichnis, deshalb 1 % Toleranz; im Bestand liegt das Minimum bei 9.947 (Neustadt (Hessen)).
    const ew = new Map(basis.gemeinden.map((x) => [x.ags, x.einwohner ?? 0]));
    const klein = erg.gemeinden.filter((z) => (ew.get(z.ags) ?? 0) < 9_900);
    expect(klein.map((z) => z.zeile.name)).toEqual([]);
    expect(Math.min(...erg.gemeinden.map((z) => ew.get(z.ags) ?? 0))).toBe(9_947);
  });

  it("Handfälle und die drei Einwohner-Fälle treffen den erwarteten AGS", () => {
    const ags = (land: string, name: string) => erg.gemeinden.find((z) => z.zeile.land === land && z.zeile.name === name)?.ags;
    expect(ags("Baden-Württemberg", "Weingarten, Baden")).toBe("08215090");
    expect(ags("Baden-Württemberg", "Weingarten, Stadt")).toBe("08436082");
    expect(ags("Baden-Württemberg", "Malsch")).toBe("08215046");
    expect(ags("Bayern", "Eching")).toBe("09178120");
    expect(ags("Bayern", "Taufkirchen")).toBe("09184145");
    expect(ags("Sachsen", "Leipzig, Stadt")).toBe("14713000");
    expect(erg.kreise.find((z) => z.zeile.land === "Sachsen" && z.zeile.name === "Leipzig")?.kkz).toBe("14729");
  });
});

describe("verknuepfe: Fehlerfälle", () => {
  const basis: Gv = { gebietsstand: "31.12.2020", vermerk: "", kreise: [], gemeinden: [g("01001000", "Flensburg, Stadt", "61", 90000)] };
  const zeile = (name: string): AnlageZeile => ({ land: "Schleswig-Holstein", art: "gemeinde", name, stufe: 3 });

  it("unbekannter Name bleibt offen und wird nicht geraten", () => {
    const r = verknuepfe([zeile("Atlantis, Stadt")], basis, []);
    expect(r.gemeinden).toEqual([]);
    expect(r.offen).toHaveLength(1);
  });

  it("veraltete Handzuordnung (Zeile gibt es nicht mehr) bricht ab", () => {
    const hand = [{ land: "Schleswig-Holstein", art: "gemeinde" as const, name: "Atlantis, Stadt", schluessel: "01001000", grund: "Test" }];
    expect(() => verknuepfe([zeile("Flensburg, Stadt")], basis, hand)).toThrow(/ohne Anlagezeile/);
  });

  it("Handzuordnung auf einen Schlüssel, den es im Verzeichnis nicht gibt, bricht ab", () => {
    const hand = [{ land: "Schleswig-Holstein", art: "gemeinde" as const, name: "Atlantis, Stadt", schluessel: "01999999", grund: "Test" }];
    expect(() => verknuepfe([zeile("Atlantis, Stadt")], basis, hand)).toThrow(/fehlt im Verzeichnis/);
  });

  it("alle neun Handzuordnungen tragen eine Begründung", () => {
    expect(HANDZUORDNUNG).toHaveLength(9);
    expect(HANDZUORDNUNG.every((h) => h.grund.length > 10)).toBe(true);
  });
});
