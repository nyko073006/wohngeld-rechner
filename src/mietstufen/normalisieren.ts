// Namensvergleich für die Ortssuche. Rein, ohne Node-Abhängigkeit (läuft auf Workers).

// Wortgrenzen über Unicode-Klassen, weil \b Umlaute nicht kennt.
const ANFANG = "(?<![\\p{L}\\p{N}_])";
const ENDE = "(?![\\p{L}\\p{N}_])";

// Abkürzungen aus dem Gemeindeverzeichnis („a.d.Isar“, „i.d.OPf.“, „Bay.“) werden aufgelöst,
// damit „Landau an der Isar“ und „Landau a.d.Isar, St“ denselben Schlüssel haben. „am/im“ und
// „an/in“ gelten als gleich („Dießen a. Ammersee“ gegen „Dießen am Ammersee“).
const ABKUERZUNGEN: readonly (readonly [string, string, boolean])[] = [
  ["i\\.\\s*d\\.\\s*opf\\.?", "in der oberpfalz", false],
  ["a\\.\\s*d\\.\\s*", "an der ", false],
  ["i\\.\\s*d\\.\\s*", "in der ", false],
  ["v\\.\\s*d\\.\\s*", "vor der ", false],
  ["a\\.\\s*", "an ", false],
  ["i\\.\\s*", "in ", false],
  ["b\\.\\s*", "bei ", false],
  ["v\\.\\s*", "vor ", false],
  ["am", "an", true],
  ["im", "in", true],
  ["st\\.\\s*", "sankt ", false],
  ["bergstr\\.?", "bergstrasse", false],
  ["weinstr\\.?", "weinstrasse", false],
  ["rhld\\.?", "rheinland", false],
  ["westf\\.?", "westfalen", false],
  ["vogtl\\.?", "vogtland", false],
  ["odw\\.?", "odenwald", false],
  ["oldb\\.?", "oldenburg", false],
  ["opf\\.?", "oberpfalz", false],
  ["bay\\.", "bayern", false],
];

const REGELN: readonly (readonly [RegExp, string])[] = ABKUERZUNGEN.map(([muster, ersatz, wortEnde]) => [
  new RegExp(ANFANG + muster + (wortEnde ? ENDE : ""), "gu"),
  ersatz,
]);

// Kleinschreibung, ß = ss, ä/ö/ü = ae/oe/ue, ł = l, übrige Akzente weg, Satzzeichen = Leerzeichen.
export function normalisiere(text: string): string {
  let s = text.toLowerCase();
  for (const [muster, ersatz] of REGELN) s = s.replace(muster, ersatz);
  return s
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ł/g, "l") // sorbische Namensteile ("Błota"); ł zerfällt nicht in Buchstabe plus Akzent
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Zusätze, die nur den Status beschreiben. „St“ und „M“ fehlen bewusst: „St. Georgen“ ist Sankt Georgen.
const TITEL = new Set(["stadt", "gemeinde", "markt", "landeshauptstadt", "hansestadt", "kreisstadt", "universitaetsstadt", "flecken", "stadtgemeinde", "marktgemeinde"]);

export const ohneTitel = (schluessel: string): string =>
  schluessel
    .split(" ")
    .filter((t) => !TITEL.has(t))
    .join(" ");

const vorKomma = (s: string): string => s.split(",")[0] ?? "";
const ohneKlammer = (s: string): string => s.replace(/\([^)]*\)/g, " ");
const vorSchraegstrich = (s: string): string => s.split("/")[0] ?? "";

// Schlüssel einer Gemeinde. Stark: der ganze Name und der Name vor dem Komma
// („Aalen, Stadt“ -> „aalen“). Schwach: ohne Klammerzusatz und vor dem Schrägstrich
// („Neustadt (Hessen), Stadt“ -> „neustadt“, „Neustadt/Vogtl.“ -> „neustadt“).
export function gemeindeSchluessel(name: string): { stark: string[]; schwach: string[] } {
  const stark = new Set([normalisiere(name), normalisiere(vorKomma(name))]);
  const schwach = new Set([normalisiere(ohneKlammer(vorKomma(name))), normalisiere(vorSchraegstrich(ohneKlammer(vorKomma(name))))]);
  for (const k of stark) schwach.delete(k);
  schwach.delete("");
  return { stark: [...stark], schwach: [...schwach] };
}

const KREIS_ZUSAETZE = new Set(["landkreis", "kreis", "stadt", "kreisfreie", "stadtkreis", "landeshauptstadt", "hansestadt"]);

// „Landkreis München“ und „München“ vergleichen sich gleich; „Rhein-Neckar-Kreis“ bleibt „rhein neckar“.
export const kreisSchluessel = (text: string): string =>
  normalisiere(text)
    .split(" ")
    .filter((t) => !KREIS_ZUSAETZE.has(t))
    .join(" ");

// Lockere Umlautsuche als letzter Versuch: „Munchen“ findet „München“, „Muenchen“ ohnehin.
export const lockerSchluessel = (schluessel: string): string => schluessel.replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");

// Levenshtein-Abstand für „meinten Sie ...“.
export function abstand(a: string, b: string): number {
  let vorher = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const jetzt = [i];
    for (let j = 1; j <= b.length; j++) {
      jetzt[j] = Math.min((vorher[j] ?? 0) + 1, (jetzt[j - 1] ?? 0) + 1, (vorher[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    vorher = jetzt;
  }
  return vorher[b.length] ?? 0;
}
