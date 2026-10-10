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
  { name: "Ausschluss ignoriert", datei: "src/engine/ausschluss.ts", alt: "(schliesstAus(m) ? [] : [index])", neu: "[index]" },
  {
    name: "SGB VIII je Mitglied statt je Haushalt",
    datei: "src/engine/ausschluss.ts",
    alt: 'mitglieder.every((m) => m.ausschluss === "sgb8_kdu")',
    neu: "true",
  },
  {
    name: "Titel ignoriert",
    datei: "src/engine/einkommen/gesamteinkommen.ts",
    alt: "u.tituliert ? jahresbetrag : D.min(jahresbetrag, grenze)",
    neu: "D.min(jahresbetrag, grenze)",
  },
  { name: "Elterngeld Plus ohne Halbierung", datei: "src/engine/einkommen/jahreseinkommen.ts", alt: "dividedBy(plus ? 2 : 1)", neu: "dividedBy(1)" },
  { name: "Zuschlagsdeckel nach Mindestwert", datei: "src/engine/formel.ts", alt: "mRoh.toDecimalPlaces(0, D.ROUND_DOWN)", neu: "M.toDecimalPlaces(0, D.ROUND_DOWN)" },
  { name: "Anteil-Schritt fehlt", datei: "src/engine/miete.ts", alt: "if (!anteil.equals(1))", neu: "if (false)" },
  // E3: Mietstufen-Daten und Ortssuche
  { name: "Stufe Taufkirchen (Ausreißer im Kreis München)", datei: "data/mietstufen-2023.json", alt: '["09184145","Taufkirchen",2,"g"]', neu: '["09184145","Taufkirchen",3,"g"]' },
  { name: "Stufe Pellworm (Insel)", datei: "data/mietstufen-2023.json", alt: '["01054103","Pellworm",5,"i"]', neu: '["01054103","Pellworm",1,"i"]' },
  { name: "Prüfsumme der Anlage", datei: "data/roh/quellen.json", alt: '"sha256": "e71af5b9', neu: '"sha256": "e71af5b8' },
  { name: "Stufe IV der Anlage gelesen als V", datei: "scripts/mietstufen/anlage.ts", alt: "IV: 4", neu: "IV: 5" },
  { name: "Kopfzeile der Tabelle als Datenzeile gelesen", datei: "scripts/mietstufen/anlage.ts", alt: "for (const zeile of zeilen.slice(1)) {", neu: "for (const zeile of zeilen.slice(0)) {" },
  { name: "gemeindefreie Gebiete mitgezählt", datei: "scripts/mietstufen/gv.ts", alt: 'tk !== "65" && tk !== "66"', neu: 'tk !== "65"' },
  { name: "Einwohnerschwelle 10.000 auf 20.000", datei: "scripts/mietstufen/verknuepfen.ts", alt: "EINWOHNERSCHWELLE = 10_000", neu: "EINWOHNERSCHWELLE = 20_000" },
  { name: "Schwelle „mindestens“ zu „mehr als“", datei: "scripts/mietstufen/verknuepfen.ts", alt: "(k.einwohner ?? 0) >= EINWOHNERSCHWELLE", neu: "(k.einwohner ?? 0) > EINWOHNERSCHWELLE" },
  { name: "Zusatzklasse Stadt (61) fehlt", datei: "scripts/mietstufen/verknuepfen.ts", alt: 'new Set(["61", "62", "63", "67"])', neu: 'new Set(["62", "63", "67"])' },
  { name: "Handzuordnung Weingarten (Baden)", datei: "scripts/mietstufen/verknuepfen.ts", alt: 'schluessel: "08215090"', neu: 'schluessel: "08436082"' },
  { name: "Inselstufe fest statt aus der Anlage", datei: "scripts/mietstufen/erzeugen.ts", alt: "stufe = inselStufe;", neu: "stufe = 4;" },
  { name: "Kreisfallback mit falschem Schlüssel", datei: "scripts/mietstufen/erzeugen.ts", alt: "kreisStufe.get(g.ags.slice(0, 5))", neu: "kreisStufe.get(g.ags.slice(0, 4))" },
  { name: "Annahme-Kennzeichen n fehlt", datei: "scripts/mietstufen/erzeugen.ts", alt: 'basisAgs.has(g.ags) ? "k" : "n"', neu: '"k"' },
  { name: "Umlaut ö als o", datei: "src/mietstufen/normalisieren.ts", alt: '.replace(/ö/g, "oe")', neu: '.replace(/ö/g, "o")' },
  { name: "ß nicht aufgelöst", datei: "src/mietstufen/normalisieren.ts", alt: '.replace(/ß/g, "ss")', neu: "" },
  { name: "Abkürzung a.d. nicht aufgelöst", datei: "src/mietstufen/normalisieren.ts", alt: '"an der ", false],', neu: '"an derx", false],' },
  { name: "Klammerzusatz nicht als schwacher Schlüssel", datei: "src/mietstufen/normalisieren.ts", alt: "const schwach = new Set([normalisiere(ohneKlammer(vorKomma(name))), normalisiere(vorSchraegstrich(ohneKlammer(vorKomma(name))))]);", neu: "const schwach = new Set<string>();" },
  { name: "Wortanfang-Regel (Frankfurt) aus", datei: "src/mietstufen/suche.ts", alt: "if (liste.length === 1 && !hatStarkenTreffer) {", neu: "if (false) {" },
  {
    name: "Teilname als eindeutiger Treffer",
    datei: "src/mietstufen/suche.ts",
    alt: 'if (teilname.length > 0) return { status: "nicht_gefunden"',
    neu: 'if (teilname.length === 1 && teilname[0]) return { status: "eindeutig", treffer: treffer(teilname[0]) };\n    if (teilname.length > 0) return { status: "nicht_gefunden"',
  },
  { name: "Länderkürzel HE falsch", datei: "src/mietstufen/suche.ts", alt: 'he: "06"', neu: 'he: "07"' },
  { name: "Kandidatenliste 26 statt 25", datei: "src/mietstufen/suche.ts", alt: "MAX_KANDIDATEN = 25", neu: "MAX_KANDIDATEN = 26" },
  {
    name: "C-1: lockere Umlautsuche mit gelockerter Eingabe, eindeutig vor Teilname",
    datei: "src/mietstufen/suche.ts",
    alt: `    const lose = filtere([...(locker.get(q0) ?? locker.get(q1) ?? [])], eingabe);
    if (lose.length === 1 && lose[0] && teilname.length === 0) return`,
    neu: `    const lose = filtere([...(locker.get(lockerSchluessel(q0)) ?? locker.get(lockerSchluessel(q1)) ?? [])], eingabe);
    if (lose.length === 1 && lose[0]) return`,
  },
  { name: "C-2: Wortanfang-Regel nur ohne starken Treffer", datei: "src/mietstufen/suche.ts", alt: "if (starkGefunden) for (const e of grosseNachWort", neu: "if (false) for (const e of grosseNachWort" },
  { name: "I-1: Anlagezeile vor Insel", datei: "scripts/mietstufen/erzeugen.ts", alt: "if (inselAgs.has(g.ags)) {", neu: "if (inselAgs.has(g.ags) && !gemeindeStufe.has(g.ags)) {" },
  { name: "Tippfehler-Abstand 2 auf 3", datei: "src/mietstufen/suche.ts", alt: "ABSTAND_LANG = 2", neu: "ABSTAND_LANG = 3" },
  { name: "Annahme-Hinweis fehlt in der Quelle", datei: "src/mietstufen/suche.ts", alt: "Annahme: Gemeinde fehlt", neu: "Gemeinde fehlt" },
  { name: "Stufenprüfung der Datei aus", datei: "src/mietstufen/daten.ts", alt: "!MIETSTUFEN.includes(stufe as Mietstufe)", neu: "false" },
  { name: "Annotation readOnlyHint", datei: "src/server/gemeinsam.ts", alt: "readOnlyHint: true,", neu: "readOnlyHint: false," },
  {
    name: "Hinweis bei mehrdeutigem Wohnort fehlt",
    datei: "src/server/wohngeld-berechnen.ts",
    alt: "hinweise: [HINWEIS_UNVERBINDLICH, HINWEIS_MEHRDEUTIG]",
    neu: "hinweise: [HINWEIS_MEHRDEUTIG]",
  },
  {
    name: "Gemeinsame Stufe trotz gekürzter Liste",
    datei: "src/server/mietstufe-finden.ts",
    alt: "if (e.kandidaten.length !== e.anzahl) return undefined;",
    neu: "if (false) return undefined;",
  },
  {
    name: "Wortanfang-Ergänzung nur bei genau einem Zusatztreffer",
    datei: "src/mietstufen/suche.ts",
    alt: "if (liste.length >= 1 && !hatStarkenTreffer) {",
    neu: "if (liste.length === 1 && !hatStarkenTreffer) {",
  },
  { name: "Landkürzel NRW", datei: "src/mietstufen/suche.ts", alt: 'nrw: "05"', neu: 'nrwx: "05"' },
  {
    name: "Landesvorsatz Freie Hansestadt",
    datei: "src/mietstufen/suche.ts",
    alt: "freie und hansestadt|freie hansestadt|land",
    neu: "freie und hansestadt|land",
  },
  {
    name: "Längenvorfilter fehlt",
    datei: "src/mietstufen/suche.ts",
    alt: "(Math.abs(k.length - q1.length) > grenze ? grenze + 1 : abstand(q1, k))",
    neu: "abstand(q1, k)",
  },
  {
    name: "Längengrenze Gemeinde",
    datei: "src/server/gemeinsam.ts",
    alt: ".max(100)\n    .describe('Name der Gemeinde",
    neu: ".max(100000)\n    .describe('Name der Gemeinde",
  },
  { name: "Stichtag in UTC statt Berlin", datei: "src/server/wohngeld-berechnen.ts", alt: 'timeZone: "Europe/Berlin"', neu: 'timeZone: "UTC"' },
  { name: "Feldnamen nicht übersetzt", datei: "src/server/wohngeld-berechnen.ts", alt: "FELDNAMEN[w] ?? w", neu: "w" },
  {
    name: "Rechtsstand-Fehler nicht übersetzt",
    datei: "src/server/wohngeld-berechnen.ts",
    alt: "throw new Error(`Rechtsstand noch nicht verfügbar. ${f.message}`)",
    neu: "throw f",
  },
  {
    name: "wohnort und mietstufe zugleich erlaubt",
    datei: "src/server/wohngeld-berechnen.ts",
    alt: "if (a.wohnort && a.mietstufe !== undefined) throw",
    neu: "if (false) throw",
  },
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
