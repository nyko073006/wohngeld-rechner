// Vergleicht WOGG_2025 mit den Tabellen auf gesetze-im-internet.de.
// Aufruf: npm run pruefe:rechtsstand            (Vergleich)
//         npm run pruefe:rechtsstand -- --zeigen (gelesene Tabellenzeilen ausgeben)
import { WOGG_2025 } from "../src/rechtsstand";

const BASIS = "https://www.gesetze-im-internet.de/wogg/";
const zeigen = process.argv.includes("--zeigen");
let abweichungen = 0;

// Die Seiten deklarieren ISO-8859-1, enthalten aber nur ASCII; Umlaute und Leerzeichen stehen als
// numerische Entitäten (&#252;, &#160;, &#8211;) und werden hier aufgelöst.
function entitaeten(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function zeilen(seite: string): Promise<string[][]> {
  let html: string;
  try {
    const antwort = await fetch(BASIS + seite);
    if (!antwort.ok) {
      console.error(`${seite}: HTTP ${antwort.status}`);
      process.exit(2);
    }
    html = new TextDecoder("iso-8859-1").decode(await antwort.arrayBuffer());
  } catch (fehler) {
    console.error(`${seite}: nicht abrufbar (${String(fehler)})`);
    process.exit(2);
  }
  const ergebnis: string[][] = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const zellen = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      entitaeten((m[1] ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
    );
    if (zellen.length > 0) ergebnis.push(zellen);
  }
  if (ergebnis.length === 0) {
    console.error(`${seite}: keine Tabellenzeilen gefunden, Seitenaufbau geändert?`);
    process.exit(2);
  }
  if (zeigen) {
    console.log(`--- ${seite}`);
    for (const z of ergebnis) console.log(z.join(" | "));
  }
  return ergebnis;
}

// "4,797E-4" → "0.0004797"; "1.139" → "1139"; "110,40" → "110.4"
function zahl(text: string): string {
  const t = text.replace(/\s/g, "").replace(/[\u2013\u2212]/g, "-");
  // Number("") ist 0: eine leere Zelle darf nie als Zahl durchgehen, sonst besteht ein Sollwert 0 gegen nichts.
  if (t === "") return "LEER";
  const exp = t.match(/^(-?[\d,]+)E(-?\d+)$/i);
  if (exp) return normal(Number(exp[1]!.replace(",", ".")) * 10 ** Number(exp[2]));
  const wert = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(wert) ? "NaN" : normal(wert);
}
function normal(x: number): string {
  return String(Number(x.toPrecision(12)));
}

function vergleiche(name: string, soll: string | number, ist: string | undefined) {
  const s = normal(Number(soll));
  if (ist === undefined || zahl(ist) !== s) {
    abweichungen++;
    console.error(`ABWEICHUNG ${name}: Datei ${s}, Quelle ${ist === undefined ? "fehlt" : zahl(ist)}`);
  }
}

// Anlage 1: Zeilengruppen je Haushaltsgröße. Die erste Zeile einer Gruppe trägt die Größe
// (rowspan), also [Größe, Stufe, Betrag]; die Folgezeilen nur [Stufe, Betrag].
// Die Mehrbetragszeilen beginnen mit "Mehrbetrag" statt mit einer Zahl.
const STUFEN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const a1 = await zeilen("anlage_1.html");
const a1Werte = new Map<string, string>();
let gruppe = "";
for (const z of a1) {
  if (z.length === 3) gruppe = /^Mehrbetrag/i.test(z[0]!) ? "mehr" : z[0]!;
  const stufe = z.length === 3 ? z[1] : z[0];
  const betrag = z[z.length - 1];
  if (gruppe !== "" && stufe !== undefined && betrag !== undefined && STUFEN.includes(stufe)) {
    a1Werte.set(`${gruppe}|${stufe}`, betrag);
  }
}
for (const n of [1, 2, 3, 4, 5] as const) {
  for (let s = 1; s <= 7; s++) {
    vergleiche(`Anlage 1, ${n} Mitgl., Stufe ${s}`, WOGG_2025.hoechstbetraege.bis5[n][s as 1], a1Werte.get(`${n}|${STUFEN[s - 1]}`));
  }
}
for (let s = 1; s <= 7; s++) {
  vergleiche(`Anlage 1, Mehrbetrag, Stufe ${s}`, WOGG_2025.hoechstbetraege.mehrbetrag[s as 1], a1Werte.get(`mehr|${STUFEN[s - 1]}`));
}

// Anlage 2 und 3: gedreht. Kopfzeilen "1 Haushaltsmitglied | 2 Haushaltsmitglieder | ..." in zwei
// Blöcken (1 bis 6, 7 bis 12), darunter je eine Zeile mit Buchstaben (a, b, c bzw. M, Y).
function gedreht(tabelle: string[][]): Map<string, string> {
  const werte = new Map<string, string>();
  let groessen: number[] = [];
  for (const z of tabelle) {
    const kopf = z.slice(1).map((c) => c.match(/^(\d+)\s*Haushalts/i)?.[1]);
    if (kopf.length > 0 && kopf.every((k) => k !== undefined)) {
      groessen = kopf.map(Number);
    } else if (groessen.length > 0 && /^[a-z]$/i.test(z[0] ?? "")) {
      z.slice(1).forEach((c, i) => {
        if (groessen[i] !== undefined) werte.set(`${z[0]!.toLowerCase()}|${groessen[i]}`, c);
      });
    }
  }
  return werte;
}

const a2 = gedreht(await zeilen("anlage_2.html"));
for (let n = 1; n <= 12; n++) {
  const k = WOGG_2025.koeffizienten[n]!;
  vergleiche(`Anlage 2, ${n} Mitgl., a`, k.a, a2.get(`a|${n}`));
  vergleiche(`Anlage 2, ${n} Mitgl., b`, k.b, a2.get(`b|${n}`));
  vergleiche(`Anlage 2, ${n} Mitgl., c`, k.c, a2.get(`c|${n}`));
}

const a3 = gedreht(await zeilen("anlage_3.html"));
for (let n = 1; n <= 12; n++) {
  const w = WOGG_2025.mindestwerte[n]!;
  vergleiche(`Anlage 3, ${n} Mitgl., M`, w.m, a3.get(`m|${n}`));
  vergleiche(`Anlage 3, ${n} Mitgl., Y`, w.y, a3.get(`y|${n}`));
}

// § 12 Abs. 6 (vier Spalten, Gesamtbetrag in der letzten) und Abs. 7 (zwei Spalten) stehen als
// Tabellen im Text. Zeilen 1 bis 5 und "Mehrbetrag ..." werden nach Spaltenzahl getrennt.
const p12 = await zeilen("__12.html");
function p12Wert(spalten: number, beginn: string): string | undefined {
  return p12.find((z) => z.length === spalten && z[0] === beginn)?.[spalten - 1] ??
    p12.find((z) => z.length === spalten && beginn === "mehr" && /^Mehrbetrag/i.test(z[0]!))?.[spalten - 1];
}
for (const n of [1, 2, 3, 4, 5] as const) {
  vergleiche(`§ 12 Abs. 6, ${n} Mitgl.`, WOGG_2025.heizkostenentlastung.bis5[n], p12Wert(4, String(n)));
  vergleiche(`§ 12 Abs. 7, ${n} Mitgl.`, WOGG_2025.klimakomponente.bis5[n], p12Wert(2, String(n)));
}
vergleiche("§ 12 Abs. 6, Mehrbetrag", WOGG_2025.heizkostenentlastung.mehrbetrag, p12Wert(4, "mehr"));
vergleiche("§ 12 Abs. 7, Mehrbetrag", WOGG_2025.klimakomponente.mehrbetrag, p12Wert(2, "mehr"));

if (abweichungen === 0) console.log("Rechtsstand 2025 stimmt mit gesetze-im-internet.de überein.");
process.exit(abweichungen === 0 ? 0 : 1);
