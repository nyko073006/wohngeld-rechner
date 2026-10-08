import type { AnlageZeile } from "./anlage";
import type { Gv, GvGemeinde, GvKreis } from "./gv";
import { ANFANG, ENDE, vorKomma } from "../../src/mietstufen/normalisieren";

// Verknüpfung der Anlage-Zeilen (nur Name und Stufe) mit dem Gemeindeverzeichnis (AGS, Kreisschlüssel).
// Die Anlage nennt weder Schlüssel noch Kreiszugehörigkeit. Die Zuordnung läuft in Stufen vom
// strengsten zum lockersten Vergleich; alles, was dann noch nicht eindeutig ist, steht in
// HANDZUORDNUNG oder bricht den Lauf ab (Spec 3.3: nicht verwerfen, von Hand entscheiden).

// § 12 Abs. 3 Satz 1 Nr. 1 WoGG: „Einwohnerzahl von 10 000 und mehr“ wird gesondert festgestellt.
export const EINWOHNERSCHWELLE = 10_000;

export const LAENDER: Readonly<Record<string, string>> = {
  "01": "Schleswig-Holstein",
  "02": "Hamburg",
  "03": "Niedersachsen",
  "04": "Bremen",
  "05": "Nordrhein-Westfalen",
  "06": "Hessen",
  "07": "Rheinland-Pfalz",
  "08": "Baden-Württemberg",
  "09": "Bayern",
  "10": "Saarland",
  "11": "Berlin",
  "12": "Brandenburg",
  "13": "Mecklenburg-Vorpommern",
  "14": "Sachsen",
  "15": "Sachsen-Anhalt",
  "16": "Thüringen",
};

// Land (Klartext wie in der Anlage) -> zweistelliges Länderkürzel des Schlüssels, z. B. "Bayern" -> "09".
export const LAND_ZU_KUERZEL: ReadonlyMap<string, string> = new Map(Object.entries(LAENDER).map(([kuerzel, land]) => [land, kuerzel]));

export interface Handzuordnung {
  land: string;
  art: "gemeinde" | "kreis";
  name: string; // wörtlich wie in der Anlage
  schluessel: string; // AGS (8 Stellen) bei Gemeinden, Kreisschlüssel (5 Stellen) bei Kreisen
  grund: string;
}

export const HANDZUORDNUNG: readonly Handzuordnung[] = [
  { land: "Baden-Württemberg", art: "gemeinde", name: "Phillipsburg, Stadt", schluessel: "08215066", grund: "Tippfehler der Anlage, das Verzeichnis schreibt Philippsburg, Stadt" },
  { land: "Baden-Württemberg", art: "gemeinde", name: "Weingarten, Baden", schluessel: "08215090", grund: "Zusatz „Baden“ unterscheidet von Weingarten, Stadt (08436082); das Verzeichnis schreibt Weingarten (Baden)" },
  { land: "Hessen", art: "gemeinde", name: "Arolsen, Stadt", schluessel: "06635002", grund: "das Verzeichnis schreibt Bad Arolsen, Stadt" },
  { land: "Hessen", art: "gemeinde", name: "Höchst i. Odenwald", schluessel: "06437009", grund: "das Verzeichnis schreibt Höchst i. Odw." },
  { land: "Niedersachsen", art: "gemeinde", name: "Hude (Oldenburg)", schluessel: "03458010", grund: "das Verzeichnis schreibt Hude (Oldb)" },
  { land: "Sachsen", art: "gemeinde", name: "Reichenbach/Vogtl., Stadt", schluessel: "14523340", grund: "das Verzeichnis schreibt Reichenbach im Vogtland, Stadt" },
  { land: "Bayern", art: "kreis", name: "Neustadt/Aisch-Bad Windsheim", schluessel: "09575", grund: "das Verzeichnis schreibt Neustadt a.d.Aisch-Bad Windsheim" },
  { land: "Niedersachsen", art: "kreis", name: "Soltau-Fallingbostel (Heidekreis)", schluessel: "03358", grund: "Landkreis Soltau-Fallingbostel heißt seit 2011 Heidekreis" },
  { land: "Rheinland-Pfalz", art: "kreis", name: "Bitburg-Prüm", schluessel: "07232", grund: "das Verzeichnis schreibt Eifelkreis Bitburg-Prüm" },
];

export type Verfahren = "name" | "zusatzklasse" | "abkuerzung" | "teilname" | "einwohner" | "hand";

export interface GemeindeZuordnung {
  zeile: AnlageZeile;
  ags: string;
  verfahren: Verfahren;
}

export interface KreisZuordnung {
  zeile: AnlageZeile;
  kkz: string;
  verfahren: Verfahren;
}

export interface OffenerFall {
  zeile: AnlageZeile;
  kandidaten: string[]; // "Schlüssel Name"
}

export interface Verknuepfung {
  gemeinden: GemeindeZuordnung[];
  kreise: KreisZuordnung[];
  offen: OffenerFall[];
}

