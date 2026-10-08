// Gleicht die eingecheckten Rohdaten und die erzeugte Mietstufen-Datei mit den Quellen im Netz ab.
//   npm run pruefe:mietstufen
// Exit 0: alles stimmt, 1: Abweichung, 2: Abruf- oder Strukturfehler.
// Ändert sich die Anlage (neue Verordnung ab 2027), schlägt der Lauf an, bis die Rohdaten erneuert sind.
import { readFileSync } from "node:fs";
import { parseAnlage, type AnlageZeile } from "./mietstufen/anlage";
import { INSEL_GEMEINDEN, erzeugeMietstufen, serialisiere } from "./mietstufen/erzeugen";
import { parseInselnAusGesetz } from "./mietstufen/inseln";
import { ladeEingabe } from "./mietstufen/eingabe";
import { DATEI_DATEN, leseQuellen, leseRohdatei } from "./mietstufen/quellen";

let abweichungen = 0;
const melde = (text: string): void => {
  abweichungen++;
  console.error(`ABWEICHUNG ${text}`);
};

async function hole(url: string): Promise<string> {
  const antwort = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!antwort.ok) throw new Error(`${url}: HTTP ${antwort.status}`);
  return new TextDecoder("iso-8859-1").decode(await antwort.arrayBuffer());
}

const schluessel = (z: AnlageZeile): string => `${z.land ?? "-"}|${z.art}|${z.name}`;

try {
  const quellen = leseQuellen();
  const eingabe = ladeEingabe();
  const live = parseAnlage(await hole(quellen.anlage.url));

  if (live.length !== eingabe.anlage.length) melde(`Anlage Zeilenzahl: Datei ${eingabe.anlage.length}, Quelle ${live.length}`);
  const hier = new Map(eingabe.anlage.map((z) => [schluessel(z), z.stufe]));
  const dort = new Map(live.map((z) => [schluessel(z), z.stufe]));
  for (const [k, stufe] of hier) {
    if (!dort.has(k)) melde(`Anlage Zeile fehlt in der Quelle: ${k}`);
    else if (dort.get(k) !== stufe) melde(`Anlage ${k}: Datei Stufe ${stufe}, Quelle Stufe ${dort.get(k)}`);
  }
  for (const k of dort.keys()) if (!hier.has(k)) melde(`Anlage Zeile neu in der Quelle: ${k}`);

  const gesetz = parseInselnAusGesetz(await hole(quellen.wogg_12.url));
  const imCode = INSEL_GEMEINDEN.map((i) => i.gesetz);
  if (gesetz.join("|") !== imCode.join("|")) melde(`§ 12 Abs. 4a WoGG: Inselliste im Gesetz ${gesetz.length} Gemeinden, im Code ${imCode.length}, oder Reihenfolge/Schreibweise anders`);

  const erwartet = serialisiere(erzeugeMietstufen(eingabe).daten);
  if (readFileSync(DATEI_DATEN, "utf8") !== erwartet) melde("data/mietstufen-2023.json passt nicht zu den eingecheckten Rohdaten (npm run mietstufen:erzeugen)");
  for (const q of [quellen.anlage, quellen.wogg_12]) {
    if (leseRohdatei(q).length === 0) melde(`${q.datei} ist leer`);
  }

  if (abweichungen > 0) process.exit(1);
  console.log(`Mietstufen stimmen mit gesetze-im-internet.de überein (${live.length} Zeilen der Anlage, ${gesetz.length} Inselgemeinden).`);
} catch (fehler) {
  console.error(fehler instanceof Error ? fehler.message : fehler);
  process.exit(2);
}
