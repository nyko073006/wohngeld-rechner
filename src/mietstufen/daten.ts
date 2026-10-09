import rohdaten from "../../data/mietstufen-2023.json";
import { MIETSTUFEN } from "../rechtsstand/typen";
import type { Mietstufe } from "../rechtsstand/typen";
import { erzeugeSuche } from "./suche";
import { HERKUENFTE, type GemeindeZeile, type Herkunft, type MietstufenDaten, type SuchEingabe, type SuchErgebnis } from "./typen";

const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

// Prüft die eingecheckte Datei beim Laden des Moduls (der Suchindex entsteht erst beim ersten Aufruf).
// Eine kaputte Datei soll laut scheitern, nicht still falsche Stufen liefern.
export function pruefeMietstufenDaten(roh: unknown): MietstufenDaten {
  if (!istObjekt(roh) || !istObjekt(roh.meta) || !istObjekt(roh.laender) || !istObjekt(roh.kreise) || !Array.isArray(roh.gemeinden)) {
    throw new Error("Mietstufen-Daten: Aufbau stimmt nicht (meta, laender, kreise, gemeinden)");
  }
  const laender = roh.laender as Record<string, string>;
  const kreise = roh.kreise as Record<string, string>;
  const gemeinden: GemeindeZeile[] = [];
  const gesehen = new Set<string>();
  for (const zeile of roh.gemeinden as unknown[]) {
    if (!Array.isArray(zeile) || zeile.length !== 4) throw new Error(`Mietstufen-Daten: Zeile ${JSON.stringify(zeile)} hat nicht vier Felder`);
    const [ags, name, stufe, herkunft] = zeile as unknown[];
    if (typeof ags !== "string" || !/^\d{8}$/.test(ags)) throw new Error(`Mietstufen-Daten: AGS ${String(ags)} ungültig`);
    if (gesehen.has(ags)) throw new Error(`Mietstufen-Daten: AGS ${ags} doppelt`);
    gesehen.add(ags);
    if (typeof name !== "string" || name === "") throw new Error(`Mietstufen-Daten: Name bei ${ags} fehlt`);
    if (typeof stufe !== "number" || !MIETSTUFEN.includes(stufe as Mietstufe)) throw new Error(`Mietstufen-Daten: Stufe ${String(stufe)} bei ${ags} ungültig`);
    if (typeof herkunft !== "string" || !HERKUENFTE.includes(herkunft as Herkunft)) throw new Error(`Mietstufen-Daten: Herkunft ${String(herkunft)} bei ${ags} ungültig`);
    if (laender[ags.slice(0, 2)] === undefined) throw new Error(`Mietstufen-Daten: Land ${ags.slice(0, 2)} bei ${ags} unbekannt`);
    if (kreise[ags.slice(0, 5)] === undefined) throw new Error(`Mietstufen-Daten: Kreis ${ags.slice(0, 5)} bei ${ags} unbekannt`);
    gemeinden.push([ags, name, stufe as Mietstufe, herkunft as Herkunft]);
  }
  return { meta: roh.meta as unknown as MietstufenDaten["meta"], laender, kreise, gemeinden };
}

export const MIETSTUFEN_DATEN: MietstufenDaten = pruefeMietstufenDaten(rohdaten);

let suche: ((eingabe: SuchEingabe) => SuchErgebnis) | undefined;

// Ortssuche über die eingecheckten Daten (Spec 3.3 und 4 `mietstufe_finden`).
export function sucheMietstufe(eingabe: SuchEingabe): SuchErgebnis {
  suche ??= erzeugeSuche(MIETSTUFEN_DATEN);
  return suche(eingabe);
}