// ---------- Namensschlüssel ----------

const kleinOhneUmlaut = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");

type Abkuerzung = readonly [muster: string, ersatz: string, wortEnde?: true];

function regeln(liste: readonly Abkuerzung[]): [RegExp, string][] {
  return liste.map(([muster, ersatz, wortEnde]) => [new RegExp(ANFANG + muster + (wortEnde ? ENDE : ""), "gu"), ersatz]);
}

// Schlüssel A: der Name vor dem ersten Komma, Abkürzungen der Anlage wie „a. d.“ und „Rhld.“ aufgelöst.
const REGELN_A = regeln([
  ["a\\.\\s*d\\.\\s*", "an der "], ["i\\.\\s*d\\.\\s*", "in der "], ["a\\.\\s*", "an "], ["i\\.\\s*", "in "], ["b\\.\\s*", "bei "],
  ["v\\.\\s*d\\.\\s*", "vor der "], ["v\\.\\s*", "vor "], ["sankt", "st", true], ["bergstr\\.?", "bergstrasse"], ["rhld\\.?", "rheinland"],
  ["westf\\.?", "westfalen"], ["unterfr\\.?", "unterfranken"], ["ufr\\.?", "unterfranken"], ["sa\\.", "sachsen"], ["obb\\.?", "oberbayern"],
  ["ob", "oberbayern", true], ["vogtl\\.?", "vogtland"], ["erzgeb\\.?", "erzgebirge"], ["schwarzw\\.?", "schwarzwald"],
  ["meckl\\.?", "mecklenburg"], ["gem\\.?", "gemeinde"],
]);

// Schlüssel B: zusätzlich „am/im“ gleich „an/in“, mehr Landesabkürzungen, „St.“ gleich „Sankt“,
// und bei zweisprachigen Namen („Bautzen / Budyšin“) nur der erste Teil.
const REGELN_B = regeln([
  ["i\\.\\s*d\\.\\s*opf\\.?", "in der oberpfalz"], ["opf\\.?", "oberpfalz"], ["bay\\.", "bayern"], ["a\\.\\s*d\\.\\s*", "an der "],
  ["i\\.\\s*d\\.\\s*", "in der "], ["a\\.\\s*", "an "], ["i\\.\\s*", "in "], ["b\\.\\s*", "bei "], ["v\\.\\s*d\\.\\s*", "vor der "],
  ["v\\.\\s*", "vor "], ["am", "an", true], ["im", "in", true], ["bergstr\\.?", "bergstrasse"], ["weinstr\\.?", "weinstrasse"],
  ["rhld\\.?", "rheinland"], ["westf\\.?", "westfalen"], ["ufr\\.?", "unterfranken"], ["vogtl\\.?", "vogtland"],
  ["erzgeb\\.?", "erzgebirge"], ["oldb\\.?", "oldenburg"], ["st\\.\\s*", "sankt "], ["sankt", "sankt", true],
]);

function endschluessel(s: string): string {
  return s.replace(/an der/g, "ander").replace(/in der/g, "inder").replace(/[^a-z0-9]/g, "");
}

function anwenden(liste: [RegExp, string][], s: string): string {
  let r = s;
  for (const [muster, ersatz] of liste) r = r.replace(muster, ersatz);
  return r;
}

const speicherA = new Map<string, string>();
const speicherB = new Map<string, string>();

export function schluesselA(name: string): string {
  let s = speicherA.get(name);
  if (s === undefined) {
    s = endschluessel(kleinOhneUmlaut(anwenden(REGELN_A, vorKomma(name).toLowerCase())));
    speicherA.set(name, s);
  }
  return s;
}

export function schluesselB(name: string): string {
  let s = speicherB.get(name);
  if (s === undefined) {
    s = endschluessel(kleinOhneUmlaut(anwenden(REGELN_B, vorKomma(name.split(" / ")[0] ?? "").toLowerCase())));
    speicherB.set(name, s);
  }
  return s;
}

// Text hinter dem ersten Komma: „Stadt“, „Markt“, „Baden“ ... leer, wenn kein Komma da ist.
const zusatz = (name: string): string => (name.includes(",") ? name.split(",").slice(1).join(",").trim().toLowerCase() : "");

// Textkennzeichen der Gemeinden, die eine Stadt bezeichnen (Verzeichnis: 61, 62, 63, 67).
const STADT = new Set(["61", "62", "63", "67"]);

interface Kandidat {
  name: string;
  textkennzeichen: string;
}

