// Jede Mutation verändert genau eine Stelle. Bleibt die Testsuite danach grün, prüft sie diese Stelle nicht.
// Ausgewertet wird der Exit-Code von vitest, nie dessen Textausgabe.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const MUTATIONEN = [
  { name: "Koeffizient c für 1 Mitglied", datei: "src/rechtsstand/wogg-2025.ts", alt: 'c: "0.0000408"', neu: 'c: "0.0000409"' },
  { name: "Höchstbetrag 4 Mitglieder Stufe VII", datei: "src/rechtsstand/wogg-2025.ts", alt: "7: 1139 }", neu: "7: 1140 }" },
  { name: "Klimakomponente Mehrbetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "mehrbetrag: 4.8", neu: "mehrbetrag: 4.9" },
  { name: "Heizkosten 1 Mitglied", datei: "src/rechtsstand/wogg-2025.ts", alt: "1: 110.4,", neu: "1: 110.5," },
  { name: "Mindestwert Y 1 Mitglied", datei: "src/rechtsstand/wogg-2025.ts", alt: "1: { m: 54, y: 396 }", neu: "1: { m: 54, y: 397 }" },
  { name: "Bagatellgrenze", datei: "src/rechtsstand/wogg-2025.ts", alt: "bagatellgrenze: 10", neu: "bagatellgrenze: 11" },
  { name: "Zuschlag ab 13", datei: "src/rechtsstand/wogg-2025.ts", alt: "zuschlagAb13: 65", neu: "zuschlagAb13: 64" },
  { name: "Rundung auf Euro abschneiden", datei: "src/engine/dezimal.ts", alt: "toDecimalPlaces(0, D.ROUND_HALF_UP)", neu: "toDecimalPlaces(0, D.ROUND_DOWN)" },
  { name: "Faktor 1,15", datei: "src/engine/formel.ts", alt: 'new D("1.15")', neu: 'new D("1.16")' },
  { name: "Anteil im Mischhaushalt ignoriert", datei: "src/engine/miete.ts", alt: "const anteil = new D(e.zuBeruecksichtigen).dividedBy(n);", neu: "const anteil = new D(1);" },
  { name: "Kappung auf Höchstbetrag fehlt", datei: "src/engine/miete.ts", alt: "D.min(mieteAnteilig, grenze)", neu: "mieteAnteilig" },
  { name: "Über 12 nicht gedeckelt", datei: "src/rechtsstand/zugriff.ts", alt: "return Math.min(n, 12);", neu: "return Math.min(n, 13);" },
];

let gruen = 0;
let rot = 0;
for (const m of MUTATIONEN) {
  const original = readFileSync(m.datei, "utf8");
  if (!original.includes(m.alt)) {
    console.error(`FEHLER: Stelle für „${m.name}“ nicht gefunden in ${m.datei}: ${m.alt}`);
    process.exit(2);
  }
  writeFileSync(m.datei, original.replace(m.alt, m.neu));
  try {
    const lauf = spawnSync("npx", ["vitest", "run", "--reporter=dot"], { stdio: "ignore" });
    if (lauf.status === 0) {
      gruen++;
      console.log(`GRÜN (schlecht): ${m.name}`);
    } else {
      rot++;
      console.log(`rot (gut):       ${m.name}`);
    }
  } finally {
    writeFileSync(m.datei, original);
  }
}

console.log(`\n${rot} rot, ${gruen} grün von ${MUTATIONEN.length} Mutationen.`);
const sauber = spawnSync("npx", ["vitest", "run", "--reporter=dot"], { stdio: "ignore" });
if (sauber.status !== 0) {
  console.error("FEHLER: Ohne Mutation ist die Suite nicht grün.");
  process.exit(2);
}
process.exit(gruen === 0 ? 0 : 1);
