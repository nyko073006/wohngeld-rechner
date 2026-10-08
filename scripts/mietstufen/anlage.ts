import type { Mietstufe } from "../../src/rechtsstand/typen";
import { entitaeten } from "./xlsx";

// Anlage zu § 1 Abs. 3 WoGV (https://www.gesetze-im-internet.de/wogv/anlage.html).
// Die Seite hat je Land eine Gemeindetabelle und meist eine Kreistabelle, dazu am Ende eine
// Tabelle "Gemeinsame Mietenstufe" für die Inseln ohne Festlandanschluss (ohne Land).
export type AnlageArt = "gemeinde" | "kreis" | "insel";

export interface AnlageZeile {
  land: string | null; // null nur bei der Inselzeile
  art: AnlageArt;
  name: string; // wörtlich, mit Tippfehlern der Anlage ("Landeshaupstadt", "Phillipsburg")
  stufe: Mietstufe;
}

const STUFEN: Record<string, Mietstufe> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };

const text = (html: string): string => entitaeten(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

// Die Kopfzeile "Gemeinde|Kreis|Gemeinsame Mietenstufe: | Mietenstufe" steht meist im <thead>,
// bei der Kreistabelle von Rheinland-Pfalz aber als erste Zeile im <tbody>. Deshalb zählt
// immer die erste Zeile jeder Tabelle als Kopf.
export function parseAnlage(html: string): AnlageZeile[] {
  const ergebnis: AnlageZeile[] = [];
  let land: string | null = null;
  const muster = /Land:<\/span>(?:&#160;|\s)*<span[^>]*>([^<]*)<\/span>|<table[\s\S]*?<\/table>/g;
  for (const treffer of html.matchAll(muster)) {
    if (treffer[1] !== undefined) {
      land = text(treffer[1]);
      continue;
    }
    const zeilen = [...treffer[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((tr) =>
      [...tr[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1] ?? "")),
    );
    const kopf = zeilen[0];
    if (!kopf || kopf[1] !== "Mietenstufe") throw new Error("Anlage: erste Tabellenzeile ist kein Kopf");
    const erste = kopf[0] ?? "";
    const art: AnlageArt | null = erste === "Gemeinde" ? "gemeinde" : erste === "Kreis" ? "kreis" : erste.startsWith("Gemeinsame") ? "insel" : null;
    if (!art) throw new Error(`Anlage: unbekannte Tabelle "${erste}"`);
    if (art !== "insel" && land === null) throw new Error("Anlage: Tabelle vor der ersten Länderüberschrift");
    for (const zeile of zeilen.slice(1)) {
      const name = zeile[0];
      const stufe = zeile.length === 2 ? STUFEN[zeile[1] ?? ""] : undefined;
      if (!name || stufe === undefined) throw new Error(`Anlage: Zeile nicht lesbar: ${JSON.stringify(zeile)}`);
      ergebnis.push({ land: art === "insel" ? null : land, art, name, stufe });
    }
  }
  return ergebnis;
}