// Stufen: A gleicher Schlüssel A; B bei mehreren die Zusatzklasse (Anlage „, Stadt“ gegen
// Stadt-Textkennzeichen); C gleicher Schlüssel B; D Teilname (einer ist Anfang des anderen,
// mindestens 5 Zeichen). Ergebnis nur mit genau einem Treffer.
export function findeKandidaten<T extends Kandidat>(name: string, pool: readonly T[]): { verfahren: Verfahren | null; treffer: T[] } {
  const a = schluesselA(name);
  const cA = pool.filter((r) => schluesselA(r.name) === a);
  if (cA.length === 1) return { verfahren: "name", treffer: cA };
  if (cA.length > 1) {
    const cB =
      zusatz(name) !== ""
        ? cA.filter((r) => STADT.has(r.textkennzeichen) || zusatz(r.name) !== "")
        : cA.filter((r) => !STADT.has(r.textkennzeichen) && zusatz(r.name) === "");
    return cB.length === 1 ? { verfahren: "zusatzklasse", treffer: cB } : { verfahren: null, treffer: cA };
  }
  const b = schluesselB(name);
  const cC = pool.filter((r) => schluesselB(r.name) === b);
  if (cC.length === 1) return { verfahren: "abkuerzung", treffer: cC };
  if (cC.length > 1) return { verfahren: null, treffer: cC };
  const cD = pool.filter((r) => b.length >= 5 && (schluesselB(r.name).startsWith(b) || b.startsWith(schluesselB(r.name))));
  return cD.length === 1 ? { verfahren: "teilname", treffer: cD } : { verfahren: null, treffer: cD };
}

// Bei mehreren Namensvettern gilt nur der mit mindestens 10.000 Einwohnern: Die Anlage führt
// einzeln nur Gemeinden ab dieser Größe (§ 12 Abs. 3 WoGG). Genau einer muss übrig bleiben.
export function waehleGrosse(kandidaten: readonly GvGemeinde[]): GvGemeinde | null {
  const gross = kandidaten.filter((k) => (k.einwohner ?? 0) >= EINWOHNERSCHWELLE);
  return gross.length === 1 ? (gross[0] ?? null) : null;
}

const handSchluessel = (h: Handzuordnung): string => `${h.art}|${h.land}|${h.name}`;

// Gemeinsamer Teil der Handzuordnung für Gemeinden und Kreise: der festgeschriebene Schlüssel muss im
// Verzeichnis (Pool des Landes) vorkommen, sonst Abbruch; die Zuordnung wird als benutzt vermerkt.
function uebernehmeHand(hand: Handzuordnung, imVerzeichnis: boolean, benutzt: Set<string>): string {
  if (!imVerzeichnis) throw new Error(`Handzuordnung ${hand.name}: ${hand.schluessel} fehlt im Verzeichnis`);
  benutzt.add(handSchluessel(hand));
  return hand.schluessel;
}

export function verknuepfe(anlage: readonly AnlageZeile[], gv: Gv, handzuordnung: readonly Handzuordnung[] = HANDZUORDNUNG): Verknuepfung {
  const landkreise = gv.kreise.filter((k) => ["43", "44", "45"].includes(k.textkennzeichen));
  const erg: Verknuepfung = { gemeinden: [], kreise: [], offen: [] };
  const benutzt = new Set<string>();

  for (const zeile of anlage) {
    if (zeile.art === "insel" || zeile.land === null) continue;
    const lc = LAND_ZU_KUERZEL.get(zeile.land);
    if (!lc) throw new Error(`Anlage: unbekanntes Land "${zeile.land}"`);
    const hand = handzuordnung.find((h) => h.land === zeile.land && h.art === zeile.art && h.name === zeile.name);

    if (zeile.art === "gemeinde") {
      const pool = gv.gemeinden.filter((g) => g.ags.startsWith(lc));
      if (hand) {
        const ags = uebernehmeHand(hand, pool.some((g) => g.ags === hand.schluessel), benutzt);
        erg.gemeinden.push({ zeile, ags, verfahren: "hand" });
        continue;
      }
      const { verfahren, treffer } = findeKandidaten(zeile.name, pool);
      if (verfahren && treffer[0]) {
        erg.gemeinden.push({ zeile, ags: treffer[0].ags, verfahren });
        continue;
      }
      const gross = waehleGrosse(treffer);
      if (gross) erg.gemeinden.push({ zeile, ags: gross.ags, verfahren: "einwohner" });
      else erg.offen.push({ zeile, kandidaten: treffer.map((t) => `${t.ags} ${t.name}`) });
    } else {
      const pool = landkreise.filter((k) => k.kkz.startsWith(lc));
      if (hand) {
        const kkz = uebernehmeHand(hand, pool.some((k) => k.kkz === hand.schluessel), benutzt);
        erg.kreise.push({ zeile, kkz, verfahren: "hand" });
        continue;
      }
      const { verfahren, treffer } = findeKandidaten(zeile.name, pool);
      if (verfahren && treffer[0]) erg.kreise.push({ zeile, kkz: treffer[0].kkz, verfahren });
      else erg.offen.push({ zeile, kandidaten: treffer.map((t: GvKreis) => `${t.kkz} ${t.name}`) });
    }
  }
  for (const h of handzuordnung) {
    if (!benutzt.has(handSchluessel(h))) throw new Error(`Handzuordnung ohne Anlagezeile: ${h.land}, ${h.name}`);
  }
  return erg;
}
