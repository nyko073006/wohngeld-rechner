import { inflateRawSync } from "node:zlib";

// Minimaler Leser für .xlsx (ZIP mit XML), nur das, was die Gemeindeverzeichnisse brauchen:
// Blattnamen, Zeichenketten und Zellwerte als Text. Keine Formeln, keine Datumsformate.
export interface Blatt {
  name: string;
  zeilen: (string | null)[][];
}

const ENDE_SIGNATUR = 0x06054b50;
const ZENTRAL_SIGNATUR = 0x02014b50;

export function entitaeten(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function zipEintraege(buf: Buffer): Map<string, Buffer> {
  let ende = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === ENDE_SIGNATUR) {
      ende = i;
      break;
    }
  }
  if (ende < 0) throw new Error("Keine ZIP-Datei: Verzeichnisende fehlt");
  const anzahl = buf.readUInt16LE(ende + 10);
  let pos = buf.readUInt32LE(ende + 16);
  const eintraege = new Map<string, Buffer>();
  for (let k = 0; k < anzahl; k++) {
    if (buf.readUInt32LE(pos) !== ZENTRAL_SIGNATUR) throw new Error("ZIP-Verzeichnis beschädigt");
    const methode = buf.readUInt16LE(pos + 10);
    const groesse = buf.readUInt32LE(pos + 20);
    const namenLaenge = buf.readUInt16LE(pos + 28);
    const extraLaenge = buf.readUInt16LE(pos + 30);
    const kommentarLaenge = buf.readUInt16LE(pos + 32);
    const lokal = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf8", pos + 46, pos + 46 + namenLaenge);
    const start = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28);
    const roh = buf.subarray(start, start + groesse);
    if (methode !== 0 && methode !== 8) throw new Error(`ZIP-Methode ${methode} nicht unterstützt (${name})`);
    eintraege.set(name, methode === 0 ? roh : inflateRawSync(roh));
    pos += 46 + namenLaenge + extraLaenge + kommentarLaenge;
  }
  return eintraege;
}

function spaltenIndex(buchstaben: string): number {
  let n = 0;
  for (const c of buchstaben) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

function lesBlatt(xml: string, zeichenketten: string[]): (string | null)[][] {
  const zeilen: (string | null)[][] = [];
  for (const zeile of xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
    const zellen: (string | null)[] = [];
    for (const z of (zeile[1] ?? "").matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const art = /t="(\w+)"/.exec(z[2] ?? "")?.[1];
      const inhalt = z[3] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(inhalt)?.[1];
      let wert: string | null = null;
      if (art === "inlineStr") {
        const t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inhalt)?.[1];
        wert = t === undefined ? null : entitaeten(t);
      } else if (v !== undefined) {
        wert = art === "s" ? (zeichenketten[Number(v)] ?? null) : entitaeten(v);
      }
      const spalte = spaltenIndex(z[1] ?? "A");
      while (zellen.length < spalte) zellen.push(null);
      zellen[spalte] = wert;
    }
    zeilen.push(zellen);
  }
  return zeilen;
}

// Liest alle Blätter in der Reihenfolge der Datei (xl/worksheets/sheet1.xml, sheet2.xml, ...).
export function leseXlsx(daten: Buffer): Blatt[] {
  const eintraege = zipEintraege(daten);
  const text = (pfad: string): string => {
    const e = eintraege.get(pfad);
    if (!e) throw new Error(`xlsx: ${pfad} fehlt`);
    return e.toString("utf8");
  };
  const zeichenketten = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((si) =>
    entitaeten([...(si[1] ?? "").matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1] ?? "").join("")),
  );
  const namen = [...text("xl/workbook.xml").matchAll(/<sheet [^>]*name="([^"]*)"/g)].map((m) => entitaeten(m[1] ?? ""));
  return namen.map((name, i) => ({ name, zeilen: lesBlatt(text(`xl/worksheets/sheet${i + 1}.xml`), zeichenketten) }));
}
