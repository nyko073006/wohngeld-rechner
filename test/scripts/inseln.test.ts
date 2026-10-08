import { describe, expect, it } from "vitest";
import { ladeEingabe } from "../../scripts/mietstufen/eingabe";
import { INSEL_GEMEINDEN, erzeugeMietstufen } from "../../scripts/mietstufen/erzeugen";
import { parseInselnAusGesetz } from "../../scripts/mietstufen/inseln";
import { leseQuellen, leseRohdatei } from "../../scripts/mietstufen/quellen";

const eingabe = ladeEingabe();
const ergebnis = erzeugeMietstufen(eingabe);
const { daten } = ergebnis;

describe("Inseln ohne Festlandanschluss: Abgleich mit § 12 Abs. 4a WoGG und dem Verzeichnis", () => {
  const genannt = parseInselnAusGesetz(leseRohdatei(leseQuellen().wogg_12).toString("latin1"));

  it("das Gesetz nennt 28 Gemeinden, die Liste im Code ist wortgleich und in derselben Reihenfolge", () => {
    expect(genannt).toHaveLength(28);
    expect(INSEL_GEMEINDEN.map((i) => i.gesetz)).toEqual(genannt);
  });

  it("jede Insel-AGS trägt im Verzeichnis den Namen aus dem Gesetz (ohne Klammer- und Kommazusatz)", () => {
    const name = (ags: string) => eingabe.aktuell.gemeinden.find((g) => g.ags === ags)?.name ?? "";
    const kern = (s: string) => (s.split(",")[0] ?? "").replace(/\s*\(.*\)/, "").trim();
    for (const i of INSEL_GEMEINDEN) expect(kern(name(i.ags)), i.gesetz).toBe(kern(i.gesetz));
  });

  it("parseInselnAusGesetz bricht ab, wenn der Absatz fehlt", () => {
    expect(() => parseInselnAusGesetz("<div>(4) etwas anderes</div>")).toThrow(/Absatz 4a/);
    expect(() => parseInselnAusGesetz("<div>(4a) Ohne Liste.</div>")).toThrow(/Gemeindeliste/);
  });

  it("alle 28 stehen in keiner Gemeindetabelle der Anlage und bekommen die gemeinsame Stufe der Inselzeile", () => {
    const ags = new Set(INSEL_GEMEINDEN.map((i) => i.ags));
    const inAnlage = ergebnis.verknuepfung.gemeinden.filter((z) => ags.has(z.ags));
    expect(inAnlage).toEqual([]);
    expect(daten.gemeinden.filter((g) => ags.has(g[0])).every((g) => g[2] === 5 && g[3] === "i")).toBe(true);
  });
});
