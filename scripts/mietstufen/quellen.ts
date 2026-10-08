import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { QuellenNachweis } from "../../src/mietstufen/typen";

export const WURZEL = resolve(import.meta.dirname, "..", "..");
export const ROH = resolve(WURZEL, "data", "roh");
export const DATEI_DATEN = resolve(WURZEL, "data", "mietstufen-2023.json");

// Eintrag in data/roh/quellen.json: Herkunft, Abrufdatum und Prüfsumme je Rohdatei.
export interface RohQuelle extends QuellenNachweis {
  datei: string;
}

export interface RohQuellen {
  anlage: RohQuelle;
  wogg_12: RohQuelle;
  gv_basis: RohQuelle;
  gv_aktuell: RohQuelle;
}

export const sha256 = (daten: Buffer | string): string => createHash("sha256").update(daten).digest("hex");

export function leseQuellen(): RohQuellen {
  return JSON.parse(readFileSync(resolve(ROH, "quellen.json"), "utf8")) as RohQuellen;
}

export function leseRohdatei(q: RohQuelle): Buffer {
  return readFileSync(resolve(ROH, q.datei));
}
