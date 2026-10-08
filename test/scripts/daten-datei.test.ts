import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ladeEingabe } from "../../scripts/mietstufen/eingabe";
import { erzeugeMietstufen, serialisiere } from "../../scripts/mietstufen/erzeugen";
import { DATEI_DATEN, leseQuellen } from "../../scripts/mietstufen/quellen";

const { daten } = erzeugeMietstufen(ladeEingabe());

describe("Mietstufen-Daten: Nachweise und Regenerierbarkeit", () => {
  it("die eingecheckte Datei ist Byte für Byte das Ergebnis des Skripts aus den Rohdaten", () => {
    expect(readFileSync(DATEI_DATEN, "utf8")).toBe(serialisiere(daten));
  });

  it("Kopf nennt Quellen mit Prüfsumme und Gebietsstand und kennzeichnet die Daten als verändert (Lizenzbericht)", () => {
    const q = leseQuellen();
    expect(daten.meta.anlage.sha256).toBe(q.anlage.sha256);
    expect(daten.meta.gemeindeverzeichnis_basis).toMatchObject({ gebietsstand: "31.12.2020", sha256: q.gv_basis.sha256 });
    expect(daten.meta.gemeindeverzeichnis_aktuell).toMatchObject({ gebietsstand: "31.12.2025", sha256: q.gv_aktuell.sha256 });
    expect(daten.meta.hinweis).toContain("Statistisches Bundesamt (Destatis)");
    expect(daten.meta.hinweis).toContain("Vervielfältigung und Verbreitung mit Quellenangabe gestattet");
    expect(daten.meta.hinweis).toContain("verändert dargestellt");
    expect(daten.meta.hinweis).toContain("MIT-Lizenz des Repositoriums gilt nicht für diese Datei");
  });
});
