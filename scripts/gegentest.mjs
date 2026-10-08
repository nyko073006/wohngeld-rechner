// Jede Mutation verändert genau eine Stelle. Bleibt die Testsuite danach grün, prüft sie diese Stelle nicht.
// Ausgewertet wird der Exit-Code von vitest, nie dessen Textausgabe.
import { spawn } from "node:child_process";
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
  { name: "Zehnte Stelle runden statt abschneiden", datei: "src/engine/dezimal.ts", alt: "toDecimalPlaces(10, D.ROUND_DOWN)", neu: "toDecimalPlaces(10, D.ROUND_HALF_UP)" },
  { name: "Faktor 1,15", datei: "src/engine/formel.ts", alt: 'new D("1.15")', neu: 'new D("1.16")' },
  { name: "Anteil im Mischhaushalt ignoriert", datei: "src/engine/miete.ts", alt: "const anteil = new D(e.zuBeruecksichtigen).dividedBy(n);", neu: "const anteil = new D(1);" },
  { name: "Kappung auf Höchstbetrag fehlt", datei: "src/engine/miete.ts", alt: "D.min(mieteAnteilig, grenze)", neu: "mieteAnteilig" },
  { name: "Über 12 nicht gedeckelt", datei: "src/rechtsstand/zugriff.ts", alt: "return Math.min(n, 12);", neu: "return Math.min(n, 13);" },
  { name: "Arbeitnehmer-Pauschbetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "arbeitnehmerPauschbetrag: 1230", neu: "arbeitnehmerPauschbetrag: 1231" },
  { name: "Versorgungs-Pauschbetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "versorgungsPauschbetrag: 102", neu: "versorgungsPauschbetrag: 103" },
  { name: "Renten-Pauschbetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "rentenPauschbetrag: 102", neu: "rentenPauschbetrag: 103" },
  { name: "Kapital-Schwelle 100 €", datei: "src/rechtsstand/wogg-2025.ts", alt: "kapitalSchwelle: 100", neu: "kapitalSchwelle: 101" },
  { name: "Abzugssatz § 16", datei: "src/rechtsstand/wogg-2025.ts", alt: 'abzugsSatz: "0.1"', neu: 'abzugsSatz: "0.11"' },
  { name: "Elterngeld anrechnungsfrei", datei: "src/rechtsstand/wogg-2025.ts", alt: "elterngeldFreiMonatlich: 300", neu: "elterngeldFreiMonatlich: 301" },
  { name: "Zuwendungen Dritter frei", datei: "src/rechtsstand/wogg-2025.ts", alt: "zuwendungDritterFrei: 480", neu: "zuwendungDritterFrei: 481" },
  { name: "Freibetrag Schwerbehinderung", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragSchwerbehindert: 1800", neu: "freibetragSchwerbehindert: 1801" },
  { name: "Freibetrag NS-Verfolgung", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragNsVerfolgt: 750", neu: "freibetragNsVerfolgt: 751" },
  { name: "Freibetrag Alleinerziehende", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragAlleinerziehend: 1320", neu: "freibetragAlleinerziehend: 1321" },
  { name: "Höchstbetrag Kind-Freibetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragKindErwerbHoechst: 1200", neu: "freibetragKindErwerbHoechst: 1201" },
  { name: "Grundrente 30 %", datei: "src/rechtsstand/wogg-2025.ts", alt: 'grundrenteSatz: "0.3"', neu: 'grundrenteSatz: "0.31"' },
  { name: "Regelbedarfsstufe 1", datei: "src/rechtsstand/wogg-2025.ts", alt: "regelbedarfsstufe1: 563", neu: "regelbedarfsstufe1: 564" },
  { name: "Unterhalt Ehegatte", datei: "src/rechtsstand/wogg-2025.ts", alt: "ehegatte: 6000", neu: "ehegatte: 6001" },
  { name: "Vermögen erstes Mitglied", datei: "src/rechtsstand/wogg-2025.ts", alt: "vermoegenErstes: 60000", neu: "vermoegenErstes: 60001" },
  { name: "Vermögen weiteres Mitglied", datei: "src/rechtsstand/wogg-2025.ts", alt: "vermoegenWeiteres: 30000", neu: "vermoegenWeiteres: 30001" },
  { name: "Negative Einkünfte verrechnet", datei: "src/engine/einkommen/jahreseinkommen.ts", alt: "if (x.isNegative())", neu: "if (false)" },
  { name: "Hälfte nach § 14 Abs. 2 voll", datei: "src/engine/einkommen/jahreseinkommen.ts", alt: ".dividedBy(2));", neu: ".dividedBy(1));" },
  { name: "Y ein Zwölftel", datei: "src/engine/einkommen/gesamteinkommen.ts", alt: "gesamteinkommen.dividedBy(12)", neu: "gesamteinkommen.dividedBy(11)" },
  { name: "Ausschluss ignoriert", datei: "src/engine/ausschluss.ts", alt: "(m.ausschluss ? [] : [index])", neu: "[index]" },
  { name: "Zuschlagsdeckel nach Mindestwert", datei: "src/engine/formel.ts", alt: "mRoh.toDecimalPlaces(0, D.ROUND_DOWN)", neu: "M.toDecimalPlaces(0, D.ROUND_DOWN)" },
  { name: "Anteil-Schritt fehlt", datei: "src/engine/miete.ts", alt: "if (!anteil.equals(1))", neu: "if (false)" },
];

let gruen = 0;
let rot = 0;

// Gerade mutierte Datei samt Original; bei SIGINT/SIGTERM läuft `finally` nicht, daher hier wiederherstellen.
let offen = null;
let laufendesKind = null;
function wiederherstellen() {
  if (offen) {
    writeFileSync(offen.datei, offen.original);
    offen = null;
  }
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (laufendesKind) laufendesKind.kill("SIGTERM");
    wiederherstellen();
    console.error(`FEHLER: ${signal} empfangen, Datei wiederhergestellt.`);
    process.exit(2);
  });
}

// Asynchron statt spawnSync: Signal-Handler laufen nur, wenn die Ereignisschleife frei ist.
// status === null heißt: Prozess per Signal beendet. error gesetzt heißt: gar nicht gestartet. Beides ist kein Testergebnis.
function vitestLaufen() {
  return new Promise((aufloesen) => {
    const kind = spawn("npx", ["vitest", "run", "--reporter=dot"], { stdio: "ignore" });
    laufendesKind = kind;
    kind.on("error", (error) => aufloesen({ error, status: null, signal: null }));
    kind.on("close", (status, signal) => aufloesen({ error: null, status, signal }));
  });
}
function unbrauchbar(lauf) {
  return Boolean(lauf.error) || lauf.status === null;
}

for (const m of MUTATIONEN) {
  const original = readFileSync(m.datei, "utf8");
  if (!original.includes(m.alt)) {
    console.error(`FEHLER: Stelle für „${m.name}“ nicht gefunden in ${m.datei}: ${m.alt}`);
    process.exit(2);
  }
  offen = { datei: m.datei, original };
  writeFileSync(m.datei, original.replace(m.alt, m.neu));
  try {
    const lauf = await vitestLaufen();
    if (unbrauchbar(lauf)) {
      wiederherstellen();
      console.error(`FEHLER: vitest lieferte bei „${m.name}“ kein Ergebnis (${lauf.error ? lauf.error.message : `Signal ${lauf.signal}`}).`);
      process.exit(2);
    }
    if (lauf.status === 0) {
      gruen++;
      console.log(`GRÜN (schlecht): ${m.name}`);
    } else {
      rot++;
      console.log(`rot (gut):       ${m.name}`);
    }
  } finally {
    wiederherstellen();
  }
}

console.log(`\n${rot} rot, ${gruen} grün von ${MUTATIONEN.length} Mutationen.`);
const sauber = await vitestLaufen();
if (unbrauchbar(sauber)) {
  console.error(`FEHLER: Grundlauf lieferte kein Ergebnis (${sauber.error ? sauber.error.message : `Signal ${sauber.signal}`}).`);
  process.exit(2);
}
if (sauber.status !== 0) {
  console.error("FEHLER: Ohne Mutation ist die Suite nicht grün.");
  process.exit(2);
}
process.exit(gruen === 0 ? 0 : 1);
