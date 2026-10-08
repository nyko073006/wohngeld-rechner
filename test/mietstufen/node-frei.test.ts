import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Spec Abschnitt 3: Mietstufen sind ohne Server testbar und Node-frei, damit sie auf Workers und
// später im Widget laufen. Abhängigkeiten laufen nur `mietstufen -> rechtsstand` (Typen).
const VERZEICHNIS = resolve(import.meta.dirname, "..", "..", "src", "mietstufen");
const ERLAUBTE_IMPORTE = /^(\.\/[a-z]+|\.\.\/rechtsstand\/typen|\.\.\/\.\.\/data\/mietstufen-2023\.json)$/;

function verstoesse(quelltext: string): string[] {
  const funde: string[] = [];
  const ohneKommentare = quelltext.replace(/\/\/.*$/gm, "");
  for (const muster of [/\bprocess\./, /\bBuffer\b/, /\brequire\(/, /\bimport\(/, /\bfetch\(/]) {
    if (muster.test(ohneKommentare)) funde.push(`verbotener Ausdruck ${muster}`);
  }
  // `from "x"` (import und re-export) sowie `import "x"` ohne Bindung (Seiteneffekt-Import)
  for (const m of ohneKommentare.matchAll(/\b(?:from|import)\s*["']([^"']+)["']/g)) {
    const ziel = m[1] ?? "";
    if (!ERLAUBTE_IMPORTE.test(ziel)) funde.push(`Import ${ziel}`);
  }
  return funde;
}

describe("src/mietstufen ist Node-frei und hängt nur an rechtsstand/typen", () => {
  const dateien = readdirSync(VERZEICHNIS).filter((d) => d.endsWith(".ts"));

  it("es gibt die vier Quelldateien", () => {
    expect(dateien.sort()).toEqual(["daten.ts", "normalisieren.ts", "suche.ts", "typen.ts"].sort());
  });

  for (const datei of dateien) {
    it(`${datei} hat keine Node-Importe und keine Importe aus engine, server oder scripts`, () => {
      expect(verstoesse(readFileSync(resolve(VERZEICHNIS, datei), "utf8"))).toEqual([]);
    });
  }

  it("Gegenprobe: der Prüfer erkennt Node-Importe, Fremdimporte und Netzzugriffe", () => {
    expect(verstoesse('import { readFileSync } from "node:fs";')).toHaveLength(1);
    expect(verstoesse('import { berechneWohngeld } from "../engine/berechnen";')).toHaveLength(1);
    expect(verstoesse('import x from "../../scripts/mietstufen/gv";')).toHaveLength(1);
    expect(verstoesse("const b = Buffer.from('x');")).toHaveLength(1);
    expect(verstoesse('import "node:fs";')).toHaveLength(1);
    expect(verstoesse('export * from "node:path";')).toHaveLength(1);
    expect(verstoesse('import { a } from "./suche"; // process.env im Kommentar')).toEqual([]);
    expect(verstoesse('import rohdaten from "../../data/mietstufen-2023.json";')).toEqual([]);
  });
});
