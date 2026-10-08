// Erzeugt data/mietstufen-2023.json aus den Rohdaten in data/roh/.
//   npm run mietstufen:erzeugen             schreibt die Datei
//   npm run mietstufen:erzeugen -- --pruefen  vergleicht nur (Exit 0 gleich, 1 abweichend, 2 Fehler)
import { readFileSync, writeFileSync } from "node:fs";
import { erzeugeMietstufen, serialisiere } from "./mietstufen/erzeugen";
import { ladeEingabe } from "./mietstufen/eingabe";
import { DATEI_DATEN } from "./mietstufen/quellen";

try {
  const { daten, verknuepfung, aliase } = erzeugeMietstufen(ladeEingabe());
  const text = serialisiere(daten);
  const verfahren: Record<string, number> = {};
  for (const z of [...verknuepfung.gemeinden, ...verknuepfung.kreise]) verfahren[z.verfahren] = (verfahren[z.verfahren] ?? 0) + 1;
  console.log(`Gemeinden ${daten.meta.anzahl.gemeinden}, je Herkunft ${JSON.stringify(daten.meta.anzahl.je_herkunft)}`);
  console.log(`Zuordnung Anlage -> Schlüssel nach Verfahren: ${JSON.stringify(verfahren)}`);
  for (const a of aliase) console.log(`Schlüsselwechsel: ${a.name} ${a.von} -> ${a.nach}`);
  if (process.argv.includes("--pruefen")) {
    const vorhanden = readFileSync(DATEI_DATEN, "utf8");
    if (vorhanden !== text) {
      console.error("ABWEICHUNG: data/mietstufen-2023.json passt nicht zu den Rohdaten. Neu erzeugen mit npm run mietstufen:erzeugen.");
      process.exit(1);
    }
    console.log("data/mietstufen-2023.json stimmt mit den Rohdaten überein.");
  } else {
    writeFileSync(DATEI_DATEN, text);
    console.log(`Geschrieben: ${DATEI_DATEN} (${text.length} Zeichen)`);
  }
} catch (fehler) {
  console.error(fehler instanceof Error ? fehler.message : fehler);
  process.exit(2);
}
