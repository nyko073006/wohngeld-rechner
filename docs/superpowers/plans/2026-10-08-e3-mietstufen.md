# E3: Mietstufen-Daten und Ortssuche – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus der Anlage zu § 1 Abs. 3 WoGV und dem Destatis-Gemeindeverzeichnis entsteht die eingecheckte Datei `data/mietstufen-2023.json` (alle 10.751 Gemeinden mit Mietstufe I bis VII und Herkunft der Stufe). Eine Ortssuche (`src/mietstufen/`) liefert zu einem Gemeindenamen genau einen Treffer, eine Kandidatenliste oder „nicht gefunden“ mit ähnlichen Namen. Abnahme laut Spec 7: Test 6 grün und Abgleich mit der Quelle (`npm run pruefe:mietstufen` Exit 0).

**Architecture:** Zwei Seiten. *Erzeugen* (Node, `scripts/mietstufen/`): ZIP/xlsx-Leser, Anlage-Parser, Gemeindeverzeichnis-Leser, Verknüpfung Anlage-Zeile → Gemeindeschlüssel (AGS) in vier Namensstufen plus neun Handzuordnungen, Erzeuger der Datei. Die Anlage nennt nur Name und Stufe; Schlüssel und Kreise kommen aus dem Verzeichnis, die Zuordnung wird einmal offline gebaut und eingecheckt, nicht zur Laufzeit gerechnet. *Suchen* (`src/mietstufen/`, Node-frei): Namensnormalisierung, Index über die Namen von heute (Verzeichnis 31.12.2025), Suche mit Kreis- und Landfilter. Die Stufe einer Gemeinde ist dort schon aufgelöst: eigene Zeile der Anlage, sonst Insel (V), sonst Kreisstufe.

**Tech Stack:** TypeScript 5.9, Node 22, Vitest 5. Keine neue Abhängigkeit (kein XML-, HTML- oder Excel-Paket; der ZIP-Leser nutzt `node:zlib`).

**Spec:** `docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md` (Abschnitte 3, 3.3, 4 `mietstufe_finden`, 5, 6 Nr. 6 und 8, 7 E3, 8 letzter Punkt).

**Quellen:** `docs/quellen/2026-10-08-recherche-lizenz-gemeindeverzeichnis.md` (Lizenz, Quellenangabe; wird im Plan-Commit mit eingecheckt). Rohdaten mit Abrufdatum und SHA-256 in `data/roh/quellen.json` (Task 1). Befunde zu Anlage und Verzeichnis: Abschnitt „Sollwerte“ unten, jeweils mit Prüfweg.

**Ausgangsstand:** Branch `bau/e3` im Worktree `~/Developer/worktrees/wohngeld-rechner-e3`, abgezweigt von `bau/e2` (e689e37). Vor dem Start: `npm ci`, dann `npx vitest run` 178/178 grün und `npx tsc --noEmit` ohne Ausgabe (am 08.10.2026 in einem frischen Export von e689e37 so gemessen). `bau/e0-e1` und `bau/e2` sind ungemergt; E3 baut auf beiden auf und ändert keine Datei dieser Etappen außer `scripts/gegentest.mjs`, `package.json`, `tsconfig.json`, `README.md` und einer Zeile der Spec.

## Entscheidungen vor dem Start (entschieden 09.10.2026)

Der Nutzer hat am 09.10.2026 alle Vorschläge übernommen: (a) Basis 31.12.2020, (b) Option A Kreisstufe als gekennzeichnete Annahme, dazu Ruling 1 (Suche über die Namen des Verzeichnisses 31.12.2025, Stufe über den Schlüssel). Der Plan gilt unverändert. Die Abwägung bleibt zur Nachvollziehbarkeit stehen.

### (a) Basis-Gemeindeverzeichnis für die Zuordnung der Anlage

**Vorschlag: Gebietsstand 31.12.2020** (Jahresausgabe, amtlich und dauerhaft bei Destatis abrufbar).

Gemessen am 08.10.2026: Die Zuordnung der 1.601 Gemeinden und 279 Kreise liefert gegen 31.12.2020 und gegen 31.03.2021 **dieselben** Schlüssel (gleiche Stufenverteilung der Verfahren, gleiche neun Handzuordnungen), und die fertige Datei mit 10.751 Gemeinden unterscheidet sich nur im Kopf und in zwei Zeilen (Herkunft n statt k). Die Anlage nennt den 31.03.2021 als Gebietsstand; dieser Auszug ist bei Destatis nicht mehr abrufbar (nur über das Internet Archive, Capture 18.04.2021, Datei 2.058.686 Bytes, SHA-256 `3d3205578e47881598ed3b0177952facb97a4af92c454955a0d7dec803689536`, heute neu geladen und identisch).

| Punkt | 31.12.2020 (Vorschlag) | 31.03.2021 (Alternative) |
|---|---|---|
| Quelle | `https://www.destatis.de/…/GVAuszugJ/31122020_Auszug_GV.xlsx?__blob=publicationFile` | `https://web.archive.org/web/20210418211422id_/https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GVAuszugQ/AuszugGV1QAktuell.xlsx?__blob=publicationFile` (Dritter) |
| Datei | `data/roh/gv-31122020.xlsx`, 2.060.890 Bytes, SHA-256 `6027130d…dff6de` | `data/roh/gv-31032021.xlsx`, 2.058.686 Bytes, SHA-256 `3d320557…689536` |
| Gemeinden / Kreise / Landkreise im Verzeichnis | 10.794 / 401 / 294 | 10.790 / 401 / 294 |
| Einwohnerstand der Verzeichnisspalte | 31.12.2020 (näher am Anlage-Stichtag 30.09.2020) | 31.12.2019 |
| Kleinste Einwohnerzahl einer Anlage-Gemeinde (Task 4) | 9.947 | 9.945 |
| Herkunft „n“ (fehlt im Basisverzeichnis, Kreisstufe als Annahme) | 6: Neitersen, Obergeckler, Jahnatal, Uder, Greußen, Berga-Wünschendorf | 4: ohne Neitersen und Greußen (beide am 01.01.2021 gebildet, im Stand 31.03.2021 schon da; sie sind dann „k“) |
| Herkunft k / n | 9.116 / 6 | 9.118 / 4 |
| Texte | „Gemeindeverzeichnis 31.12.2020“ in der Annahme-Quelle und im Kopf der Datei | „… 31.03.2021“ |
| Task-Änderungen | – | Task 1 (Datei, URL, Prüfsumme in `quellen.json`, Download-Befehl), Task 2 (Zählungen 10.790, Gebietsstand), Task 4 (Minimum 9.945), Task 5 (Liste „n“, Herkunftszahlen), Task 6 (Kopf der Datei), Task 9 (nichts), Task 10 (README-Satz). Gegentests und Suche bleiben gleich. |

Nachteil des Vorschlags: Zwei Gemeinden, die vor dem 31.03.2021 entstanden, gelten in den Daten als „fehlt im Basisverzeichnis“. Die Stufe (Kreisstufe I) ist davon nicht betroffen, nur der Text der Quelle. Nachteil der Alternative: eine Datei, die nur ein Dritter vorhält; fällt die Archivkopie weg, bleibt die eingecheckte Rohdatei samt Prüfsumme.

### (b) Kreisstufe für nach 2021 neu gebildete Gemeinden

Betroffen sind (mit dem Vorschlag zu (a) sechs, mit der Alternative vier) Gemeinden, die im Basisverzeichnis fehlen: Jahnatal (4.738 Einwohner, aus Ostrau und Zschaitz-Ottewig) und Berga-Wünschendorf (5.813, aus Berga/Elster und Wünschendorf/Elster) sind echte Neubildungen nach 2021; Obergeckler (196) und Uder (6.066) sind nur neu geschlüsselt; Neitersen (1.115) und Greußen (5.439) entstanden zum 01.01.2021 und zählen nur bei Basis 31.12.2020. Alle sechs haben unter 10.000 Einwohner. Amtlich geregelt ist das nicht: WoGV § 1 und WoGG § 12 enthalten keine Regel zu Gebietsänderungen; die Vorbemerkung der Anlage sagt nur „nicht gesondert aufgeführte Gemeinden eines Kreises: Stufe des Kreises“.

| Option | Verhalten | Aufwand | Urteil |
|---|---|---|---|
| **A Kreisstufe, als Annahme gekennzeichnet (Vorschlag)** | Stufe des Kreises, `quelle` nennt die Annahme | keiner, im Plan enthalten | Stützt sich auf die einzige Auffangregel der Anlage. Gemeinden unter 10.000 Einwohnern (WoGG § 12 Abs. 3 Nr. 2) werden ohnehin nach Kreisen zusammengefasst. |
| B Stufe der Vorgängergemeinden, wenn einheitlich | Jahnatal und Berga-Wünschendorf erben die Stufe ihrer Vorgänger | zusätzliche Fusionstabelle, von Hand gepflegt (Fusionspartner stehen in keinem Verzeichnis, nur über Flächenheuristik) | Ergibt für alle sechs Gemeinden **dieselbe Stufe I**: Die Vorgänger (Ostrau 3.521, Zschaitz-Ottewig 1.311, Berga/Elster 3.224, Wünschendorf/Elster 2.755 Einwohner, die übrigen sind die umgeschlüsselten oder zum 01.01.2021 verschmolzenen Orte) standen alle nicht in der Anlage und trugen die Kreisstufe. Mehr Pflege ohne anderes Ergebnis. |
| C keine Stufe ausgeben | Treffer ohne Mietstufe, Nutzer muss sie selbst nennen | Ausgabetyp und Tool-Text ändern | Rechtlich am vorsichtigsten, für ein Plugin unbrauchbar: 4 bis 6 Orte mit zusammen unter 25.000 Einwohnern bekämen keine Berechnung. |

Empfehlung A. Die Annahme steht sichtbar im Feld `quelle` („Annahme: Gemeinde fehlt im Gemeindeverzeichnis …, es gilt die Stufe des Kreises“) und im Test. Greift die nächste Mietenstufenverordnung (Recht ab 2027), wird die Liste ohnehin neu erzeugt.

## Global Constraints

- Nur öffentliche Quellen. Jede Rohdatei trägt URL, Abrufdatum und SHA-256 in `data/roh/quellen.json`; Tests prüfen die Prüfsumme.
- Keine neue Abhängigkeit, kein `npx` mit fremden Paketen. Aufgerufen werden nur lokal installierte Programme (`npx vitest`, `npx tsc`, `tsx` über `npm run`, `node_modules/.bin/esbuild`).
- Namen und Stufen aus den Quellen bleiben wörtlich, auch Tippfehler der Anlage („Landeshaupstadt“, „Phillipsburg“). Korrigiert wird nie im Parser, sondern in der benannten Handzuordnung mit Begründung.
- Zuordnung nie raten: Gibt es keine eindeutige Zeile, bricht der Erzeuger mit der Liste der offenen Fälle ab (Spec 3.3). Eine Handzuordnung ohne passende Anlagezeile bricht ebenfalls ab, damit sie nicht still veraltet.
- Die erzeugte Datei enthält keinen Zeitstempel und nichts Zufälliges. Test: `data/mietstufen-2023.json` ist Byte für Byte das Ergebnis des Erzeugers aus `data/roh/`.
- `src/mietstufen/` ist Node-frei und importiert nur `../rechtsstand/typen` (Spec 3): kein `node:`-Modul, kein `process`, kein `Buffer`, kein Netz. Node-Code liegt in `scripts/`. Ein Test erzwingt das.
- Die MIT-Lizenz gilt nicht für `data/`. Kopf der JSON-Datei und README sagen das und nennen die Quelle (Lizenzbericht).
- Code-Bezeichner und Kommentare auf Deutsch, Teststil wie E1/E2: `describe("<Funktion>: <Thema>")`, explizite Vitest-Importe, Norm oder Quelle im Testnamen.
- Commits enden mit
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: <URL der ausführenden Session>
  ```
- Gearbeitet wird nur im Worktree `~/Developer/worktrees/wohngeld-rechner-e3` (Haupt-Repo liegt in iCloud). Kein Merge, kein Push. Handoffs bleiben in `handoffs/` und gitignored.
- Befehle ohne Pipe, wenn der Exit-Code zählt (`cmd; echo "exit=$?"`).

## Sollwerte und ihre Prüfung (08.10.2026)

Alle Zahlen unten sind in den Tests festgeschrieben. Prüfweg: „zwei Wege“ heißt, ein zweiter, unabhängiger Weg liefert dieselbe Zahl.

| Sollwert | Wert | Quelle | Prüfung |
|---|---|---|---|
| Zeilen der Anlage | 1.881 = 1.601 Gemeinden + 279 Kreise + 1 Inselzeile (Stufe V, kein Land) | `gesetze-im-internet.de/wogv/anlage.html` | zwei Wege: Python-`html.parser` (Datenbefund) und der TS-Regex-Parser dieses Plans; zusätzlich frisch gegen die Seite (`pruefe:mietstufen`, Exit 0) |
| Zeilen je Land | Gemeinden/Kreise: BW 259/35, BY 233/71, BE 1/0, BB 70/14, HB 2/0, HH 1/0, HE 171/21, MV 20/6, NI 205/35, NW 343/18, RP 47/24, SL 36/6, SN 68/10, ST 54/11, SH 56/11, TH 35/17 | Anlage | zwei Wege wie oben |
| Stufenverteilung der Anlage | Gemeinden I bis VII: 357, 477, 337, 219, 109, 66, 36; Kreise: 168, 66, 22, 16, 3, 2, 2 | Anlage | zwei Wege |
| Verzeichnis 31.12.2020 | 10.794 Gemeinden (ohne gemeindefreie Gebiete), 401 Kreise, davon 294 Landkreise; 16.068 Datenzeilen | Destatis GV-ISys | zwei Wege: `openpyxl` und der TS-xlsx-Leser |
| Verzeichnis 31.12.2025 | 10.751 Gemeinden, 400 Kreise, 294 Landkreise, 106 kreisfreie, 16.000 Datenzeilen | Destatis GV-ISys | zwei Wege |
| Zuordnung Anlage → Schlüssel | 1.601 Gemeinden, 279 Kreise, 0 offen, 0 Kollisionen. Verfahren Gemeinden: 1.554 Name, 5 Zusatzklasse, 18 Abkürzung, 15 Teilname, 3 Einwohner, 6 Hand; Kreise: 273 Name, 3 Abkürzung, 3 Hand | Verfahren des Plans | zwei Wege: Python-Prototyp (Datenbefund 4.2, gegen 31.03.2021) und TS-Port (gegen beide Stände) liefern für alle 1.880 Zeilen dieselben Schlüssel |
| Plausibilität der Zuordnung | jede zugeordnete Anlage-Gemeinde hat im Verzeichnis ≥ 9.900 Einwohner, Minimum 9.947 (Neustadt (Hessen)) | Anlage führt nur Gemeinden ab 10.000 einzeln (WoGG § 12 Abs. 3 Satz 1 Nr. 1) | Einwohnerzahlen aus dem Verzeichnis, unabhängig vom Namensabgleich. Toleranz 100 Einwohner (1 %), weil der Anlage-Stichtag (30.09.2020) in keinem Verzeichnis steht |
| Datei: Herkunft | 1.601 g, 9.116 k, 28 i, 6 n (Summe 10.751) | eigene Zählung | im Plan reproduziert, Prüfung im Test |
| Datei: Stufenverteilung aller 10.751 Gemeinden | I bis VII: 6.311, 2.619, 917, 580, 176, 97, 51 | eigene Zählung | Test; unabhängig vom Verzeichnisstand der Zuordnung (beide Stände ergeben dieselbe Datei) |
| Schlüsselwechsel seit Basisverzeichnis | Langelsheim, Stadt 03153007 → 03153019 (I); Eisenach, Stadt 16056000 → 16063105 (II) | Vergleich der Verzeichnisse 2020 und 2025 | Test |
| 28 Inseln | AGS-Liste in `erzeugen.ts`; wörtlich gleich § 12 Abs. 4a WoGG, Name im Verzeichnis passt | `gesetze-im-internet.de/wogg/__12.html`, Verzeichnis 2025 | Test gegen die eingecheckte Gesetzesseite; Prüfskript gegen die Live-Seite |
| BMWSB-Beispiele, Stufen | Jüterbog I, Ludwigshafen IV, Leipzig II, Kreis Schleswig-Flensburg I, Wiesbaden VI, München VII, Weimar III, Friedrichshafen V, Attendorn II, Lübeck IV, Neubrandenburg II | BMWSB-Rechenbeispiele 2025 (`test/fixtures/bmwsb-2025.ts`) | alle elf stimmen mit der Anlage-Zeile überein (Test 6) |
| Taufkirchen (Kreis München) | Stufe II bei Kreisstufe VII (amtlicher Ausreißer) | Anlage Bayern: Gemeinde „Taufkirchen“ II, Kreis „München“ VII | Anlage; extern bestätigt von bbb-bayern.de (Gemeinde Taufkirchen bei München „entsprechend ihrer Mietenstufe“ Ortsklasse II, Landkreis VII) und smart-rechner.de/wohngeld/ratgeber/mietstufen_bayern.php (Tabellenzeilen „Taufkirchen 2 \| 3“, „Kreis München 7 \| 7“) |
| Einzelwerte der Suche | siehe Test 6 in Task 9 (Neustadt 5 Kandidaten, Weimar 2, Eisenach 2, Taufkirchen 3, Frankfurt 2) | Verzeichnis 2025 + Anlage | Ausgabe des Prototyps und der TS-Suche stimmten überein; Mutationstest in Task 10 |
| Rohdateien | SHA-256: `anlage.html` `e71af5b9…c906b`, `wogg-12.html` `feb04fe9…81fc`, `gv-31122020.xlsx` `6027130d…dff6de`, `gv-31122025.xlsx` `5bfb8b7a…00e79` | siehe Task 1 | zweimal geladen am 08.10.2026, identisch |

**Rundungen:** keine. Einwohnerzahlen sind ganze Zahlen, Stufen ganze Zahlen 1 bis 7.
**Schwellen (alle als Konstanten benannt):** `EINWOHNERSCHWELLE = 10_000` (Gemeinde mit „10 000 und mehr“ steht einzeln; genau 10.000 zählt, 9.999 nicht); Plausibilität ab 9.900; Kandidatenliste höchstens 25 (`MAX_KANDIDATEN`), Vorschläge höchstens 5 (`MAX_AEHNLICH`); Tippfehler-Abstand 2 ab fünf Zeichen (`ABSTAND_LANG`), 1 bei vier (`ABSTAND_KURZ`), darunter keine Vorschläge; Teilname-Treffer ab 5 Zeichen in der Zuordnung.

## Rulings in diesem Plan

1. **Namen von heute, Stufen von 2021.** Gesucht wird in den Namen des Verzeichnisses 31.12.2025; die Stufe kommt über den Schlüssel (AGS) aus der Anlage. Beide Verzeichnisstände liegen in `data/roh/`.
2. **Zuordnung offline, nicht zur Laufzeit.** Die Verfahren A bis D und die neun Handzuordnungen laufen im Erzeuger. Die Laufzeit kennt nur noch Name → Gemeinde → Stufe.
3. **Reihenfolge der Stufen ist Teil des Ergebnisses.** A: gleicher Schlüssel A (Abkürzungen aufgelöst, Zusatz nach dem Komma weg); B: bei mehreren die Zusatzklasse (Stadt gegen Nicht-Stadt über das Textkennzeichen); C: gleicher Schlüssel B (am = an, St. = Sankt, erster Teil bei zweisprachigen Namen); D: Teilname, mindestens 5 Zeichen. Danach bei mehreren Namensvettern der eine mit mindestens 10.000 Einwohnern (Malsch, Eching, Taufkirchen). Der Zusatz nach dem Komma wird nie pauschal verworfen: „Weingarten, Baden“ ist Handzuordnung.
4. **Stufenvorrang einer Gemeinde:** Insel (28 AGS) vor eigener Anlagezeile vor Kreisstufe. Die Inselstufe liest der Erzeuger aus der Inselzeile der Anlage, sie ist nicht fest verdrahtet.
5. **Mehrdeutig statt raten.** Ein Name mit mehreren Gemeinden gibt die Kandidatenliste. Teilnamen („Bad Homburg“, „Ludwigshafen“) sind nie ein eindeutiger Treffer, nur Vorschlag; die Rückfrage übernimmt das Tool in E4. Treffer nur über Klammer- oder Schrägstrichzusatz (Frankfurt (Oder)) nehmen Orte mit, deren Name mit der Eingabe beginnt (Frankfurt am Main).
6. **Kreisvergleich ohne Zusätze.** „Landkreis München“ und „München“ sind für den Kreisfilter gleich, ebenso Stadt und Landkreis Leipzig. Das schadet nicht, weil eine kreisfreie Stadt nur eine Gemeinde hat.
7. **Anzeigenamen unverändert** aus dem Verzeichnis, auch Bayerns Kürzel („Dießen am Ammersee, M“, „Lauf a.d.Pegnitz, St“). Zusätze der Eingabe („Stadt“, „Markt“) werden verstanden, aber nicht ausgegeben.
8. **Ergänzung zur Spec-Ausgabe:** `SuchErgebnis` führt bei „mehrdeutig“ die Gesamtzahl `anzahl` und bei „nicht gefunden“ die Liste `aehnlich`. Die Felder des Treffers sind genau `gemeinde, kreis, land, mietstufe, quelle` (Spec 4). E4 entscheidet, wie das Tool sie ausgibt.
9. **Nicht Teil von E3:** Postleitzahlen (Spec 3.3), das MCP-Tool selbst (E4), die zwei bewohnten gemeindefreien Gebiete (Textkennzeichen 65; sie liegen nach WoGG § 12 Abs. 3 Nr. 2 in der Kreisstufe, stehen aber nicht in der Suche), Namen von Gemeinden, die seit 2020 eingemeindet wurden (45 Schlüssel weggefallen: „nicht gefunden“).

## Review Focus

1. Zuordnung (Task 4): Die 15 Teilname-Fälle, die 3 Einwohner-Fälle und die 9 Handzuordnungen stehen im Anhang A mit AGS und Einwohnerzahl. Sie sind nur über Name und Einwohnerzahl geprüft, nicht gegen eine zweite Quelle. Das Minimum von 9.947 Einwohnern (Task 4) fängt falsche Namensvettern, nicht jeden Irrtum.
2. Inseln (Task 5, Test 6): Pellworm, Borkum und Hiddensee müssen V haben, obwohl ihr Kreis I oder II hat. Der Test würde die Kreisstufe sofort erkennen.
3. Ausreißer (Task 5, 9): Taufkirchen hat II im Kreis mit VII. Wer die Stufe aus dem Kreis ableitet, wenn eine Gemeindezeile existiert, rechnet falsch.
4. Mehrdeutigkeit (Task 8, 9): „Neustadt“, „Weimar“, „Eisenach“, „Frankfurt“ und „Taufkirchen“ liefern Kandidaten; mit Land oder Kreis genau einen Treffer.
5. Regenerierbarkeit und Quellenabgleich (Task 6): Die eingecheckte Datei ist reproduzierbar, und `npm run pruefe:mietstufen` vergleicht Zeile für Zeile mit der Live-Seite.

---

### Task 1: Rohdaten, Prüfsummen und Datenmodell

**Files:**
- Create: `data/roh/anlage.html`, `data/roh/wogg-12.html`, `data/roh/gv-31122020.xlsx`, `data/roh/gv-31122025.xlsx` (unverändert aus den Quellen)
- Create: `data/roh/quellen.json`
- Create: `src/mietstufen/typen.ts`
- Create: `scripts/mietstufen/quellen.ts`
- Test: `test/scripts/rohdaten.test.ts`

**Interfaces:**
- Consumes: `Mietstufe` aus `src/rechtsstand/typen.ts`
- Produces: `MietstufenDaten`, `GemeindeZeile`, `Herkunft`, `HERKUENFTE`, `MietstufenMeta`, `QuellenNachweis`, `MietstufenTreffer`, `SuchEingabe`, `SuchErgebnis` (alle `src/mietstufen/typen.ts`); `RohQuelle`, `RohQuellen`, `leseQuellen()`, `leseRohdatei(q)`, `sha256(daten)`, `WURZEL`, `ROH`, `DATEI_DATEN` (`scripts/mietstufen/quellen.ts`)

- [ ] **Step 1: Ausgangslage prüfen und installieren**

Run:
```bash
cd ~/Developer/worktrees/wohngeld-rechner-e3
git branch --show-current
git status --short
npm ci
npx vitest run
npx tsc --noEmit; echo "tsc=$?"
```
Expected: Branch `bau/e3`; `git status` leer (der Lizenzbericht ist im Plan-Commit); `178 passed`; `tsc=0`. Nicht `node_modules` aus dem iCloud-Haupt-Repo verlinken.

- [ ] **Step 2: Rohdaten laden**

Run (Node 22, ohne `curl`):
```bash
mkdir -p data/roh && cd data/roh
node --input-type=module -e '
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const B = "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GVAuszugJ/";
const quellen = {
  "anlage.html": "https://www.gesetze-im-internet.de/wogv/anlage.html",
  "wogg-12.html": "https://www.gesetze-im-internet.de/wogg/__12.html",
  "gv-31122020.xlsx": B + "31122020_Auszug_GV.xlsx?__blob=publicationFile",
  "gv-31122025.xlsx": B + "31122025_Auszug_GV.xlsx?__blob=publicationFile",
};
for (const [datei, url] of Object.entries(quellen)) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + " " + r.status);
  const d = Buffer.from(await r.arrayBuffer());
  writeFileSync(datei, d);
  console.log(createHash("sha256").update(d).digest("hex"), datei, d.length);
}'
cd ../..
```
Expected (Prüfsumme, Datei, Bytes):
```
e71af5b96726aedab6761741cff53d4029f2652af6e21e0400cf9f1a340c906b anlage.html 256066
feb04fe970a5123b0de4cf306e50224cc40e5cec7c60021e601257e30b9a81fc wogg-12.html 16031
6027130dd43b40593aacdf60ca161c17cb2148cc07dd013518f34d2f37dff6de gv-31122020.xlsx 2060890
5bfb8b7a5ce0dc65988ff30b28146ec2f08dd0b29756c9c8c427cbd7baa00e79 gv-31122025.xlsx 1867597
```
Weicht eine Zeile ab, hat sich die Quelle seit dem 08.10.2026 geändert: nicht weiterbauen, melden. Fallback für die Rohdaten (am 08.10.2026 geprüfte Kopien): `~/Documents/Claude-Projekte/wohngeld-rechner/handoffs/e3-daten/roh/` mit den Dateinamen `anlage.html`, `wogg-12.html`, `gv_31122020.xlsx`, `gv_31122025.xlsx` (Unterstrich statt Bindestrich beim Kopieren umbenennen).

- [ ] **Step 3: `data/roh/quellen.json` anlegen**

```json
{
  "anlage": {
    "datei": "anlage.html",
    "titel": "Anlage (zu § 1 Absatz 3) Mietenstufen der Gemeinden nach Ländern ab 1. Januar 2023, WoGV",
    "url": "https://www.gesetze-im-internet.de/wogv/anlage.html",
    "abruf": "2026-10-08",
    "sha256": "e71af5b96726aedab6761741cff53d4029f2652af6e21e0400cf9f1a340c906b"
  },
  "wogg_12": {
    "datei": "wogg-12.html",
    "titel": "§ 12 WoGG, Höchstbeträge für Miete und Belastung (Abs. 4a: Inseln ohne Festlandanschluss)",
    "url": "https://www.gesetze-im-internet.de/wogg/__12.html",
    "abruf": "2026-10-08",
    "sha256": "feb04fe970a5123b0de4cf306e50224cc40e5cec7c60021e601257e30b9a81fc"
  },
  "gv_basis": {
    "datei": "gv-31122020.xlsx",
    "titel": "Gemeindeverzeichnis, Auszug GV, Gebietsstand 31.12.2020",
    "url": "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GVAuszugJ/31122020_Auszug_GV.xlsx?__blob=publicationFile",
    "abruf": "2026-10-08",
    "sha256": "6027130dd43b40593aacdf60ca161c17cb2148cc07dd013518f34d2f37dff6de"
  },
  "gv_aktuell": {
    "datei": "gv-31122025.xlsx",
    "titel": "Gemeindeverzeichnis, Auszug GV, Gebietsstand 31.12.2025",
    "url": "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GVAuszugJ/31122025_Auszug_GV.xlsx?__blob=publicationFile",
    "abruf": "2026-10-08",
    "sha256": "5bfb8b7a5ce0dc65988ff30b28146ec2f08dd0b29756c9c8c427cbd7baa00e79"
  }
}
```

- [ ] **Step 4: Failing test schreiben** (`test/scripts/rohdaten.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { leseQuellen, leseRohdatei, sha256 } from "../../scripts/mietstufen/quellen";

describe("Rohdaten: Prüfsummen und Herkunft (docs/quellen/2026-10-08-recherche-lizenz-gemeindeverzeichnis.md)", () => {
  const quellen = leseQuellen();
  for (const [schluessel, q] of Object.entries(quellen)) {
    it(`${q.datei} ist byteweise die abgerufene Quelle (${schluessel})`, () => {
      expect(sha256(leseRohdatei(q))).toBe(q.sha256);
      expect(q.url).toMatch(/^https:\/\/(www\.gesetze-im-internet\.de|www\.destatis\.de)\//);
      expect(q.abruf).toBe("2026-10-08");
    });
  }
});
```

- [ ] **Step 5: Test rot laufen lassen**

Run: `npx vitest run test/scripts/rohdaten.test.ts`
Expected: FAIL, Modul `scripts/mietstufen/quellen` nicht gefunden.

- [ ] **Step 6: Datenmodell und Quellenleser anlegen**

`src/mietstufen/typen.ts`:

```ts
import type { Mietstufe } from "../rechtsstand/typen";

// Herkunft der Stufe einer Gemeinde:
//   g  eigene Zeile in der Gemeindetabelle der Anlage
//   k  Stufe des Kreises (Vorbemerkung der Anlage: Gemeinden ohne eigene Zeile)
//   i  Insel ohne Festlandanschluss (§ 12 Abs. 4a WoGG), gemeinsame Stufe der Anlage
//   n  Gemeinde fehlt im Basisverzeichnis (neu gebildet oder neu geschlüsselt), Kreisstufe als Annahme
export type Herkunft = "g" | "k" | "i" | "n";

export const HERKUENFTE: readonly Herkunft[] = ["g", "k", "i", "n"];

// [AGS (8 Stellen), Name im Gemeindeverzeichnis, Mietstufe, Herkunft]
export type GemeindeZeile = readonly [ags: string, name: string, stufe: Mietstufe, herkunft: Herkunft];

export interface QuellenNachweis {
  titel: string;
  url: string;
  abruf: string; // JJJJ-MM-TT
  sha256: string;
  gebietsstand?: string; // TT.MM.JJJJ, nur beim Gemeindeverzeichnis
}

export interface MietstufenMeta {
  rechtsgrundlage: string;
  anlage: QuellenNachweis;
  gemeindeverzeichnis_basis: QuellenNachweis; // Zuordnung Anlage -> Schlüssel
  gemeindeverzeichnis_aktuell: QuellenNachweis; // Namen und Kreise, die Nutzer heute eintippen
  hinweis: string; // Quellennachweis und Kennzeichnung als verändert (Destatis-Vermerk)
  anzahl: { anlage_zeilen: number; gemeinden: number; kreise: number; je_herkunft: Record<Herkunft, number> };
}

export interface MietstufenDaten {
  meta: MietstufenMeta;
  laender: Record<string, string>; // "01" -> "Schleswig-Holstein"
  kreise: Record<string, string>; // Kreisschlüssel (5 Stellen) -> Name
  gemeinden: readonly GemeindeZeile[]; // sortiert nach AGS
}

export interface MietstufenTreffer {
  gemeinde: string;
  kreis: string;
  land: string;
  mietstufe: Mietstufe;
  quelle: string;
}

export interface SuchEingabe {
  gemeinde: string;
  kreis?: string;
  land?: string;
}

export type SuchErgebnis =
  | { status: "eindeutig"; treffer: MietstufenTreffer }
  | { status: "mehrdeutig"; anzahl: number; kandidaten: MietstufenTreffer[] }
  | { status: "nicht_gefunden"; aehnlich: MietstufenTreffer[] };
```

`scripts/mietstufen/quellen.ts`:

```ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { QuellenNachweis } from "../../src/mietstufen/typen";

export const WURZEL = resolve(import.meta.dirname, "..", "..");
export const ROH = resolve(WURZEL, "data", "roh");
export const DATEI_DATEN = resolve(WURZEL, "data", "mietstufen-2023.json");

// Eintrag in data/roh/quellen.json: Herkunft, Abrufdatum und Prüfsumme je Rohdatei.
export interface RohQuelle extends QuellenNachweis {
  datei: string;
}

export interface RohQuellen {
  anlage: RohQuelle;
  wogg_12: RohQuelle;
  gv_basis: RohQuelle;
  gv_aktuell: RohQuelle;
}

export const sha256 = (daten: Buffer | string): string => createHash("sha256").update(daten).digest("hex");

export function leseQuellen(): RohQuellen {
  return JSON.parse(readFileSync(resolve(ROH, "quellen.json"), "utf8")) as RohQuellen;
}

export function leseRohdatei(q: RohQuelle): Buffer {
  return readFileSync(resolve(ROH, q.datei));
}
```

- [ ] **Step 7: Tests und Typprüfung**

Run: `npx vitest run test/scripts/rohdaten.test.ts && npx tsc --noEmit; echo "exit=$?"`
Expected: `4 passed`, `exit=0`.

- [ ] **Step 8: Commit**

```bash
git add data/roh src/mietstufen scripts/mietstufen test/scripts
git commit -m "E3: Rohdaten (Anlage WoGV, § 12 WoGG, Gemeindeverzeichnis 2020 und 2025) mit Prüfsummen und Datenmodell"
```
(plus die beiden Trailer-Zeilen aus den Global Constraints)

---

### Task 2: xlsx-Leser und Gemeindeverzeichnis

**Files:**
- Create: `scripts/mietstufen/xlsx.ts`
- Create: `scripts/mietstufen/gv.ts`
- Test: `test/scripts/gv.test.ts`

**Interfaces:**
- Consumes: `leseQuellen`, `leseRohdatei` (Task 1)
- Produces: `leseXlsx(daten: Buffer): Blatt[]`; `leseGv(daten: Buffer): Gv` mit `Gv { gebietsstand, vermerk, gemeinden: GvGemeinde[], kreise: GvKreis[] }`

Das Verzeichnis ist ein ZIP mit XML. Der Leser holt nur Blattnamen, Zeichenketten und Zellwerte als Text; AGS und Kreisschlüssel stehen als Text mit führenden Nullen. Die Datenzeilen erkennt der Leser an der Satzart in Spalte A (`'10'` bis `'60'`), nicht an Kopfzeilenpositionen, weil sich der Kopf zwischen den Ausgaben unterscheidet. Satzart 60 ohne Textkennzeichen 65/66 (gemeindefreie Gebiete) sind die politisch selbständigen Gemeinden; Satzart 40 sind die Kreise (Textkennzeichen 41, 42 kreisfrei; 43, 44, 45 Landkreise).

- [ ] **Step 1: Failing test schreiben** (`test/scripts/gv.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { leseGv } from "../../scripts/mietstufen/gv";
import { leseXlsx } from "../../scripts/mietstufen/xlsx";
import { leseQuellen, leseRohdatei } from "../../scripts/mietstufen/quellen";

const SATZARTEN = new Set(["10", "20", "30", "40", "50", "60"]);

describe("xlsx-Leser: Gemeindeverzeichnis", () => {
  it("liest Blattnamen und alle Datenzeilen (Zählung unabhängig mit openpyxl am 08.10.2026)", () => {
    const q = leseQuellen();
    const a = leseXlsx(leseRohdatei(q.gv_basis));
    const b = leseXlsx(leseRohdatei(q.gv_aktuell));
    expect(a.map((x) => x.name)).toEqual(["Inhalt", "Onlineprodukt_Gemeinden"]);
    expect(b.map((x) => x.name)).toEqual(["Inhalt", "Onlineprodukt_Gemeinden31122025"]);
    expect(a[1]!.zeilen.filter((z) => SATZARTEN.has(z[0] ?? "")).length).toBe(16068);
    expect(b[1]!.zeilen.filter((z) => SATZARTEN.has(z[0] ?? "")).length).toBe(16000);
  });

  it("lehnt Dateien ohne ZIP-Aufbau ab", () => {
    expect(() => leseXlsx(Buffer.from("das ist kein zip, nur Text mit genug Zeichen drin"))).toThrow(/ZIP/);
  });
});

describe("Gemeindeverzeichnis lesen: Zählungen und Vermerk", () => {
  const q = leseQuellen();
  const basis = leseGv(leseRohdatei(q.gv_basis));
  const aktuell = leseGv(leseRohdatei(q.gv_aktuell));

  it("Gebietsstand aus dem Blatt Inhalt", () => {
    expect(basis.gebietsstand).toBe("31.12.2020");
    expect(aktuell.gebietsstand).toBe("31.12.2025");
  });

  it("Gemeinden ohne gemeindefreie Gebiete, Kreise und Landkreise (Datenbefund 2.2, 3.3)", () => {
    expect(basis.gemeinden).toHaveLength(10794);
    expect(basis.kreise).toHaveLength(401);
    expect(aktuell.gemeinden).toHaveLength(10751);
    expect(aktuell.kreise).toHaveLength(400);
    expect(basis.kreise.filter((k) => ["43", "44", "45"].includes(k.textkennzeichen))).toHaveLength(294);
    expect(aktuell.kreise.filter((k) => ["43", "44", "45"].includes(k.textkennzeichen))).toHaveLength(294);
    expect(aktuell.kreise.filter((k) => k.kreisfrei)).toHaveLength(106);
  });

  it("AGS führende Nullen bleiben erhalten, Einwohner sind Zahlen", () => {
    expect(aktuell.gemeinden[0]).toMatchObject({ ags: "01001000", name: "Flensburg, Stadt" });
    expect(aktuell.gemeinden.every((g) => /^\d{8}$/.test(g.ags))).toBe(true);
    expect(aktuell.gemeinden.every((g) => g.einwohner !== null && Number.isFinite(g.einwohner))).toBe(true);
  });

  it("Verbreitungsvermerk steht in beiden Dateien (Lizenzbericht: Quellenangabe Pflicht, Änderungen kennzeichnen)", () => {
    for (const gv of [basis, aktuell]) {
      expect(gv.vermerk).toContain("Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder");
      expect(gv.vermerk).toContain("Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet.");
    }
  });
});
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `npx vitest run test/scripts/gv.test.ts`
Expected: FAIL, `scripts/mietstufen/xlsx` nicht gefunden.

- [ ] **Step 3: Implementieren**

`scripts/mietstufen/xlsx.ts`:

```ts
import { inflateRawSync } from "node:zlib";

// Minimaler Leser für .xlsx (ZIP mit XML), nur das, was die Gemeindeverzeichnisse brauchen:
// Blattnamen, Zeichenketten und Zellwerte als Text. Keine Formeln, keine Datumsformate.
export interface Blatt {
  name: string;
  zeilen: (string | null)[][];
}

const ENDE_SIGNATUR = 0x06054b50;
const ZENTRAL_SIGNATUR = 0x02014b50;

function entitaeten(s: string): string {
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
```

`scripts/mietstufen/gv.ts`:

```ts
import { leseXlsx } from "./xlsx";

// Destatis-Gemeindeverzeichnis (GV-ISys), Auszug "Alle politisch selbständigen Gemeinden".
// Blatt 1 "Inhalt" trägt Gebietsstand und Verbreitungsvermerk, Blatt 2 die Daten.
export interface GvGemeinde {
  ags: string; // 8 Stellen: Land (2) + Regierungsbezirk (1) + Kreis (2) + Gemeinde (3)
  name: string;
  textkennzeichen: string; // "61" bis "67" bei Gemeinden (Stadt, Markt, ...)
  einwohner: number | null;
}

export interface GvKreis {
  kkz: string; // 5 Stellen: Land + Regierungsbezirk + Kreis
  name: string;
  textkennzeichen: string; // 41 kreisfreie Stadt, 42 Stadtkreis, 43 Kreis, 44 Landkreis, 45 Regionalverband
  kreisfrei: boolean;
}

export interface Gv {
  gebietsstand: string; // "TT.MM.JJJJ" aus dem Blatt "Inhalt"
  vermerk: string; // Verbreitungsvermerk wörtlich, Zeilen mit " / " verbunden
  gemeinden: GvGemeinde[]; // Satzart 60 ohne gemeindefreie Gebiete (Textkennzeichen 65, 66)
  kreise: GvKreis[]; // Satzart 40
}

export function leseGv(daten: Buffer): Gv {
  const [inhalt, datenblatt] = leseXlsx(daten);
  if (!inhalt || !datenblatt || !datenblatt.name.startsWith("Onlineprodukt_Gemeinden")) {
    throw new Error("Gemeindeverzeichnis: Blattaufbau unbekannt (erwartet Inhalt, Onlineprodukt_Gemeinden*)");
  }
  const texte = inhalt.zeilen.flatMap((z) => z.filter((c): c is string => c !== null));
  const stand = texte.map((t) => /Gebietsstand:\s*(\d{2}\.\d{2}\.\d{4})/.exec(t)?.[1]).find((s) => s !== undefined);
  if (!stand) throw new Error("Gemeindeverzeichnis: Gebietsstand im Blatt Inhalt nicht gefunden");
  const ab = texte.findIndex((t) => t.startsWith("©"));
  const vermerk = ab < 0 ? "" : texte.slice(ab, ab + 3).map((t) => t.trim()).join(" / ");

  const gemeinden: GvGemeinde[] = [];
  const kreise: GvKreis[] = [];
  for (const z of datenblatt.zeilen) {
    const satzart = z[0];
    const tk = z[1];
    const name = z[7];
    if (!name) continue;
    if (satzart === "60" && tk !== "65" && tk !== "66") {
      const ags = `${z[2] ?? ""}${z[3] ?? ""}${z[4] ?? ""}${z[6] ?? ""}`;
      if (!/^\d{8}$/.test(ags)) throw new Error(`Gemeindeverzeichnis: AGS "${ags}" bei ${name}`);
      const ew = z[9];
      gemeinden.push({ ags, name, textkennzeichen: tk ?? "", einwohner: ew === null || ew === undefined ? null : Number(ew) });
    } else if (satzart === "40") {
      const kkz = `${z[2] ?? ""}${z[3] ?? ""}${z[4] ?? ""}`;
      if (!/^\d{5}$/.test(kkz)) throw new Error(`Gemeindeverzeichnis: Kreisschlüssel "${kkz}" bei ${name}`);
      kreise.push({ kkz, name, textkennzeichen: tk ?? "", kreisfrei: tk === "41" || tk === "42" });
    }
  }
  return { gebietsstand: stand, vermerk, gemeinden, kreise };
}
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run test/scripts/gv.test.ts && npx tsc --noEmit; echo "exit=$?"`
Expected: `6 passed`, `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/mietstufen test/scripts
git commit -m "E3: xlsx-Leser und Gemeindeverzeichnis lesen (Gebietsstand, Gemeinden, Kreise, Verbreitungsvermerk)"
```

---

### Task 3: Anlage lesen

**Files:**
- Create: `scripts/mietstufen/anlage.ts`
- Create: `scripts/mietstufen/eingabe.ts` (erste Fassung: nur Leser der Rohdateien)
- Test: `test/scripts/anlage.test.ts`

**Interfaces:**
- Consumes: `Mietstufe` (`src/rechtsstand/typen.ts`), `leseGv`, `leseQuellen`, `leseRohdatei`
- Produces: `parseAnlage(html: string): AnlageZeile[]` mit `AnlageZeile { land: string | null; art: "gemeinde" | "kreis" | "insel"; name: string; stufe: Mietstufe }`; `leseAnlageRoh(q)`, `leseGvRoh(q)`

Die Seite hat je Land eine Gemeindetabelle und meist eine Kreistabelle, am Ende die Tabelle „Gemeinsame Mietenstufe“ ohne Land. Stolpersteine, die der Parser kennen muss (Datenbefund 1.1): Die Kreistabelle von Rheinland-Pfalz hat kein `<thead>`, ihre Kopfzeile steht im `<tbody>`; die Inselzeile steht hinter Thüringen, gehört aber zu keinem Land; Umlaute stehen als numerische Entitäten; „Wiesbaden, Landeshaupstadt“ trägt ein `<span>` und einen amtlichen Tippfehler.

- [ ] **Step 1: Failing test schreiben** (`test/scripts/anlage.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { parseAnlage } from "../../scripts/mietstufen/anlage";
import { leseAnlageRoh } from "../../scripts/mietstufen/eingabe";
import { leseQuellen } from "../../scripts/mietstufen/quellen";

describe("Anlage lesen (WoGV Anlage zu § 1 Abs. 3)", () => {
  const zeilen = leseAnlageRoh(leseQuellen().anlage);
  const gemeinden = zeilen.filter((z) => z.art === "gemeinde");
  const kreise = zeilen.filter((z) => z.art === "kreis");

  it("1.881 Zeilen: 1.601 Gemeinden, 279 Kreise, 1 Inselzeile (Spec 3.3, Datenbefund 1.2)", () => {
    expect(zeilen).toHaveLength(1881);
    expect(gemeinden).toHaveLength(1601);
    expect(kreise).toHaveLength(279);
    expect(zeilen.filter((z) => z.art === "insel")).toEqual([{ land: null, art: "insel", name: "Inseln ohne Festlandanschluss", stufe: 5 }]);
  });

  it("Zeilen je Land stimmen mit der Zählung des Datenbefunds überein (inkl. Rheinland-Pfalz ohne thead)", () => {
    const soll: Record<string, [number, number]> = {
      "Baden-Württemberg": [259, 35], Bayern: [233, 71], Berlin: [1, 0], Brandenburg: [70, 14], Bremen: [2, 0], Hamburg: [1, 0],
      Hessen: [171, 21], "Mecklenburg-Vorpommern": [20, 6], Niedersachsen: [205, 35], "Nordrhein-Westfalen": [343, 18],
      "Rheinland-Pfalz": [47, 24], Saarland: [36, 6], Sachsen: [68, 10], "Sachsen-Anhalt": [54, 11], "Schleswig-Holstein": [56, 11], Thüringen: [35, 17],
    };
    const ist = Object.fromEntries(Object.keys(soll).map((land) => [land, [gemeinden.filter((z) => z.land === land).length, kreise.filter((z) => z.land === land).length]]));
    expect(ist).toEqual(soll);
  });

  it("Stufenverteilung (Datenbefund 1.2)", () => {
    const zaehle = (liste: typeof zeilen) => [1, 2, 3, 4, 5, 6, 7].map((s) => liste.filter((z) => z.stufe === s).length);
    expect(zaehle(gemeinden)).toEqual([357, 477, 337, 219, 109, 66, 36]);
    expect(zaehle(kreise)).toEqual([168, 66, 22, 16, 3, 2, 2]);
  });

  it("liest Namen wörtlich, auch Tippfehler der Anlage und Umlaute aus Entitäten", () => {
    const stufe = (land: string, art: string, name: string) => zeilen.find((z) => z.land === land && z.art === art && z.name === name)?.stufe;
    expect(stufe("Hessen", "gemeinde", "Wiesbaden, Landeshaupstadt")).toBe(6);
    expect(stufe("Baden-Württemberg", "gemeinde", "Phillipsburg, Stadt")).toBe(2);
    expect(stufe("Bayern", "gemeinde", "München")).toBe(7);
    expect(stufe("Sachsen", "kreis", "Leipzig")).toBe(1);
    expect(stufe("Rheinland-Pfalz", "kreis", "Ahrweiler")).toBe(1);
    expect(zeilen.some((z) => /&|<|>/.test(z.name))).toBe(false);
  });
});

describe("parseAnlage: Fehlerfälle", () => {
  const kopf = '<div><span>Land:</span>&#160;<span style="font-weight:bold">Testland</span></div>';
  const tabelle = (art: string, zeilen: string) => `${kopf}<table><thead><tr><th>${art}</th><th>Mietenstufe</th></tr></thead><tbody>${zeilen}</tbody></table>`;

  it("nimmt die Kopfzeile auch aus dem tbody (Rheinland-Pfalz)", () => {
    const html = `${kopf}<table><tbody><tr><td>Kreis</td><td>Mietenstufe</td></tr><tr><td>Ahrweiler</td><td>I</td></tr></tbody></table>`;
    expect(parseAnlage(html)).toEqual([{ land: "Testland", art: "kreis", name: "Ahrweiler", stufe: 1 }]);
  });

  it("bricht ab bei unbekannter Stufe, fremder Tabelle und Zeile mit drei Zellen", () => {
    expect(() => parseAnlage(tabelle("Gemeinde", "<tr><td>A</td><td>VIII</td></tr>"))).toThrow(/nicht lesbar/);
    expect(() => parseAnlage(tabelle("Ort", "<tr><td>A</td><td>I</td></tr>"))).toThrow(/unbekannte Tabelle/);
    expect(() => parseAnlage(tabelle("Gemeinde", "<tr><td>A</td><td>I</td><td>x</td></tr>"))).toThrow(/nicht lesbar/);
  });
});
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `npx vitest run test/scripts/anlage.test.ts`
Expected: FAIL, `scripts/mietstufen/anlage` nicht gefunden.

- [ ] **Step 3: Implementieren**

`scripts/mietstufen/anlage.ts`:

```ts
import type { Mietstufe } from "../../src/rechtsstand/typen";

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

function entitaeten(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

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
```

`scripts/mietstufen/eingabe.ts` (wird in Task 5 ersetzt):

```ts
import { parseAnlage, type AnlageZeile } from "./anlage";
import { leseGv, type Gv } from "./gv";
import { leseRohdatei, type RohQuelle } from "./quellen";

// Die Anlage ist ASCII mit numerischen Entitäten; latin1 liest jedes Byte unverändert.
export function leseAnlageRoh(q: RohQuelle): AnlageZeile[] {
  return parseAnlage(leseRohdatei(q).toString("latin1"));
}

export function leseGvRoh(q: RohQuelle): Gv {
  return leseGv(leseRohdatei(q));
}
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run test/scripts/anlage.test.ts && npx tsc --noEmit; echo "exit=$?"`
Expected: `6 passed`, `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/mietstufen test/scripts
git commit -m "E3: Anlage zu § 1 Abs. 3 WoGV lesen (1.881 Zeilen, RLP-Kreistabelle ohne thead, Inselzeile ohne Land)"
```

---

### Task 4: Verknüpfung Anlage-Zeile → Schlüssel

**Files:**
- Create: `scripts/mietstufen/verknuepfen.ts`
- Test: `test/scripts/verknuepfen.test.ts`

**Interfaces:**
- Consumes: `AnlageZeile` (Task 3), `Gv`, `GvGemeinde`, `GvKreis` (Task 2)
- Produces: `verknuepfe(anlage, gv, handzuordnung = HANDZUORDNUNG): Verknuepfung`; `findeKandidaten(name, pool)`; `waehleGrosse(kandidaten)`; `schluesselA/B(name)`; `HANDZUORDNUNG`, `LAENDER`, `EINWOHNERSCHWELLE`; Typen `Verfahren`, `GemeindeZuordnung`, `KreisZuordnung`, `OffenerFall`, `Verknuepfung`

Das ist der heikelste Baustein. Die Anlage schreibt „Phillipsburg, Stadt“, „Burgkirchen a. d. Alz“, „Cottbus, Stadt“; das Verzeichnis „Philippsburg, Stadt“, „Burgkirchen a.d.Alz“, „Cottbus/Chóśebuz, Stadt“. Die Stufen A bis D (Ruling 3) lösen 1.827 von 1.880 Zeilen ohne Hilfe, 3 über die Einwohnerzahl, 9 stehen in `HANDZUORDNUNG`. Die Reihenfolge der Stufen gehört zum Ergebnis; das Verhalten ist durch die Tests unten festgeschrieben und gegen den Python-Prototyp des Datenbefunds abgeglichen. Das Ergebnis wird nicht zur Laufzeit gerechnet.

- [ ] **Step 1: Failing test schreiben** (`test/scripts/verknuepfen.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import type { AnlageZeile } from "../../scripts/mietstufen/anlage";
import { leseAnlageRoh, leseGvRoh } from "../../scripts/mietstufen/eingabe";
import type { Gv, GvGemeinde } from "../../scripts/mietstufen/gv";
import { leseQuellen } from "../../scripts/mietstufen/quellen";
import {
  EINWOHNERSCHWELLE,
  HANDZUORDNUNG,
  findeKandidaten,
  schluesselA,
  schluesselB,
  verknuepfe,
  waehleGrosse,
} from "../../scripts/mietstufen/verknuepfen";

const g = (ags: string, name: string, textkennzeichen: string, einwohner: number | null = null): GvGemeinde => ({ ags, name, textkennzeichen, einwohner });

describe("Namensschlüssel der Verknüpfung", () => {
  it("Schlüssel A löst Abkürzungen der Anlage auf und verwirft den Zusatz nach dem Komma", () => {
    expect(schluesselA("Landau an der Isar, Stadt")).toBe(schluesselA("Landau a.d.Isar, St"));
    expect(schluesselA("Bergisch-Gladbach, Stadt")).toBe(schluesselA("Bergisch Gladbach, Stadt"));
    expect(schluesselA("Aalen, Stadt")).toBe("aalen");
    expect(schluesselA("Fürth")).toBe("fuerth");
  });

  it("Schlüssel B setzt am=an, St.=Sankt und nimmt bei zweisprachigen Namen den ersten Teil", () => {
    expect(schluesselB("Dießen a. Ammersee, Markt")).toBe(schluesselB("Dießen am Ammersee, M"));
    expect(schluesselB("Sankt Ingbert, Stadt")).toBe(schluesselB("St. Ingbert, Stadt"));
    expect(schluesselB("Bautzen / Budyšin, Stadt")).toBe(schluesselB("Bautzen, Stadt"));
  });
});

describe("findeKandidaten: Stufen A bis D", () => {
  it("A: genau ein Namensvetter genügt", () => {
    const r = findeKandidaten("Aalen, Stadt", [g("08136088", "Aalen, Stadt", "63"), g("08111000", "Stuttgart, Landeshauptstadt", "61")]);
    expect(r.verfahren).toBe("name");
    expect(r.treffer.map((t) => t.ags)).toEqual(["08136088"]);
  });

  it("B: Amberg, Stadt gegen zwei Verzeichnis-Gemeinden „Amberg“ – das Textkennzeichen trennt die kreisfreie Stadt (61) von der Gemeinde (64)", () => {
    const pool = [g("09361000", "Amberg", "61"), g("09778111", "Amberg", "64")];
    const r = findeKandidaten("Amberg, Stadt", pool);
    expect(r.verfahren).toBe("zusatzklasse");
    expect(r.treffer[0]?.ags).toBe("09361000");
  });

  it("B: Anlage-Name ohne Zusatz trifft die Gemeinde ohne Zusatz, nicht „Burgdorf, Stadt“", () => {
    const pool = [g("03158004", "Burgdorf", "64"), g("03241003", "Burgdorf, Stadt", "63")];
    expect(findeKandidaten("Burgdorf", pool).treffer[0]?.ags).toBe("03158004");
  });

  it("C: Abkürzungen („Hude (Oldenburg)“ gegen „Hude (Oldb)“) sind kein Teilname", () => {
    const r = findeKandidaten("Hude (Oldenburg)", [g("03458010", "Hude (Oldb)", "64")]);
    expect(r.verfahren).toBe("abkuerzung");
  });

  it("D: Teilname nur ab 5 Zeichen und nur mit genau einem Treffer", () => {
    expect(findeKandidaten("Senftenberg, Stadt", [g("12066304", "Senftenberg/Zły Komorow, Stadt", "63")]).verfahren).toBe("teilname");
    expect(findeKandidaten("Aue", [g("14521035", "Aue-Bad Schlema, Stadt", "63")]).verfahren).toBeNull();
    const zwei = findeKandidaten("Neustadt", [g("1", "Neustadt (Hessen), Stadt", "63"), g("2", "Neustadt (Wied)", "64")]);
    expect(zwei.verfahren).toBeNull();
    expect(zwei.treffer).toHaveLength(2);
  });
});

describe("waehleGrosse: Schwelle 10.000 Einwohner (§ 12 Abs. 3 Satz 1 Nr. 1 WoGG: „10 000 und mehr“)", () => {
  it("die Schwelle selbst zählt, 9.999 nicht", () => {
    expect(EINWOHNERSCHWELLE).toBe(10_000);
    expect(waehleGrosse([g("1", "A", "64", 10_000), g("2", "A", "64", 9_999)])?.ags).toBe("1");
    expect(waehleGrosse([g("1", "A", "64", 9_999), g("2", "A", "64", 100)])).toBeNull();
  });

  it("zwei große Namensvettern oder fehlende Einwohnerzahl ergeben keinen Treffer", () => {
    expect(waehleGrosse([g("1", "A", "64", 12_000), g("2", "A", "64", 15_000)])).toBeNull();
    expect(waehleGrosse([g("1", "A", "64", null), g("2", "A", "64", 50)])).toBeNull();
  });
});

describe("verknuepfe: Anlage gegen Gemeindeverzeichnis 31.12.2020 (echte Daten)", () => {
  const q = leseQuellen();
  const anlage = leseAnlageRoh(q.anlage);
  const basis = leseGvRoh(q.gv_basis);
  const erg = verknuepfe(anlage, basis);
  const nachVerfahren = (liste: { verfahren: string }[]) => {
    const z: Record<string, number> = {};
    for (const x of liste) z[x.verfahren] = (z[x.verfahren] ?? 0) + 1;
    return z;
  };

  it("alle 1.601 Gemeinden und 279 Kreise sind zugeordnet, nichts bleibt offen (Spec 3.3: Rest von Hand)", () => {
    expect(erg.gemeinden).toHaveLength(1601);
    expect(erg.kreise).toHaveLength(279);
    expect(erg.offen).toEqual([]);
  });

  it("Verfahren: Gemeinden 1.554 Name, 5 Zusatzklasse, 18 Abkürzung, 15 Teilname, 3 Einwohner, 6 Hand; Kreise 273/3/3", () => {
    expect(nachVerfahren(erg.gemeinden)).toEqual({ name: 1554, zusatzklasse: 5, abkuerzung: 18, teilname: 15, einwohner: 3, hand: 6 });
    expect(nachVerfahren(erg.kreise)).toEqual({ name: 273, abkuerzung: 3, hand: 3 });
  });

  it("keine zwei Anlage-Zeilen landen auf derselben Gemeinde oder demselben Kreis", () => {
    expect(new Set(erg.gemeinden.map((x) => x.ags)).size).toBe(1601);
    expect(new Set(erg.kreise.map((x) => x.kkz)).size).toBe(279);
  });

  it("jede zugeordnete Gemeinde liegt im Land der Anlage und existiert im Verzeichnis", () => {
    const ags = new Set(basis.gemeinden.map((x) => x.ags));
    const landPraefix: Record<string, string> = { Bayern: "09", Hessen: "06", Sachsen: "14", "Baden-Württemberg": "08", Brandenburg: "12", Niedersachsen: "03" };
    for (const z of erg.gemeinden) {
      expect(ags.has(z.ags)).toBe(true);
      const praefix = landPraefix[z.zeile.land ?? ""];
      if (praefix) expect(z.ags.startsWith(praefix)).toBe(true);
    }
  });

  it("Gegenprobe über die Einwohnerzahl: jede Anlage-Gemeinde hat im Verzeichnis mindestens 9.900 Einwohner", () => {
    // Die Anlage führt nur Gemeinden ab 10.000 einzeln. Ein falscher Namensvetter (Taufkirchen Kreis
    // Mühldorf mit rund 2.900) fiele hier durch. Der Stichtag der Anlage (30.09.2020) liegt nicht im
    // Verzeichnis, deshalb 1 % Toleranz; im Bestand liegt das Minimum bei 9.947 (Neustadt (Hessen)).
    const ew = new Map(basis.gemeinden.map((x) => [x.ags, x.einwohner ?? 0]));
    const klein = erg.gemeinden.filter((z) => (ew.get(z.ags) ?? 0) < 9_900);
    expect(klein.map((z) => z.zeile.name)).toEqual([]);
    expect(Math.min(...erg.gemeinden.map((z) => ew.get(z.ags) ?? 0))).toBe(9_947);
  });

  it("Handfälle und die drei Einwohner-Fälle treffen den erwarteten AGS", () => {
    const ags = (land: string, name: string) => erg.gemeinden.find((z) => z.zeile.land === land && z.zeile.name === name)?.ags;
    expect(ags("Baden-Württemberg", "Weingarten, Baden")).toBe("08215090");
    expect(ags("Baden-Württemberg", "Weingarten, Stadt")).toBe("08436082");
    expect(ags("Baden-Württemberg", "Malsch")).toBe("08215046");
    expect(ags("Bayern", "Eching")).toBe("09178120");
    expect(ags("Bayern", "Taufkirchen")).toBe("09184145");
    expect(ags("Sachsen", "Leipzig, Stadt")).toBe("14713000");
    expect(erg.kreise.find((z) => z.zeile.land === "Sachsen" && z.zeile.name === "Leipzig")?.kkz).toBe("14729");
  });
});

describe("verknuepfe: Fehlerfälle", () => {
  const basis: Gv = { gebietsstand: "31.12.2020", vermerk: "", kreise: [], gemeinden: [g("01001000", "Flensburg, Stadt", "61", 90000)] };
  const zeile = (name: string): AnlageZeile => ({ land: "Schleswig-Holstein", art: "gemeinde", name, stufe: 3 });

  it("unbekannter Name bleibt offen und wird nicht geraten", () => {
    const r = verknuepfe([zeile("Atlantis, Stadt")], basis, []);
    expect(r.gemeinden).toEqual([]);
    expect(r.offen).toHaveLength(1);
  });

  it("veraltete Handzuordnung (Zeile gibt es nicht mehr) bricht ab", () => {
    const hand = [{ land: "Schleswig-Holstein", art: "gemeinde" as const, name: "Atlantis, Stadt", schluessel: "01001000", grund: "Test" }];
    expect(() => verknuepfe([zeile("Flensburg, Stadt")], basis, hand)).toThrow(/ohne Anlagezeile/);
  });

  it("Handzuordnung auf einen Schlüssel, den es im Verzeichnis nicht gibt, bricht ab", () => {
    const hand = [{ land: "Schleswig-Holstein", art: "gemeinde" as const, name: "Atlantis, Stadt", schluessel: "01999999", grund: "Test" }];
    expect(() => verknuepfe([zeile("Atlantis, Stadt")], basis, hand)).toThrow(/fehlt im Verzeichnis/);
  });

  it("alle neun Handzuordnungen tragen eine Begründung", () => {
    expect(HANDZUORDNUNG).toHaveLength(9);
    expect(HANDZUORDNUNG.every((h) => h.grund.length > 10)).toBe(true);
  });
});
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `npx vitest run test/scripts/verknuepfen.test.ts`
Expected: FAIL, `scripts/mietstufen/verknuepfen` nicht gefunden.

- [ ] **Step 3: Implementieren** (`scripts/mietstufen/verknuepfen.ts`)

```ts
import type { AnlageZeile } from "./anlage";
import type { Gv, GvGemeinde, GvKreis } from "./gv";

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

// JavaScript-\b kennt keine Umlaute; deshalb Wortgrenzen über Unicode-Klassen.
const ANFANG = "(?<![\\p{L}\\p{N}_])";
const ENDE = "(?![\\p{L}\\p{N}_])";

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

const vorKomma = (s: string): string => s.split(",")[0] ?? "";

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

export function verknuepfe(anlage: readonly AnlageZeile[], gv: Gv, handzuordnung: readonly Handzuordnung[] = HANDZUORDNUNG): Verknuepfung {
  const landSchluessel = new Map(Object.entries(LAENDER).map(([k, v]) => [v, k]));
  const landkreise = gv.kreise.filter((k) => ["43", "44", "45"].includes(k.textkennzeichen));
  const erg: Verknuepfung = { gemeinden: [], kreise: [], offen: [] };
  const benutzt = new Set<string>();

  for (const zeile of anlage) {
    if (zeile.art === "insel" || zeile.land === null) continue;
    const lc = landSchluessel.get(zeile.land);
    if (!lc) throw new Error(`Anlage: unbekanntes Land "${zeile.land}"`);
    const hand = handzuordnung.find((h) => h.land === zeile.land && h.art === zeile.art && h.name === zeile.name);

    if (zeile.art === "gemeinde") {
      const pool = gv.gemeinden.filter((g) => g.ags.startsWith(lc));
      if (hand) {
        if (!pool.some((g) => g.ags === hand.schluessel)) throw new Error(`Handzuordnung ${hand.name}: ${hand.schluessel} fehlt im Verzeichnis`);
        benutzt.add(`${hand.art}|${hand.land}|${hand.name}`);
        erg.gemeinden.push({ zeile, ags: hand.schluessel, verfahren: "hand" });
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
        if (!pool.some((k) => k.kkz === hand.schluessel)) throw new Error(`Handzuordnung ${hand.name}: ${hand.schluessel} fehlt im Verzeichnis`);
        benutzt.add(`${hand.art}|${hand.land}|${hand.name}`);
        erg.kreise.push({ zeile, kkz: hand.schluessel, verfahren: "hand" });
        continue;
      }
      const { verfahren, treffer } = findeKandidaten(zeile.name, pool);
      if (verfahren && treffer[0]) erg.kreise.push({ zeile, kkz: treffer[0].kkz, verfahren });
      else erg.offen.push({ zeile, kandidaten: treffer.map((t: GvKreis) => `${t.kkz} ${t.name}`) });
    }
  }
  for (const h of handzuordnung) {
    if (!benutzt.has(`${h.art}|${h.land}|${h.name}`)) throw new Error(`Handzuordnung ohne Anlagezeile: ${h.land}, ${h.name}`);
  }
  return erg;
}
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run test/scripts/verknuepfen.test.ts && npx tsc --noEmit; echo "exit=$?"`
Expected: `19 passed`, `exit=0`. Schlägt „Verfahren: Gemeinden 1.554 …“ fehl, ist eine Normalisierungsregel anders als im Plan; die Zahl in der Fehlermeldung zeigt, welches Verfahren abweicht. Die Sollwerte nicht anpassen, sondern die Regel.

- [ ] **Step 5: Commit**

```bash
git add scripts/mietstufen test/scripts
git commit -m "E3: Anlage-Zeilen dem Gemeindeverzeichnis zuordnen (vier Namensstufen, Einwohnerregel, neun Handzuordnungen)"
```

---

### Task 5: Mietstufe je Gemeinde erzeugen, Inseln

**Files:**
- Create: `scripts/mietstufen/erzeugen.ts`
- Create: `scripts/mietstufen/inseln.ts`
- Modify: `scripts/mietstufen/eingabe.ts` (ersetzen durch die Endfassung mit `ladeEingabe`)
- Test: `test/scripts/erzeugen.test.ts`, `test/scripts/inseln.test.ts`

**Interfaces:**
- Consumes: `verknuepfe`, `findeKandidaten`, `LAENDER` (Task 4); `MietstufenDaten` u. a. (Task 1)
- Produces: `erzeugeMietstufen(e: ErzeugenEingabe): { daten, verknuepfung, aliase }`; `serialisiere(d): string`; `INSEL_GEMEINDEN`; `parseInselnAusGesetz(html): string[]`; `ladeEingabe(): ErzeugenEingabe`

Der Erzeuger arbeitet je Gemeinde des Verzeichnisses 31.12.2025 nach Ruling 4: Insel, sonst eigene Anlagezeile (Schlüsselwechsel Langelsheim und Eisenach über den Namen im selben Land), sonst Kreisstufe; fehlt die Gemeinde im Basisverzeichnis, trägt sie Herkunft `n`. Fehlt irgendwo eine Stufe, bricht er ab.

- [ ] **Step 1: Failing tests schreiben**

`test/scripts/erzeugen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AnlageZeile } from "../../scripts/mietstufen/anlage";
import { ladeEingabe } from "../../scripts/mietstufen/eingabe";
import { erzeugeMietstufen, type ErzeugenEingabe } from "../../scripts/mietstufen/erzeugen";
import type { Gv } from "../../scripts/mietstufen/gv";

const eingabe = ladeEingabe();
const ergebnis = erzeugeMietstufen(eingabe);
const { daten, aliase } = ergebnis;
const zeile = (ags: string) => daten.gemeinden.find((g) => g[0] === ags);

describe("Mietstufen-Daten erzeugen: Zählungen mit echten Daten", () => {
  it("10.751 Gemeinden des Verzeichnisses 31.12.2025 haben genau eine Stufe, keine fehlt", () => {
    expect(daten.gemeinden).toHaveLength(10751);
    expect(new Set(daten.gemeinden.map((g) => g[0])).size).toBe(10751);
    expect(Object.keys(daten.kreise)).toHaveLength(400);
  });

  it("Herkunft: 1.601 Gemeindezeilen, 9.116 über den Kreis, 28 Inseln, 6 neu (Kreisstufe als Annahme)", () => {
    const zaehle = (h: string) => daten.gemeinden.filter((g) => g[3] === h).length;
    expect([zaehle("g"), zaehle("k"), zaehle("i"), zaehle("n")]).toEqual([1601, 9116, 28, 6]);
    expect(daten.meta.anzahl).toEqual({ anlage_zeilen: 1881, gemeinden: 10751, kreise: 400, je_herkunft: { g: 1601, k: 9116, i: 28, n: 6 } });
  });

  it("Stufenverteilung über alle Gemeinden (Stufe I bis VII)", () => {
    const verteilung = [1, 2, 3, 4, 5, 6, 7].map((s) => daten.gemeinden.filter((g) => g[2] === s).length);
    expect(verteilung).toEqual([6311, 2619, 917, 580, 176, 97, 51]);
  });

  it("jede Gemeindezeile der Anlage kehrt mit ihrer Stufe im Ergebnis wieder (Schlüsselwechsel eingerechnet)", () => {
    const bruecke = new Map(aliase.map((a) => [a.von, a.nach]));
    for (const z of ergebnis.verknuepfung.gemeinden) {
      const ags = bruecke.get(z.ags) ?? z.ags;
      expect(zeile(ags)?.[2], `${z.zeile.land} ${z.zeile.name}`).toBe(z.zeile.stufe);
      expect(zeile(ags)?.[3]).toBe("g");
    }
  });

  it("jede Kreiszeile der Anlage: Gemeinden ohne eigene Zeile erben ihre Stufe", () => {
    const kreisGemeinden = daten.gemeinden.filter((g) => g[3] === "k" || g[3] === "n");
    for (const k of ergebnis.verknuepfung.kreise) {
      const unter = kreisGemeinden.filter((g) => g[0].startsWith(k.kkz));
      expect(unter.every((g) => g[2] === k.zeile.stufe), `${k.zeile.land} ${k.zeile.name}`).toBe(true);
    }
  });
});

describe("Mietstufen-Daten erzeugen: Einzelfälle mit Quelle", () => {
  it("Taufkirchen (Kreis München): Stufe II bei Kreisstufe VII, amtlich der einzige Ausreißer im Kreis (BMWSB-Liste, CSU-Landtag Antrag 2023)", () => {
    expect(zeile("09184145")).toEqual(["09184145", "Taufkirchen", 2, "g"]);
    expect(zeile("09184119")?.[2]).toBe(7); // Garching bei München, Kreisgenosse
  });

  it("Inseln: Pellworm V, obwohl der Kreis Nordfriesland I hat; Sylt hat eine eigene Zeile (V)", () => {
    expect(zeile("01054103")).toEqual(["01054103", "Pellworm", 5, "i"]);
    expect(zeile("01054025")?.[2]).toBe(5);
    expect(daten.gemeinden.find((g) => g[1] === "Sylt")).toMatchObject([expect.any(String), "Sylt", 5, "g"]);
    expect(zeile("01054001")?.[2]).toBe(1); // Aventoft, Kreis Nordfriesland ohne Insel
  });

  it("Schlüsselwechsel: Langelsheim (I) und Eisenach (II) behalten ihre Anlage-Stufe unter neuem AGS", () => {
    expect(aliase).toEqual([
      { von: "03153007", nach: "03153019", name: "Langelsheim, Stadt" },
      { von: "16056000", nach: "16063105", name: "Eisenach, Stadt" },
    ]);
    expect(zeile("03153019")).toEqual(["03153019", "Langelsheim, Stadt", 1, "g"]);
    expect(zeile("16063105")).toEqual(["16063105", "Eisenach, Stadt", 2, "g"]);
  });

  it("Neu gegenüber dem Basisverzeichnis: sechs Gemeinden mit Kreisstufe I und Herkunft n", () => {
    const neu = daten.gemeinden.filter((g) => g[3] === "n").map((g) => `${g[0]} ${g[1]} ${g[2]}`);
    expect(neu).toEqual([
      "07132502 Neitersen 1",
      "07232503 Obergeckler 1",
      "14522275 Jahnatal 1",
      "16061119 Uder 1",
      "16065089 Greußen, Stadt 1",
      "16076094 Berga-Wünschendorf, Stadt 1",
    ]);
  });

  it("Gemeinde über 10.000 Einwohner ohne Anlagezeile erbt die Kreisstufe: Pasewalk (Vorpommern-Greifswald)", () => {
    expect(zeile("13075105")).toEqual(["13075105", "Pasewalk, Stadt", 1, "k"]);
  });

  it("Leipzig: Stadt II (Gemeindezeile), Landkreis I gilt für Borna", () => {
    expect(zeile("14713000")?.[2]).toBe(2);
    const borna = daten.gemeinden.find((g) => g[1] === "Borna, Stadt");
    expect(borna?.[0].startsWith("14729")).toBe(true);
    expect(borna?.[2]).toBe(1);
    expect(daten.kreise["14729"]).toBe("Leipzig");
    expect(daten.kreise["14713"]).toBe("Leipzig, Stadt");
  });
});

describe("erzeugeMietstufen: kleine Fälle", () => {
  const nachweis = { titel: "t", url: "https://example.invalid/", abruf: "2026-10-08", sha256: "0" };
  const flensburg = { ags: "01001000", name: "Flensburg, Stadt", textkennzeichen: "61", einwohner: 90000 };
  const handewitt = { ags: "01059045", name: "Handewitt", textkennzeichen: "64", einwohner: 11000 };
  const klein = { ags: "01059100", name: "Kleinort", textkennzeichen: "64", einwohner: 500 };
  const kreise = [
    { kkz: "01001", name: "Flensburg, Stadt", textkennzeichen: "41", kreisfrei: true },
    { kkz: "01059", name: "Schleswig-Flensburg", textkennzeichen: "44", kreisfrei: false },
  ];
  const gv = (gemeinden: Gv["gemeinden"]): Gv => ({ gebietsstand: "31.12.2020", vermerk: "", gemeinden, kreise });
  const anlage: AnlageZeile[] = [
    { land: "Schleswig-Holstein", art: "gemeinde", name: "Flensburg, Stadt", stufe: 3 },
    { land: "Schleswig-Holstein", art: "gemeinde", name: "Handewitt", stufe: 2 },
    { land: "Schleswig-Holstein", art: "kreis", name: "Schleswig-Flensburg", stufe: 1 },
    { land: null, art: "insel", name: "Inseln ohne Festlandanschluss", stufe: 5 },
  ];
  const basis = (e: Partial<ErzeugenEingabe> = {}): ErzeugenEingabe => ({
    anlage,
    basis: gv([flensburg, handewitt, klein]),
    aktuell: gv([flensburg, handewitt, klein]),
    nachweise: { anlage: nachweis, basis: nachweis, aktuell: nachweis },
    inseln: [],
    handzuordnung: [],
    ...e,
  });

  it("Gemeindezeile g, Kreisstufe k", () => {
    const { daten: d } = erzeugeMietstufen(basis());
    expect(d.gemeinden).toEqual([
      ["01001000", "Flensburg, Stadt", 3, "g"],
      ["01059045", "Handewitt", 2, "g"],
      ["01059100", "Kleinort", 1, "k"],
    ]);
  });

  it("Gemeinde, die im Basisverzeichnis fehlt, bekommt Kreisstufe und Herkunft n", () => {
    const neu = { ags: "01059999", name: "Neuort", textkennzeichen: "64", einwohner: 800 };
    const { daten: d } = erzeugeMietstufen(basis({ aktuell: gv([flensburg, handewitt, klein, neu]) }));
    expect(d.gemeinden.at(-1)).toEqual(["01059999", "Neuort", 1, "n"]);
  });

  it("Gemeinde in einem Kreis ohne Kreiszeile bricht den Lauf ab, statt eine Stufe zu raten", () => {
    const fremd = { ags: "01060001", name: "Fremdort", textkennzeichen: "64", einwohner: 800 };
    const mitKreis = { ...gv([flensburg, handewitt, klein, fremd]), kreise: [...kreise, { kkz: "01060", name: "Segeberg", textkennzeichen: "44", kreisfrei: false }] };
    expect(() => erzeugeMietstufen(basis({ aktuell: mitKreis }))).toThrow(/Kreis 01060 hat keine Stufe/);
  });

  it("Anlage-Gemeinde, die im aktuellen Verzeichnis weder per AGS noch per Name auftaucht, bricht ab", () => {
    expect(() => erzeugeMietstufen(basis({ aktuell: gv([flensburg, klein]) }))).toThrow(/Handewitt/);
  });

  it("nicht eindeutig zugeordnete Anlagezeilen werden aufgelistet und brechen ab", () => {
    expect(() => erzeugeMietstufen(basis({ anlage: [...anlage, { land: "Schleswig-Holstein", art: "gemeinde", name: "Atlantis", stufe: 4 }] }))).toThrow(/Atlantis/);
  });
});
```

`test/scripts/inseln.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ladeEingabe } from "../../scripts/mietstufen/eingabe";
import { INSEL_GEMEINDEN, erzeugeMietstufen } from "../../scripts/mietstufen/erzeugen";
import { parseInselnAusGesetz } from "../../scripts/mietstufen/inseln";
import { leseQuellen, leseRohdatei } from "../../scripts/mietstufen/quellen";

const eingabe = ladeEingabe();
const ergebnis = erzeugeMietstufen(eingabe);
const { daten } = ergebnis;

describe("Inseln ohne Festlandanschluss: Abgleich mit § 12 Abs. 4a WoGG und dem Verzeichnis", () => {
  const genannt = parseInselnAusGesetz(leseRohdatei(leseQuellen().wogg_12).toString("latin1"));

  it("das Gesetz nennt 28 Gemeinden, die Liste im Code ist wortgleich und in derselben Reihenfolge", () => {
    expect(genannt).toHaveLength(28);
    expect(INSEL_GEMEINDEN.map((i) => i.gesetz)).toEqual(genannt);
  });

  it("jede Insel-AGS trägt im Verzeichnis den Namen aus dem Gesetz (ohne Klammer- und Kommazusatz)", () => {
    const name = (ags: string) => eingabe.aktuell.gemeinden.find((g) => g.ags === ags)?.name ?? "";
    const kern = (s: string) => (s.split(",")[0] ?? "").replace(/\s*\(.*\)/, "").trim();
    for (const i of INSEL_GEMEINDEN) expect(kern(name(i.ags)), i.gesetz).toBe(kern(i.gesetz));
  });

  it("parseInselnAusGesetz bricht ab, wenn der Absatz fehlt", () => {
    expect(() => parseInselnAusGesetz("<div>(4) etwas anderes</div>")).toThrow(/Absatz 4a/);
    expect(() => parseInselnAusGesetz("<div>(4a) Ohne Liste.</div>")).toThrow(/Gemeindeliste/);
  });

  it("alle 28 stehen in keiner Gemeindetabelle der Anlage und bekommen die gemeinsame Stufe der Inselzeile", () => {
    const ags = new Set(INSEL_GEMEINDEN.map((i) => i.ags));
    const inAnlage = ergebnis.verknuepfung.gemeinden.filter((z) => ags.has(z.ags));
    expect(inAnlage).toEqual([]);
    expect(daten.gemeinden.filter((g) => ags.has(g[0])).every((g) => g[2] === 5 && g[3] === "i")).toBe(true);
  });
});
```

- [ ] **Step 2: Tests rot laufen lassen**

Run: `npx vitest run test/scripts/erzeugen.test.ts test/scripts/inseln.test.ts`
Expected: FAIL, `scripts/mietstufen/erzeugen` nicht gefunden.

- [ ] **Step 3: Implementieren**

`scripts/mietstufen/erzeugen.ts`:

```ts
import type { GemeindeZeile, Herkunft, MietstufenDaten, QuellenNachweis } from "../../src/mietstufen/typen";
import type { Mietstufe } from "../../src/rechtsstand/typen";
import type { AnlageZeile } from "./anlage";
import type { Gv } from "./gv";
import { findeKandidaten, LAENDER, verknuepfe, type Handzuordnung, type Verknuepfung } from "./verknuepfen";

// Die 28 Gemeinden auf Inseln ohne Festlandanschluss, § 12 Abs. 4a WoGG (Abruf 08.10.2026).
// Das Gesetz schreibt „Borkum (Stadt)“, das Verzeichnis „Borkum, Stadt“; deshalb von Hand auf AGS
// gebracht. Der Test vergleicht jede Zeile mit dem Gesetzestext und dem Verzeichnis.
export const INSEL_GEMEINDEN: readonly { gesetz: string; ags: string }[] = [
  { gesetz: "Baltrum", ags: "03452002" },
  { gesetz: "Borkum (Stadt)", ags: "03457002" },
  { gesetz: "Juist", ags: "03452013" },
  { gesetz: "Langeoog", ags: "03462007" },
  { gesetz: "Norderney (Stadt)", ags: "03452020" },
  { gesetz: "Spiekeroog", ags: "03462014" },
  { gesetz: "Wangerooge (Nordseebad)", ags: "03455021" },
  { gesetz: "Nebel", ags: "01054085" },
  { gesetz: "Norddorf auf Amrum", ags: "01054089" },
  { gesetz: "Wittdün auf Amrum", ags: "01054160" },
  { gesetz: "Alkersum", ags: "01054005" },
  { gesetz: "Borgsum", ags: "01054015" },
  { gesetz: "Dunsum", ags: "01054025" },
  { gesetz: "Midlum", ags: "01054083" },
  { gesetz: "Nieblum", ags: "01054087" },
  { gesetz: "Oevenum", ags: "01054094" },
  { gesetz: "Oldsum", ags: "01054098" },
  { gesetz: "Süderende", ags: "01054129" },
  { gesetz: "Utersum", ags: "01054143" },
  { gesetz: "Witsum", ags: "01054158" },
  { gesetz: "Wrixum", ags: "01054163" },
  { gesetz: "Wyk auf Föhr (Stadt)", ags: "01054164" },
  { gesetz: "Helgoland", ags: "01056025" },
  { gesetz: "Gröde", ags: "01054039" },
  { gesetz: "Hallig Hooge", ags: "01054050" },
  { gesetz: "Langeneß", ags: "01054074" },
  { gesetz: "Pellworm", ags: "01054103" },
  { gesetz: "Insel Hiddensee", ags: "13073040" },
];

export interface ErzeugenEingabe {
  anlage: readonly AnlageZeile[];
  basis: Gv; // Gebietsstand für die Zuordnung der Anlage
  aktuell: Gv; // Namen und Kreise, die Nutzer heute eintippen
  nachweise: { anlage: QuellenNachweis; basis: QuellenNachweis; aktuell: QuellenNachweis };
  // Nur Tests setzen die beiden folgenden Felder; sonst gelten INSEL_GEMEINDEN und HANDZUORDNUNG.
  inseln?: readonly { gesetz: string; ags: string }[];
  handzuordnung?: readonly Handzuordnung[];
}

export interface Alias {
  von: string; // AGS im Basisverzeichnis
  nach: string; // AGS im aktuellen Verzeichnis
  name: string; // Name in der Anlage
}

export interface ErzeugenErgebnis {
  daten: MietstufenDaten;
  verknuepfung: Verknuepfung;
  aliase: Alias[]; // Anlage-Gemeinden, deren AGS sich seit dem Basisverzeichnis geändert hat
}

const HINWEIS = (basis: string, aktuell: string): string =>
  `Gemeindeverzeichnis: © Statistisches Bundesamt (Destatis) im Auftrag der Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder, GV-ISys, Gebietsstand ${aktuell} und ${basis}. Vervielfältigung und Verbreitung mit Quellenangabe gestattet. In dieser Datei nur als Berechnungsgrundlage verwendet und verändert dargestellt (Zuordnung Gemeinde, Kreis, Mietenstufe). Mietenstufen: Anlage zu § 1 Abs. 3 WoGV, amtliches Werk (§ 5 UrhG). Die MIT-Lizenz des Repositoriums gilt nicht für diese Datei.`;

export function erzeugeMietstufen(e: ErzeugenEingabe): ErzeugenErgebnis {
  const verknuepfung = verknuepfe(e.anlage, e.basis, e.handzuordnung);
  if (verknuepfung.offen.length > 0) {
    const liste = verknuepfung.offen.map((o) => `${o.zeile.land}, ${o.zeile.name}: ${o.kandidaten.join(" ; ") || "kein Kandidat"}`);
    throw new Error(`Anlage-Zeilen ohne eindeutige Zuordnung (in HANDZUORDNUNG eintragen):\n${liste.join("\n")}`);
  }

  const inselZeilen = e.anlage.filter((z) => z.art === "insel");
  if (inselZeilen.length !== 1 || !inselZeilen[0]) throw new Error(`Anlage: erwartet genau eine Inselzeile, gefunden ${inselZeilen.length}`);
  const inselStufe: Mietstufe = inselZeilen[0].stufe;

  const aktuellAgs = new Set(e.aktuell.gemeinden.map((g) => g.ags));
  const aktuellKreise = new Map(e.aktuell.kreise.map((k) => [k.kkz, k.name]));
  const basisAgs = new Set(e.basis.gemeinden.map((g) => g.ags));

  const kreisStufe = new Map<string, Mietstufe>();
  for (const k of verknuepfung.kreise) {
    if (!aktuellKreise.has(k.kkz)) throw new Error(`Kreis ${k.kkz} (${k.zeile.name}) fehlt im aktuellen Verzeichnis`);
    kreisStufe.set(k.kkz, k.zeile.stufe);
  }

  const gemeindeStufe = new Map<string, Mietstufe>();
  const aliase: Alias[] = [];
  const landSchluessel = new Map(Object.entries(LAENDER).map(([k, v]) => [v, k]));
  for (const g of verknuepfung.gemeinden) {
    if (aktuellAgs.has(g.ags)) {
      gemeindeStufe.set(g.ags, g.zeile.stufe);
      continue;
    }
    // AGS seit dem Basisverzeichnis geändert (Langelsheim, Eisenach): über den Namen im selben Land.
    const lc = landSchluessel.get(g.zeile.land ?? "") ?? "";
    const { verfahren, treffer } = findeKandidaten(g.zeile.name, e.aktuell.gemeinden.filter((x) => x.ags.startsWith(lc)));
    const neu = treffer[0];
    if (!verfahren || !neu) throw new Error(`Anlage-Gemeinde ${g.zeile.name} (${g.ags}) fehlt im aktuellen Verzeichnis und ist nicht über den Namen zu finden`);
    aliase.push({ von: g.ags, nach: neu.ags, name: g.zeile.name });
    gemeindeStufe.set(neu.ags, g.zeile.stufe);
  }

  const inseln = e.inseln ?? INSEL_GEMEINDEN;
  for (const i of inseln) {
    if (!aktuellAgs.has(i.ags)) throw new Error(`Insel ${i.gesetz}: AGS ${i.ags} fehlt im aktuellen Verzeichnis`);
  }
  const inselAgs = new Set(inseln.map((i) => i.ags));

  const gemeinden: GemeindeZeile[] = [];
  const jeHerkunft: Record<Herkunft, number> = { g: 0, k: 0, i: 0, n: 0 };
  for (const g of [...e.aktuell.gemeinden].sort((a, b) => (a.ags < b.ags ? -1 : 1))) {
    let stufe: Mietstufe | undefined;
    let herkunft: Herkunft;
    if (inselAgs.has(g.ags)) {
      stufe = inselStufe;
      herkunft = "i";
    } else if (gemeindeStufe.has(g.ags)) {
      stufe = gemeindeStufe.get(g.ags);
      herkunft = "g";
    } else {
      stufe = kreisStufe.get(g.ags.slice(0, 5));
      herkunft = basisAgs.has(g.ags) ? "k" : "n";
    }
    if (stufe === undefined) throw new Error(`Gemeinde ${g.ags} ${g.name}: Kreis ${g.ags.slice(0, 5)} hat keine Stufe in der Anlage`);
    jeHerkunft[herkunft]++;
    gemeinden.push([g.ags, g.name, stufe, herkunft]);
  }

  const nachweis = (n: QuellenNachweis, gebietsstand?: string): QuellenNachweis => ({
    titel: n.titel,
    url: n.url,
    abruf: n.abruf,
    sha256: n.sha256,
    ...(gebietsstand ? { gebietsstand } : {}),
  });

  const daten: MietstufenDaten = {
    meta: {
      rechtsgrundlage: "Anlage zu § 1 Abs. 3 WoGV (Mietenstufen ab 1. Januar 2023); Inseln nach § 12 Abs. 4a WoGG",
      anlage: nachweis(e.nachweise.anlage),
      gemeindeverzeichnis_basis: nachweis(e.nachweise.basis, e.basis.gebietsstand),
      gemeindeverzeichnis_aktuell: nachweis(e.nachweise.aktuell, e.aktuell.gebietsstand),
      hinweis: HINWEIS(e.basis.gebietsstand, e.aktuell.gebietsstand),
      anzahl: { anlage_zeilen: e.anlage.length, gemeinden: gemeinden.length, kreise: aktuellKreise.size, je_herkunft: jeHerkunft },
    },
    laender: { ...LAENDER },
    kreise: Object.fromEntries([...aktuellKreise].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    gemeinden,
  };
  return { daten, verknuepfung, aliase };
}

// Feste Ausgabe, eine Gemeinde je Zeile: gut lesbare Diffs, und die Gegentests finden jede Zeile wörtlich.
export function serialisiere(d: MietstufenDaten): string {
  const zeilen = d.gemeinden.map((g) => JSON.stringify(g));
  return `{\n"meta":${JSON.stringify(d.meta)},\n"laender":${JSON.stringify(d.laender)},\n"kreise":${JSON.stringify(d.kreise)},\n"gemeinden":[\n${zeilen.join(",\n")}\n]\n}\n`;
}
```

`scripts/mietstufen/inseln.ts`:

```ts
// Liest die Gemeindeliste aus § 12 Abs. 4a WoGG (https://www.gesetze-im-internet.de/wogg/__12.html):
// „Für die Gemeinden Baltrum, Borkum (Stadt), ... und Insel Hiddensee, die auf Inseln ohne Festlandanschluss liegen, ...“
export function parseInselnAusGesetz(html: string): string[] {
  const absatz = /\(4a\)([\s\S]*?)<\/div>/.exec(html)?.[1];
  if (!absatz) throw new Error("§ 12 WoGG: Absatz 4a nicht gefunden");
  const text = absatz
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  const liste = /Für die Gemeinden (.*?), die auf Inseln ohne Festlandanschluss liegen/.exec(text)?.[1];
  if (!liste) throw new Error("§ 12 WoGG: Gemeindeliste in Absatz 4a nicht gefunden");
  return liste.replace(/ und (Insel Hiddensee)$/, ", $1").split(", ");
}
```

`scripts/mietstufen/eingabe.ts` – die Datei aus Task 3 **vollständig ersetzen**:

```ts
import type { QuellenNachweis } from "../../src/mietstufen/typen";
import { parseAnlage, type AnlageZeile } from "./anlage";
import type { ErzeugenEingabe } from "./erzeugen";
import { leseGv, type Gv } from "./gv";
import { leseQuellen, leseRohdatei, type RohQuelle } from "./quellen";

// Die Anlage ist ASCII mit numerischen Entitäten; latin1 liest jedes Byte unverändert.
export function leseAnlageRoh(q: RohQuelle): AnlageZeile[] {
  return parseAnlage(leseRohdatei(q).toString("latin1"));
}

export function leseGvRoh(q: RohQuelle): Gv {
  return leseGv(leseRohdatei(q));
}

// Alle Eingaben des Erzeugers aus data/roh/.
export function ladeEingabe(): ErzeugenEingabe {
  const q = leseQuellen();
  const nachweis = ({ datei: _datei, ...rest }: RohQuelle): QuellenNachweis => rest;
  return {
    anlage: leseAnlageRoh(q.anlage),
    basis: leseGvRoh(q.gv_basis),
    aktuell: leseGvRoh(q.gv_aktuell),
    nachweise: { anlage: nachweis(q.anlage), basis: nachweis(q.gv_basis), aktuell: nachweis(q.gv_aktuell) },
  };
}
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run test/scripts/erzeugen.test.ts test/scripts/inseln.test.ts && npx tsc --noEmit; echo "exit=$?"`
Expected: `20 passed` (16 + 4), `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/mietstufen test/scripts
git commit -m "E3: Mietstufe je Gemeinde erzeugen (Insel, Anlagezeile, Kreisstufe, Annahme n) und Inselliste gegen § 12 Abs. 4a WoGG"
```

---

### Task 6: Erzeuger-Skript, eingecheckte Datei, Quellenabgleich

**Files:**
- Create: `scripts/mietstufen-erzeugen.ts`
- Create: `scripts/pruefe-mietstufen.ts`
- Create: `data/mietstufen-2023.json` (erzeugt)
- Modify: `package.json` (zwei Skripte)
- Test: `test/scripts/daten-datei.test.ts`

**Interfaces:**
- Consumes: `erzeugeMietstufen`, `serialisiere`, `ladeEingabe`, `INSEL_GEMEINDEN`, `parseInselnAusGesetz`
- Produces: `npm run mietstufen:erzeugen [-- --pruefen]`, `npm run pruefe:mietstufen`; Exit-Codes wie `pruefe:rechtsstand` (0 stimmt, 1 Abweichung, 2 Fehler)

- [ ] **Step 1: Skripte anlegen**

`scripts/mietstufen-erzeugen.ts`:

```ts
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
```

`scripts/pruefe-mietstufen.ts`:

```ts
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
```

In `package.json` unter `scripts` nach `pruefe:rechtsstand` einfügen:
```json
    "mietstufen:erzeugen": "tsx scripts/mietstufen-erzeugen.ts",
    "pruefe:mietstufen": "tsx scripts/pruefe-mietstufen.ts",
```

- [ ] **Step 2: Failing test schreiben** (`test/scripts/daten-datei.test.ts`)

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ladeEingabe } from "../../scripts/mietstufen/eingabe";
import { erzeugeMietstufen, serialisiere } from "../../scripts/mietstufen/erzeugen";
import { DATEI_DATEN, leseQuellen } from "../../scripts/mietstufen/quellen";

const { daten } = erzeugeMietstufen(ladeEingabe());

describe("Mietstufen-Daten: Nachweise und Regenerierbarkeit", () => {
  it("die eingecheckte Datei ist Byte für Byte das Ergebnis des Skripts aus den Rohdaten", () => {
    expect(readFileSync(DATEI_DATEN, "utf8")).toBe(serialisiere(daten));
  });

  it("Kopf nennt Quellen mit Prüfsumme und Gebietsstand und kennzeichnet die Daten als verändert (Lizenzbericht)", () => {
    const q = leseQuellen();
    expect(daten.meta.anlage.sha256).toBe(q.anlage.sha256);
    expect(daten.meta.gemeindeverzeichnis_basis).toMatchObject({ gebietsstand: "31.12.2020", sha256: q.gv_basis.sha256 });
    expect(daten.meta.gemeindeverzeichnis_aktuell).toMatchObject({ gebietsstand: "31.12.2025", sha256: q.gv_aktuell.sha256 });
    expect(daten.meta.hinweis).toContain("Statistisches Bundesamt (Destatis)");
    expect(daten.meta.hinweis).toContain("Vervielfältigung und Verbreitung mit Quellenangabe gestattet");
    expect(daten.meta.hinweis).toContain("verändert dargestellt");
    expect(daten.meta.hinweis).toContain("MIT-Lizenz des Repositoriums gilt nicht für diese Datei");
  });
});
```

- [ ] **Step 3: Test rot laufen lassen**

Run: `npx vitest run test/scripts/daten-datei.test.ts`
Expected: FAIL, `ENOENT … data/mietstufen-2023.json` (Datei noch nicht erzeugt).

- [ ] **Step 4: Datei erzeugen**

Run: `npm run mietstufen:erzeugen`
Expected (Ausgabe):
```
Gemeinden 10751, je Herkunft {"g":1601,"k":9116,"i":28,"n":6}
Zuordnung Anlage -> Schlüssel nach Verfahren: {"name":1827,"einwohner":3,"hand":9,"abkuerzung":21,"teilname":15,"zusatzklasse":5}
Schlüsselwechsel: Langelsheim, Stadt 03153007 -> 03153019
Schlüsselwechsel: Eisenach, Stadt 16056000 -> 16063105
Geschrieben: …/data/mietstufen-2023.json (385056 Zeichen)
```
Die Datei hat 10.751 Zeilen für Gemeinden, eine je Zeile, z. B. `["09184145","Taufkirchen",2,"g"],`.

- [ ] **Step 5: Tests, Typprüfung, Prüfläufe**

Run:
```bash
npx vitest run test/scripts/daten-datei.test.ts
npx tsc --noEmit; echo "tsc=$?"
npm run mietstufen:erzeugen -- --pruefen; echo "exit=$?"
npm run pruefe:mietstufen; echo "exit=$?"
```
Expected: `2 passed`; `tsc=0`; `data/mietstufen-2023.json stimmt mit den Rohdaten überein.` / `exit=0`; `Mietstufen stimmen mit gesetze-im-internet.de überein (1881 Zeilen der Anlage, 28 Inselgemeinden).` / `exit=0`.

Gegenprobe (Hand, nicht committen): `sed -i '' 's/\["09184145","Taufkirchen",2,"g"\]/["09184145","Taufkirchen",3,"g"]/' data/mietstufen-2023.json`, dann beide Prüfläufe: Exit 1 mit `ABWEICHUNG …`. Danach die Datei neu erzeugen (`npm run mietstufen:erzeugen`); sie ist zu diesem Zeitpunkt noch nicht committet.

- [ ] **Step 6: Commit**

```bash
git add scripts package.json data/mietstufen-2023.json test/scripts
git commit -m "E3: data/mietstufen-2023.json erzeugen, Regenerierbarkeit testen, Quellenabgleich gegen gesetze-im-internet.de"
```

---

### Task 7: Namensnormalisierung

**Files:**
- Create: `src/mietstufen/normalisieren.ts`
- Test: `test/mietstufen/normalisieren.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `normalisiere(text)`, `ohneTitel(schluessel)`, `gemeindeSchluessel(name)`, `kreisSchluessel(text)`, `lockerSchluessel(schluessel)`, `abstand(a, b)`

Spec 3.3: Groß- und Kleinschreibung, ß/ss, Umlaute, Zusätze wie „Stadt“. Dazu die Abkürzungen des Verzeichnisses (Bayern: „a.d.Isar“, „i.d.OPf.“, „Bay.“). „St“ und „M“ sind keine Titel, weil „St. Georgen“ Sankt heißt.

- [ ] **Step 1: Failing test schreiben** (`test/mietstufen/normalisieren.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { abstand, gemeindeSchluessel, kreisSchluessel, lockerSchluessel, normalisiere, ohneTitel } from "../../src/mietstufen/normalisieren";

describe("normalisiere: Schreibweisen der Eingabe", () => {
  it("Groß- und Kleinschreibung, ß, Umlaute und Satzzeichen (Spec 3.3)", () => {
    expect(normalisiere("München")).toBe("muenchen");
    expect(normalisiere("MUENCHEN")).toBe("muenchen");
    expect(normalisiere("Dießen")).toBe("diessen");
    expect(normalisiere("Köln")).toBe("koeln");
    expect(normalisiere("Äußere Neustadt")).toBe("aeussere neustadt");
    expect(normalisiere("Aalen,  Stadt")).toBe("aalen stadt");
    expect(normalisiere("Baden-Württemberg")).toBe("baden wuerttemberg");
  });

  it("sorbische Namensteile aus dem Verzeichnis: Akzente fallen weg, ł wird l", () => {
    expect(normalisiere("Lubin (Błota)")).toBe("lubin blota");
    expect(normalisiere("Chóśebuz")).toBe("chosebuz");
  });

  it("Abkürzungen des Gemeindeverzeichnisses werden aufgelöst (Bayern, Hessen, Niedersachsen)", () => {
    expect(normalisiere("Landau a.d.Isar")).toBe(normalisiere("Landau an der Isar"));
    expect(normalisiere("Weiden i.d.OPf.")).toBe("weiden in der oberpfalz");
    expect(normalisiere("Höchst i. Odw.")).toBe(normalisiere("Höchst im Odenwald"));
    expect(normalisiere("Hude (Oldb)")).toBe(normalisiere("Hude (Oldenburg)"));
    expect(normalisiere("St. Georgen")).toBe(normalisiere("Sankt Georgen"));
  });

  it("am und im gelten als an und in", () => {
    expect(normalisiere("Dießen a. Ammersee")).toBe(normalisiere("Dießen am Ammersee"));
    expect(normalisiere("Reichenbach im Vogtland")).toBe(normalisiere("Reichenbach in Vogtland"));
  });
});

describe("ohneTitel: nur Statusworte fallen weg", () => {
  it("Stadt, Gemeinde, Markt, Landeshauptstadt", () => {
    expect(ohneTitel("stadt aalen")).toBe("aalen");
    expect(ohneTitel("muenchen landeshauptstadt")).toBe("muenchen");
    expect(ohneTitel("markt schwaben")).toBe("schwaben");
  });

  it("„St“ bleibt, weil es Sankt heißen kann", () => {
    expect(ohneTitel(normalisiere("St. Ingbert"))).toBe("sankt ingbert");
  });
});

describe("gemeindeSchluessel: starke und schwache Schlüssel", () => {
  it("Name mit Zusatz: stark ganzer Name und Name vor dem Komma", () => {
    expect(gemeindeSchluessel("Aalen, Stadt")).toEqual({ stark: ["aalen stadt", "aalen"], schwach: [] });
  });

  it("Klammerzusatz und Schrägstrich geben schwache Schlüssel", () => {
    expect(gemeindeSchluessel("Neustadt (Hessen), Stadt")).toEqual({ stark: ["neustadt hessen stadt", "neustadt hessen"], schwach: ["neustadt"] });
    expect(gemeindeSchluessel("Neustadt/Vogtl.")).toEqual({ stark: ["neustadt vogtland"], schwach: ["neustadt"] });
  });
});

describe("kreisSchluessel", () => {
  it("Landkreis München und München sind gleich, Rhein-Neckar-Kreis bleibt unterscheidbar", () => {
    expect(kreisSchluessel("Landkreis München")).toBe(kreisSchluessel("München"));
    expect(kreisSchluessel("Leipzig, Stadt")).toBe(kreisSchluessel("Leipzig"));
    expect(kreisSchluessel("Rhein-Neckar-Kreis")).toBe("rhein neckar");
  });
});

describe("lockerSchluessel und abstand", () => {
  it("Umlautschreibweisen laufen zusammen", () => {
    expect(lockerSchluessel(normalisiere("München"))).toBe(lockerSchluessel("munchen"));
  });

  it("Levenshtein-Abstand", () => {
    expect(abstand("hamburg", "hamburg")).toBe(0);
    expect(abstand("hamburk", "hamburg")).toBe(1);
    expect(abstand("muenchne", "muenchen")).toBe(2);
    expect(abstand("", "abc")).toBe(3);
  });
});
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `npx vitest run test/mietstufen/normalisieren.test.ts`
Expected: FAIL, `src/mietstufen/normalisieren` nicht gefunden.

- [ ] **Step 3: Implementieren** (`src/mietstufen/normalisieren.ts`)

```ts
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
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run test/mietstufen/normalisieren.test.ts && npx tsc --noEmit; echo "exit=$?"`
Expected: `11 passed`, `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add src/mietstufen test/mietstufen
git commit -m "E3: Namensnormalisierung für die Ortssuche (Umlaute, ß, Abkürzungen des Verzeichnisses, Titel, Klammerzusätze)"
```

---

### Task 8: Ortssuche

**Files:**
- Create: `src/mietstufen/suche.ts`
- Test: `test/mietstufen/suche.test.ts`

**Interfaces:**
- Consumes: `MietstufenDaten`, `SuchEingabe`, `SuchErgebnis` (Task 1); Normalisierung (Task 7)
- Produces: `erzeugeSuche(daten): (eingabe) => SuchErgebnis`; Konstanten `MAX_KANDIDATEN`, `MAX_AEHNLICH`, `ABSTAND_LANG`, `ABSTAND_KURZ`

Ablauf (Rulings 5 bis 7): Schlüssel der Eingabe (mit und ohne Titelwort) gegen die starken und schwachen Schlüssel der Gemeinden; Land- und Kreisfilter; ein Treffer → `eindeutig`, mehrere → `mehrdeutig` (höchstens 25 mit Gesamtzahl), keiner → lockere Umlautsuche, sonst Teilnamen als Vorschlag, sonst Tippfehler-Abstand. Der Test arbeitet mit einem kleinen, von Hand gebauten Bestand; die echten Daten kommen in Task 9.

- [ ] **Step 1: Failing test schreiben** (`test/mietstufen/suche.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { MAX_AEHNLICH, MAX_KANDIDATEN, erzeugeSuche } from "../../src/mietstufen/suche";
import type { GemeindeZeile, MietstufenDaten, SuchErgebnis } from "../../src/mietstufen/typen";

// Kleiner, von Hand gebauter Bestand: jede Regel der Suche hat hier einen Fall mit bekanntem Ausgang.
const LAENDER = { "01": "Schleswig-Holstein", "06": "Hessen", "07": "Rheinland-Pfalz", "09": "Bayern", "12": "Brandenburg", "14": "Sachsen", "16": "Thüringen" };
const KREISE = {
  "01059": "Schleswig-Flensburg",
  "06534": "Marburg-Biedenkopf", "06412": "Frankfurt am Main, Stadt",
  "07138": "Neuwied", "09162": "München, Landeshauptstadt", "09184": "München", "09279": "Dingolfing-Landau",
  "09186": "Pfaffenhofen a.d.Ilm", "12053": "Frankfurt (Oder), Stadt", "14713": "Leipzig, Stadt", "14729": "Leipzig",
  "16055": "Weimar, Stadt",
};
const GEMEINDEN: GemeindeZeile[] = [
  ["01059100", "Süderbrarup", 1, "k"],
  ["06412000", "Frankfurt am Main, Stadt", 6, "g"],
  ["06534016", "Neustadt (Hessen), Stadt", 1, "g"],
  ["06534020", "Weimar (Lahn)", 1, "k"],
  ["07138060", "Neustadt (Wied)", 1, "k"],
  ["09162000", "München, Landeshauptstadt", 7, "g"],
  ["09184145", "Taufkirchen", 2, "g"],
  ["09279122", "Landau a.d.Isar, St", 2, "g"],
  ["09186143", "Pfaffenhofen a.d.Ilm, St", 4, "g"],
  ["12053000", "Frankfurt (Oder), Stadt", 2, "g"],
  ["14713000", "Leipzig, Stadt", 2, "g"],
  ["14729010", "Borna, Stadt", 1, "g"],
  ["14729999", "Neuort", 1, "n"],
  ["16055000", "Weimar, Stadt", 3, "g"],
  ["16055100", "Muster-Insel", 5, "i"],
  ["07138070", "Köln-Test", 3, "g"],
];
const DATEN = (extra: GemeindeZeile[] = []): MietstufenDaten => ({
  meta: {
    rechtsgrundlage: "Test",
    anlage: { titel: "a", url: "u", abruf: "2026-10-08", sha256: "0" },
    gemeindeverzeichnis_basis: { titel: "b", url: "u", abruf: "2026-10-08", sha256: "0", gebietsstand: "31.12.2020" },
    gemeindeverzeichnis_aktuell: { titel: "c", url: "u", abruf: "2026-10-08", sha256: "0", gebietsstand: "31.12.2025" },
    hinweis: "",
    anzahl: { anlage_zeilen: 0, gemeinden: GEMEINDEN.length + extra.length, kreise: 0, je_herkunft: { g: 0, k: 0, i: 0, n: 0 } },
  },
  laender: LAENDER,
  kreise: KREISE,
  gemeinden: [...GEMEINDEN, ...extra],
});
const suche = erzeugeSuche(DATEN());

function eindeutig(e: SuchErgebnis) {
  if (e.status !== "eindeutig") throw new Error(`erwartet eindeutig, war ${e.status}: ${JSON.stringify(e)}`);
  return e.treffer;
}
const namen = (e: SuchErgebnis) => (e.status === "mehrdeutig" ? e.kandidaten : e.status === "nicht_gefunden" ? e.aehnlich : []).map((k) => k.gemeinde);

describe("Ortssuche: eindeutige Treffer", () => {
  it("findet den Ort mit und ohne Zusatz, in jeder Groß- und Kleinschreibung", () => {
    for (const eingabe of ["Leipzig", "leipzig", "LEIPZIG", "Leipzig, Stadt", "Stadt Leipzig", "  Leipzig  "]) {
      const t = eindeutig(suche({ gemeinde: eingabe }));
      expect([t.gemeinde, t.mietstufe]).toEqual(["Leipzig, Stadt", 2]);
    }
  });

  it("ß, Umlaute und Umschreibungen: Köln-Test / Koeln-Test, München / Muenchen / Munchen", () => {
    expect(eindeutig(suche({ gemeinde: "Muenchen" })).gemeinde).toBe("München, Landeshauptstadt");
    expect(eindeutig(suche({ gemeinde: "MÜNCHEN" })).gemeinde).toBe("München, Landeshauptstadt");
    expect(eindeutig(suche({ gemeinde: "Munchen" })).gemeinde).toBe("München, Landeshauptstadt");
    expect(eindeutig(suche({ gemeinde: "Koeln-Test" })).gemeinde).toBe("Köln-Test");
  });

  it("Abkürzungen des Verzeichnisses: „Landau an der Isar“ findet „Landau a.d.Isar, St“", () => {
    expect(eindeutig(suche({ gemeinde: "Landau an der Isar" })).gemeinde).toBe("Landau a.d.Isar, St");
    expect(eindeutig(suche({ gemeinde: "Pfaffenhofen an der Ilm" })).mietstufe).toBe(4);
  });

  it("Ausgabe nennt Kreis, Land und die Quelle der Stufe", () => {
    expect(eindeutig(suche({ gemeinde: "Süderbrarup" }))).toEqual({
      gemeinde: "Süderbrarup",
      kreis: "Schleswig-Flensburg",
      land: "Schleswig-Holstein",
      mietstufe: 1,
      quelle: "WoGV-Anlage, Kreistabelle Schleswig-Holstein: Schleswig-Flensburg (Gemeinde nicht gesondert aufgeführt, Vorbemerkung der Anlage)",
    });
    expect(eindeutig(suche({ gemeinde: "Leipzig" })).quelle).toBe("WoGV-Anlage, Gemeindetabelle Sachsen");
    expect(eindeutig(suche({ gemeinde: "Muster-Insel" })).quelle).toBe("WoGV-Anlage, Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG)");
    const neu = eindeutig(suche({ gemeinde: "Neuort" }));
    expect(neu.mietstufe).toBe(1);
    expect(neu.quelle).toContain("Annahme");
    expect(neu.quelle).toContain("Gemeindeverzeichnis 31.12.2020");
  });
});

describe("Ortssuche: mehrdeutig (Spec 3.3, Test 6)", () => {
  it("„Neustadt“ gibt es als Klammer-Name mehrfach: Kandidatenliste statt Raten", () => {
    const e = suche({ gemeinde: "Neustadt" });
    expect(e.status).toBe("mehrdeutig");
    expect(namen(e)).toEqual(["Neustadt (Hessen), Stadt", "Neustadt (Wied)"]);
  });

  it("Land oder Kreis machen den Treffer eindeutig, auch als Kürzel und Landkreis-Schreibweise", () => {
    expect(eindeutig(suche({ gemeinde: "Neustadt", land: "Hessen" })).gemeinde).toBe("Neustadt (Hessen), Stadt");
    expect(eindeutig(suche({ gemeinde: "Neustadt", land: "HE" })).gemeinde).toBe("Neustadt (Hessen), Stadt");
    expect(eindeutig(suche({ gemeinde: "Neustadt", land: "rp" })).gemeinde).toBe("Neustadt (Wied)");
    expect(eindeutig(suche({ gemeinde: "Neustadt", kreis: "Landkreis Neuwied" })).gemeinde).toBe("Neustadt (Wied)");
    expect(eindeutig(suche({ gemeinde: "Weimar", land: "Freistaat Thüringen" })).mietstufe).toBe(3);
  });

  it("Weimar: Stadt in Thüringen (III) und Weimar (Lahn) in Hessen (I) sind zwei verschiedene Orte", () => {
    const e = suche({ gemeinde: "Weimar" });
    expect(e.status).toBe("mehrdeutig");
    expect(e.status === "mehrdeutig" ? e.kandidaten.map((k) => [k.land, k.mietstufe]) : []).toEqual([["Hessen", 1], ["Thüringen", 3]]);
  });

  it("Frankfurt: nur über den Klammerzusatz gefunden, aber ein Ort beginnt mit dem Namen – beide kommen", () => {
    const e = suche({ gemeinde: "Frankfurt" });
    expect(e.status).toBe("mehrdeutig");
    expect(namen(e)).toEqual(["Frankfurt (Oder), Stadt", "Frankfurt am Main, Stadt"].sort());
  });

  it("Leipzig Stadt gegen Leipzig Kreis: die Stadt hat II, die Gemeinde Borna im Landkreis I", () => {
    expect(eindeutig(suche({ gemeinde: "Leipzig" })).mietstufe).toBe(2);
    expect(eindeutig(suche({ gemeinde: "Borna", kreis: "Landkreis Leipzig" })).mietstufe).toBe(1);
    // Der Kreisvergleich ignoriert „Landkreis/Kreis/Stadt“: Stadt und Landkreis Leipzig heißen für ihn gleich.
    // Das schadet nicht, weil die kreisfreie Stadt nur eine Gemeinde hat; Borna bleibt eindeutig.
    expect(eindeutig(suche({ gemeinde: "Borna", kreis: "Leipzig, Stadt" })).mietstufe).toBe(1);
  });

  it("Ausreißer im Kreis behält seine eigene Stufe: Taufkirchen II im Kreis München", () => {
    expect(eindeutig(suche({ gemeinde: "Taufkirchen", kreis: "München" })).mietstufe).toBe(2);
  });

  it(`Ergebnislisten sind auf ${MAX_KANDIDATEN} Einträge begrenzt, die Gesamtzahl steht in anzahl`, () => {
    const viele: GemeindeZeile[] = Array.from({ length: 30 }, (_, i) => [`07138${String(100 + i).padStart(3, "0")}`, `Zell (Ort ${String(i).padStart(2, "0")})`, 1, "k"]);
    const e = erzeugeSuche(DATEN(viele))({ gemeinde: "Zell" });
    expect(e.status).toBe("mehrdeutig");
    if (e.status === "mehrdeutig") {
      expect(e.anzahl).toBe(30);
      expect(e.kandidaten).toHaveLength(MAX_KANDIDATEN);
    }
  });
});

describe("Ortssuche: nicht gefunden mit ähnlichen Namen", () => {
  it("Teilname ist nie ein eindeutiger Treffer, sondern ein Vorschlag", () => {
    const e = suche({ gemeinde: "Frankfurt am" });
    expect(e.status).toBe("nicht_gefunden");
    expect(namen(e)).toEqual(["Frankfurt am Main, Stadt"]);
    expect(namen(suche({ gemeinde: "Pfaffenhofen" }))).toEqual(["Pfaffenhofen a.d.Ilm, St"]);
  });

  it("Tippfehler: Abstand 2 ab fünf Buchstaben, Abstand 1 bei vier, darunter nichts", () => {
    expect(namen(suche({ gemeinde: "Muenchne" }))).toEqual(["München, Landeshauptstadt"]);
    expect(namen(suche({ gemeinde: "Leipzog" }))).toEqual(["Leipzig, Stadt"]);
    expect(namen(suche({ gemeinde: "Borma" }))).toEqual(["Borna, Stadt"]);
    expect(namen(suche({ gemeinde: "Born" }))).toEqual(["Borna, Stadt"]);
    expect(suche({ gemeinde: "Bxr" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
    expect(suche({ gemeinde: "Atlantis" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
  });

  it(`höchstens ${MAX_AEHNLICH} Vorschläge, leere Eingabe ergibt nichts`, () => {
    const viele: GemeindeZeile[] = Array.from({ length: 12 }, (_, i) => [`07138${String(200 + i).padStart(3, "0")}`, `Berg an der Nr ${String(i).padStart(2, "0")}`, 1, "k"]);
    const e = erzeugeSuche(DATEN(viele))({ gemeinde: "Berg an" });
    expect(e.status === "nicht_gefunden" ? e.aehnlich : []).toHaveLength(MAX_AEHNLICH);
    expect(suche({ gemeinde: "" })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
    expect(suche({ gemeinde: "   ,  " })).toEqual({ status: "nicht_gefunden", aehnlich: [] });
  });

  it("Land oder Kreis, in dem es den Ort nicht gibt, ergibt nicht gefunden statt eines Treffers aus einem anderen Land", () => {
    expect(suche({ gemeinde: "Leipzig", land: "Bayern" }).status).toBe("nicht_gefunden");
    expect(suche({ gemeinde: "Leipzig", kreis: "Neuwied" }).status).toBe("nicht_gefunden");
  });
});
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `npx vitest run test/mietstufen/suche.test.ts`
Expected: FAIL, `src/mietstufen/suche` nicht gefunden.

- [ ] **Step 3: Implementieren** (`src/mietstufen/suche.ts`)

```ts
import type { Herkunft, MietstufenDaten, MietstufenTreffer, SuchEingabe, SuchErgebnis } from "./typen";
import { abstand, gemeindeSchluessel, kreisSchluessel, lockerSchluessel, normalisiere, ohneTitel } from "./normalisieren";
import type { Mietstufe } from "../rechtsstand/typen";

// Ergebnislisten sind begrenzt, damit eine Antwort kurz bleibt. Die Gesamtzahl steht in `anzahl`.
export const MAX_KANDIDATEN = 25;
export const MAX_AEHNLICH = 5;
// „Meinten Sie“: erlaubter Levenshtein-Abstand 2 ab 5 Zeichen, 1 bei genau 4, darunter keine Vorschläge.
export const ABSTAND_LANG = 2;
export const ABSTAND_KURZ = 1;

// Postalische Kürzel der Länder gegen den amtlichen Länderschlüssel.
const KUERZEL: Readonly<Record<string, string>> = {
  sh: "01", hh: "02", ni: "03", hb: "04", nw: "05", he: "06", rp: "07", bw: "08",
  by: "09", sl: "10", be: "11", bb: "12", mv: "13", sn: "14", st: "15", th: "16",
};

interface Eintrag {
  ags: string;
  name: string;
  stufe: Mietstufe;
  herkunft: Herkunft;
  land: string;
  kreis: string;
  kreisSchluessel: string;
  stark: string[];
  schwach: string[];
}

const vergleiche = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function erzeugeSuche(daten: MietstufenDaten): (eingabe: SuchEingabe) => SuchErgebnis {
  const stand = daten.meta.gemeindeverzeichnis_basis.gebietsstand ?? "";
  const eintraege: Eintrag[] = daten.gemeinden.map(([ags, name, stufe, herkunft]) => {
    const kreis = daten.kreise[ags.slice(0, 5)] ?? "";
    return { ags, name, stufe, herkunft, land: daten.laender[ags.slice(0, 2)] ?? "", kreis, kreisSchluessel: kreisSchluessel(kreis), ...gemeindeSchluessel(name) };
  });

  const quelle = (e: Eintrag): string => {
    switch (e.herkunft) {
      case "g":
        return `WoGV-Anlage, Gemeindetabelle ${e.land}`;
      case "k":
        return `WoGV-Anlage, Kreistabelle ${e.land}: ${e.kreis} (Gemeinde nicht gesondert aufgeführt, Vorbemerkung der Anlage)`;
      case "i":
        return "WoGV-Anlage, Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG)";
      case "n":
        return `WoGV-Anlage, Kreistabelle ${e.land}: ${e.kreis}. Annahme: Gemeinde fehlt im Gemeindeverzeichnis ${stand} (neu gebildet oder neu geschlüsselt), es gilt die Stufe des Kreises`;
    }
  };
  const treffer = (e: Eintrag): MietstufenTreffer => ({ gemeinde: e.name, kreis: e.kreis, land: e.land, mietstufe: e.stufe, quelle: quelle(e) });

  const stark = new Map<string, Eintrag[]>();
  const schwach = new Map<string, Eintrag[]>();
  const locker = new Map<string, Set<Eintrag>>();
  const eintragen = <K>(m: Map<string, K[]>, k: string, e: K): void => {
    const liste = m.get(k);
    if (liste) liste.push(e);
    else m.set(k, [e]);
  };
  for (const e of eintraege) {
    for (const k of e.stark) eintragen(stark, k, e);
    for (const k of e.schwach) eintragen(schwach, k, e);
    for (const k of [...e.stark, ...e.schwach]) {
      const l = lockerSchluessel(k);
      const menge = locker.get(l);
      if (menge) menge.add(e);
      else locker.set(l, new Set([e]));
    }
  }

  const filtere = (liste: readonly Eintrag[], eingabe: SuchEingabe): Eintrag[] => {
    let r = [...liste];
    if (eingabe.land) {
      const l = normalisiere(eingabe.land).replace(/^freistaat /, "");
      const code = KUERZEL[l];
      r = r.filter((e) => normalisiere(e.land) === l || e.ags.slice(0, 2) === code);
    }
    if (eingabe.kreis) {
      const k = kreisSchluessel(eingabe.kreis);
      r = r.filter((e) => e.kreisSchluessel === k || e.kreisSchluessel.startsWith(`${k} `));
    }
    return r;
  };
  const geordnet = (liste: Eintrag[]): Eintrag[] => liste.sort((a, b) => vergleiche(a.land, b.land) || vergleiche(a.name, b.name));
  const mehrdeutig = (liste: Eintrag[]): SuchErgebnis => ({
    status: "mehrdeutig",
    anzahl: liste.length,
    kandidaten: geordnet(liste).slice(0, MAX_KANDIDATEN).map(treffer),
  });

  return (eingabe) => {
    const q0 = normalisiere(eingabe.gemeinde);
    const q1 = ohneTitel(q0);
    const anfragen = [...new Set([q0, q1])].filter((q) => q !== "");

    const gefunden = new Set<Eintrag>();
    for (const q of anfragen) {
      for (const e of stark.get(q) ?? []) gefunden.add(e);
      for (const e of schwach.get(q) ?? []) gefunden.add(e);
    }
    let liste = filtere([...gefunden], eingabe);
    // Nur über den Klammerzusatz oder Schrägstrich gefunden („Frankfurt“ -> Frankfurt (Oder)):
    // Gemeinden, deren Name mit der Eingabe beginnt, gehören dazu („Frankfurt am Main“).
    const hatStarkenTreffer = liste.some((e) => e.stark.some((k) => anfragen.includes(k)));
    const wortAnfang = (e: Eintrag): boolean => e.stark.some((k) => k.startsWith(`${q1} `));
    if (liste.length === 1 && !hatStarkenTreffer) {
      const einziger = liste[0];
      liste = [...liste, ...filtere(eintraege.filter((e) => e !== einziger && wortAnfang(e)), eingabe)];
    }
    if (liste.length === 1 && liste[0]) return { status: "eindeutig", treffer: treffer(liste[0]) };
    if (liste.length > 1) return mehrdeutig(liste);

    // Teilnamen sind nie ein eindeutiger Treffer: „Bad Homburg“ liefert „Bad Homburg v. d. Höhe“ nur als Vorschlag.
    if (anfragen.length === 0) return { status: "nicht_gefunden", aehnlich: [] };
    const teilname = filtere(
      eintraege.filter((e) => e.stark.some((k) => k.startsWith(`${q1} `) || ` ${k} `.includes(` ${q1} `))),
      eingabe,
    );

    // Lockere Umlautsuche („Munchen“): findet sie genau einen Ort oder mehrere, gilt sie wie ein Treffer.
    const lose = filtere([...(locker.get(lockerSchluessel(q0)) ?? locker.get(lockerSchluessel(q1)) ?? [])], eingabe);
    if (lose.length === 1 && lose[0]) return { status: "eindeutig", treffer: treffer(lose[0]) };
    if (lose.length > 1) return mehrdeutig(lose);

    if (teilname.length > 0) return { status: "nicht_gefunden", aehnlich: geordnet(teilname).slice(0, MAX_AEHNLICH).map(treffer) };
    const grenze = q1.length >= 5 ? ABSTAND_LANG : q1.length === 4 ? ABSTAND_KURZ : -1;
    if (grenze < 0) return { status: "nicht_gefunden", aehnlich: [] };
    const nah = filtere(eintraege, eingabe)
      .map((e): [number, Eintrag] => [Math.min(...e.stark.map((k) => abstand(q1, k))), e])
      .filter(([d]) => d <= grenze)
      .sort((x, y) => x[0] - y[0] || vergleiche(x[1].name, y[1].name));
    return { status: "nicht_gefunden", aehnlich: nah.slice(0, MAX_AEHNLICH).map(([, e]) => treffer(e)) };
  };
}
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run test/mietstufen/suche.test.ts && npx tsc --noEmit; echo "exit=$?"`
Expected: `15 passed`, `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add src/mietstufen test/mietstufen
git commit -m "E3: Ortssuche (eindeutig, mehrdeutig, nicht gefunden mit Vorschlägen; Land- und Kreisfilter)"
```

---

### Task 9: Daten laden, Test 6, Node-frei

**Files:**
- Create: `src/mietstufen/daten.ts`
- Modify: `tsconfig.json` (`"resolveJsonModule": true`)
- Test: `test/mietstufen/mietstufen.test.ts` (Test 6 der Spec), `test/mietstufen/node-frei.test.ts`

**Interfaces:**
- Consumes: `data/mietstufen-2023.json` (Task 6), `erzeugeSuche` (Task 8), `MIETSTUFEN` aus `src/rechtsstand/typen.ts`
- Produces: `MIETSTUFEN_DATEN`, `pruefeMietstufenDaten(roh: unknown)`, `sucheMietstufe(eingabe): SuchErgebnis` (aus `src/mietstufen/daten.ts`; E4 importiert von dort)

Die JSON-Datei wird beim ersten Zugriff geprüft (Aufbau, 8-stellige AGS ohne Dopplung, Stufe 1 bis 7, Herkunft, Land und Kreis im Bestand). Der Suchindex entsteht beim ersten Aufruf, nicht beim Laden des Moduls (gemessen 63 ms, danach unter 1 ms je Suche).

- [ ] **Step 1: Failing tests schreiben**

`test/mietstufen/mietstufen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MIETSTUFEN_DATEN, pruefeMietstufenDaten, sucheMietstufe } from "../../src/mietstufen/daten";
import type { SuchEingabe, SuchErgebnis } from "../../src/mietstufen/typen";
import { BMWSB_2025 } from "../fixtures/bmwsb-2025";

// Test 6 der Spec: Mietstufen. Sollwerte stammen aus der WoGV-Anlage (Stufe je Zeile), dem
// Gemeindeverzeichnis 31.12.2025 (Namen, Kreise) und den BMWSB-Beispielen (Stand 01.01.2025).

const eindeutig = (e: SuchErgebnis) => {
  if (e.status !== "eindeutig") throw new Error(`erwartet eindeutig, war ${e.status}: ${JSON.stringify(e)}`);
  return e.treffer;
};
const kandidaten = (e: SuchErgebnis) => (e.status === "mehrdeutig" ? e.kandidaten : e.status === "nicht_gefunden" ? e.aehnlich : []);

// Das BMWSB nennt nur „Jüterbog“, „Ludwigshafen“, „Weimar“ usw. Die Suche braucht den vollen Namen
// oder einen Zusatz, wo der Name mehrfach vorkommt (Weimar in Thüringen und Weimar (Lahn) in Hessen).
const SUCHE_ZU_BEISPIEL: Record<number, SuchEingabe> = {
  1: { gemeinde: "Jüterbog" },
  2: { gemeinde: "Ludwigshafen am Rhein" },
  3: { gemeinde: "Leipzig" },
  4: { gemeinde: "Süderbrarup", kreis: "Schleswig-Flensburg" }, // Gemeinde unter 10.000 Einwohnern im „Kreis Schleswig-Flensburg“
  5: { gemeinde: "Wiesbaden" },
  6: { gemeinde: "München" },
  7: { gemeinde: "Weimar", land: "Thüringen" },
  8: { gemeinde: "Friedrichshafen" },
  9: { gemeinde: "Attendorn" },
  10: { gemeinde: "Lübeck" },
  11: { gemeinde: "Neubrandenburg" },
};

describe("Mietstufen: die 11 Beispielorte des BMWSB", () => {
  for (const fall of BMWSB_2025) {
    it(`Beispiel ${fall.nr} (${fall.ort}) hat Stufe ${fall.mietstufe}`, () => {
      const eingabe = SUCHE_ZU_BEISPIEL[fall.nr];
      expect(eingabe).toBeDefined();
      expect(eindeutig(sucheMietstufe(eingabe!)).mietstufe).toBe(fall.mietstufe);
    });
  }

  it("„Ludwigshafen“ allein ist ein Teilname: kein Treffer, sondern Vorschläge (auch Bodman-Ludwigshafen am Bodensee)", () => {
    const e = sucheMietstufe({ gemeinde: "Ludwigshafen" });
    expect(e.status).toBe("nicht_gefunden");
    expect(kandidaten(e).map((k) => k.gemeinde)).toEqual(["Bodman-Ludwigshafen", "Ludwigshafen am Rhein, Stadt"]);
  });
});

describe("Mietstufen: Ort unter 10.000 Einwohnern über seinen Kreis (Vorbemerkung der Anlage)", () => {
  it("Süderbrarup erbt die Stufe I des Kreises Schleswig-Flensburg, Handewitt (über 10.000) hat II aus der Gemeindetabelle", () => {
    const klein = eindeutig(sucheMietstufe({ gemeinde: "Süderbrarup" }));
    expect(klein).toMatchObject({ kreis: "Schleswig-Flensburg", land: "Schleswig-Holstein", mietstufe: 1 });
    expect(klein.quelle).toContain("Kreistabelle Schleswig-Holstein: Schleswig-Flensburg");
    const gross = eindeutig(sucheMietstufe({ gemeinde: "Handewitt" }));
    expect(gross.mietstufe).toBe(2);
    expect(gross.quelle).toBe("WoGV-Anlage, Gemeindetabelle Schleswig-Holstein");
  });

  it("Pasewalk hat über 10.000 Einwohner, steht aber nicht in der Anlage: Kreisstufe, wie die Anlage es festlegt", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Pasewalk" }))).toMatchObject({ kreis: "Vorpommern-Greifswald", mietstufe: 1 });
  });
});

describe("Mietstufen: Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG) vor dem Kreisfallback", () => {
  it("Pellworm V statt Kreis Nordfriesland I; Borkum V statt Kreis Leer I; Hiddensee V statt Vorpommern-Rügen II", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Pellworm" }))).toMatchObject({ kreis: "Nordfriesland", mietstufe: 5 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Borkum" }))).toMatchObject({ kreis: "Leer", mietstufe: 5 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Insel Hiddensee" }))).toMatchObject({ kreis: "Vorpommern-Rügen", mietstufe: 5 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Pellworm" })).quelle).toContain("Inseln ohne Festlandanschluss");
  });

  it("Festlandnachbar bleibt bei der Kreisstufe: Aventoft (Nordfriesland) I; Sylt hat eine eigene Zeile mit V", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Aventoft" })).mietstufe).toBe(1);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Sylt" }))).toMatchObject({ mietstufe: 5, quelle: "WoGV-Anlage, Gemeindetabelle Schleswig-Holstein" });
  });
});

describe("Mietstufen: Leipzig Stadt gegen Leipzig Kreis", () => {
  it("die Stadt Leipzig hat II, eine Gemeinde im Landkreis Leipzig I", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Leipzig" }))).toMatchObject({ kreis: "Leipzig, Stadt", mietstufe: 2 });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Borna", kreis: "Landkreis Leipzig" }))).toMatchObject({ kreis: "Leipzig", mietstufe: 1 });
  });
});

describe("Mietstufen: mehrdeutige Namen", () => {
  it("„Neustadt“ hat fünf Gemeinden gleichen Namens mit Klammer- oder Schrägstrichzusatz", () => {
    const e = sucheMietstufe({ gemeinde: "Neustadt" });
    expect(e.status).toBe("mehrdeutig");
    expect(e.status === "mehrdeutig" ? e.anzahl : 0).toBe(5);
    expect(kandidaten(e).map((k) => `${k.gemeinde} | ${k.land}`)).toEqual([
      "Neustadt (Dosse), Stadt | Brandenburg",
      "Neustadt (Hessen), Stadt | Hessen",
      "Neustadt (Wied) | Rheinland-Pfalz",
      "Neustadt/ Westerwald | Rheinland-Pfalz",
      "Neustadt/Vogtl. | Sachsen",
    ]);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Neustadt", land: "Hessen" })).gemeinde).toBe("Neustadt (Hessen), Stadt");
  });

  it("Frankfurt: Frankfurt (Oder) über den Klammerzusatz, dazu Frankfurt am Main, dessen Name mit der Eingabe beginnt", () => {
    const e = sucheMietstufe({ gemeinde: "Frankfurt" });
    expect(e.status).toBe("mehrdeutig");
    expect(kandidaten(e).map((k) => `${k.gemeinde}:${k.mietstufe}`)).toEqual(["Frankfurt (Oder), Stadt:2", "Frankfurt am Main, Stadt:6"]);
  });

  it("Eisenach gibt es in Thüringen (Stadt, II) und in Rheinland-Pfalz (Gemeinde, I)", () => {
    const e = sucheMietstufe({ gemeinde: "Eisenach" });
    expect(e.status).toBe("mehrdeutig");
    expect(kandidaten(e).map((k) => [k.land, k.mietstufe])).toEqual([["Rheinland-Pfalz", 1], ["Thüringen", 2]]);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Eisenach", land: "TH" })).mietstufe).toBe(2);
  });

  it("Taufkirchen: drei Gemeinden in Bayern; Landkreis München ist II (Ausreißer im Kreis mit VII)", () => {
    const e = sucheMietstufe({ gemeinde: "Taufkirchen" });
    expect(e.status).toBe("mehrdeutig");
    expect(kandidaten(e).map((k) => `${k.kreis}:${k.mietstufe}`).sort()).toEqual(["Erding:5", "Mühldorf a.Inn:1", "München:2"]);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Taufkirchen", kreis: "Landkreis München" })).mietstufe).toBe(2);
  });
});

describe("Mietstufen: neu gebildete Gemeinden (Annahme: Kreisstufe)", () => {
  it("Jahnatal (Mittelsachsen) und Berga-Wünschendorf (Greiz) bekommen I mit Hinweis auf die Annahme", () => {
    const j = eindeutig(sucheMietstufe({ gemeinde: "Jahnatal" }));
    expect(j).toMatchObject({ kreis: "Mittelsachsen", mietstufe: 1 });
    expect(j.quelle).toContain("Annahme");
    expect(eindeutig(sucheMietstufe({ gemeinde: "Berga-Wünschendorf" }))).toMatchObject({ kreis: "Greiz", mietstufe: 1 });
  });

  it("Langelsheim und Eisenach (neuer Schlüssel, gleiche Gemeinde) behalten ihre Stufe aus der Anlage ohne Annahme", () => {
    expect(eindeutig(sucheMietstufe({ gemeinde: "Langelsheim" }))).toMatchObject({ mietstufe: 1, quelle: "WoGV-Anlage, Gemeindetabelle Niedersachsen" });
    expect(eindeutig(sucheMietstufe({ gemeinde: "Eisenach", land: "Thüringen" })).quelle).not.toContain("Annahme");
  });
});

describe("Mietstufen: Eingabevarianten", () => {
  it("Schreibweisen führen zum selben Ort", () => {
    const soll = eindeutig(sucheMietstufe({ gemeinde: "Dießen am Ammersee" }));
    expect(soll).toMatchObject({ gemeinde: "Dießen am Ammersee, M", mietstufe: 5 });
    for (const g of ["Diessen am Ammersee", "dießen a. ammersee", "Markt Dießen am Ammersee"]) {
      expect(eindeutig(sucheMietstufe({ gemeinde: g })).gemeinde, g).toBe(soll.gemeinde);
    }
    expect(eindeutig(sucheMietstufe({ gemeinde: "Koeln" })).mietstufe).toBe(6);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Munchen" })).mietstufe).toBe(7);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Lauf an der Pegnitz" })).mietstufe).toBe(4);
  });

  it("Tippfehler und Teilnamen geben Vorschläge, keine Treffer", () => {
    expect(kandidaten(sucheMietstufe({ gemeinde: "Hamburk" })).map((k) => k.gemeinde)[0]).toBe("Hamburg, Freie und Hansestadt");
    expect(sucheMietstufe({ gemeinde: "Bad Homburg" }).status).toBe("nicht_gefunden");
    expect(kandidaten(sucheMietstufe({ gemeinde: "Hiddensee" })).map((k) => k.gemeinde)).toEqual(["Insel Hiddensee, Seebad"]);
  });
});

describe("Mietstufen: Daten gegen die Quelle", () => {
  it("jede Stufe liegt zwischen I und VII, jede Gemeinde hat Land und Kreis im Bestand", () => {
    expect(MIETSTUFEN_DATEN.gemeinden.every(([, , stufe]) => stufe >= 1 && stufe <= 7)).toBe(true);
    expect(MIETSTUFEN_DATEN.gemeinden.every(([ags]) => MIETSTUFEN_DATEN.laender[ags.slice(0, 2)] && MIETSTUFEN_DATEN.kreise[ags.slice(0, 5)])).toBe(true);
  });

  it("Zeilenzahl der Anlage im Kopf: 1.881 = 1.601 Gemeinden + 279 Kreise + 1 Inselzeile, und 1.601 Gemeindezeilen tragen ihre Stufe", () => {
    expect(MIETSTUFEN_DATEN.meta.anzahl.anlage_zeilen).toBe(1601 + 279 + 1);
    expect(MIETSTUFEN_DATEN.gemeinden.filter((g) => g[3] === "g")).toHaveLength(1601);
  });
});

describe("pruefeMietstufenDaten: kaputte Dateien scheitern laut", () => {
  const ok = { meta: {}, laender: { "01": "SH" }, kreise: { "01001": "Flensburg" }, gemeinden: [["01001000", "Flensburg, Stadt", 3, "g"]] };

  it("gültiger Aufbau wird angenommen", () => {
    expect(pruefeMietstufenDaten(ok).gemeinden).toHaveLength(1);
  });

  it.each([
    ["Stufe 8", { ...ok, gemeinden: [["01001000", "Flensburg, Stadt", 8, "g"]] }, /Stufe 8/],
    ["Stufe als Text", { ...ok, gemeinden: [["01001000", "Flensburg, Stadt", "3", "g"]] }, /Stufe 3/],
    ["unbekannte Herkunft", { ...ok, gemeinden: [["01001000", "Flensburg, Stadt", 3, "x"]] }, /Herkunft x/],
    ["AGS zu kurz", { ...ok, gemeinden: [["1001000", "Flensburg, Stadt", 3, "g"]] }, /AGS 1001000/],
    ["doppelte AGS", { ...ok, gemeinden: [["01001000", "A", 3, "g"], ["01001000", "B", 3, "g"]] }, /doppelt/],
    ["Kreis unbekannt", { ...ok, gemeinden: [["01059001", "A", 3, "g"]] }, /Kreis 01059/],
    ["Land unbekannt", { ...ok, gemeinden: [["02001000", "A", 3, "g"]] }, /Land 02/],
    ["Zeile mit drei Feldern", { ...ok, gemeinden: [["01001000", "A", 3]] }, /vier Felder/],
    ["kein Objekt", [], /Aufbau/],
  ])("%s", (_name, roh, muster) => {
    expect(() => pruefeMietstufenDaten(roh)).toThrow(muster);
  });
});
```

`test/mietstufen/node-frei.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Spec Abschnitt 3: Mietstufen sind ohne Server testbar und Node-frei, damit sie auf Workers und
// später im Widget laufen. Abhängigkeiten laufen nur `mietstufen -> rechtsstand` (Typen).
const VERZEICHNIS = resolve(import.meta.dirname, "..", "..", "src", "mietstufen");
const ERLAUBTE_IMPORTE = /^(\.\/[a-z]+|\.\.\/rechtsstand\/typen|\.\.\/\.\.\/data\/mietstufen-2023\.json)$/;

function verstoesse(quelltext: string): string[] {
  const funde: string[] = [];
  const ohneKommentare = quelltext.replace(/\/\/.*$/gm, "");
  for (const muster of [/\bprocess\./, /\bBuffer\b/, /\brequire\(/, /\bimport\(/, /\bfetch\(/]) {
    if (muster.test(ohneKommentare)) funde.push(`verbotener Ausdruck ${muster}`);
  }
  for (const m of ohneKommentare.matchAll(/from\s+["']([^"']+)["']/g)) {
    const ziel = m[1] ?? "";
    if (!ERLAUBTE_IMPORTE.test(ziel)) funde.push(`Import ${ziel}`);
  }
  return funde;
}

describe("src/mietstufen ist Node-frei und hängt nur an rechtsstand/typen", () => {
  const dateien = readdirSync(VERZEICHNIS).filter((d) => d.endsWith(".ts"));

  it("es gibt die vier Quelldateien", () => {
    expect(dateien.sort()).toEqual(["daten.ts", "normalisieren.ts", "suche.ts", "typen.ts"].sort());
  });

  for (const datei of dateien) {
    it(`${datei} hat keine Node-Importe und keine Importe aus engine, server oder scripts`, () => {
      expect(verstoesse(readFileSync(resolve(VERZEICHNIS, datei), "utf8"))).toEqual([]);
    });
  }

  it("Gegenprobe: der Prüfer erkennt Node-Importe, Fremdimporte und Netzzugriffe", () => {
    expect(verstoesse('import { readFileSync } from "node:fs";')).toHaveLength(1);
    expect(verstoesse('import { berechneWohngeld } from "../engine/berechnen";')).toHaveLength(1);
    expect(verstoesse('import x from "../../scripts/mietstufen/gv";')).toHaveLength(1);
    expect(verstoesse("const b = Buffer.from('x');")).toHaveLength(1);
    expect(verstoesse('import { a } from "./suche"; // process.env im Kommentar')).toEqual([]);
  });
});
```

- [ ] **Step 2: Tests rot laufen lassen**

Run: `npx vitest run test/mietstufen/mietstufen.test.ts test/mietstufen/node-frei.test.ts`
Expected: FAIL, `src/mietstufen/daten` nicht gefunden (node-frei: „es gibt die vier Quelldateien“ schlägt fehl, `daten.ts` fehlt).

- [ ] **Step 3: Implementieren**

In `tsconfig.json` unter `compilerOptions` nach `"noEmit": true` ergänzen: `"resolveJsonModule": true`.

`src/mietstufen/daten.ts`:

```ts
import rohdaten from "../../data/mietstufen-2023.json";
import { MIETSTUFEN } from "../rechtsstand/typen";
import type { Mietstufe } from "../rechtsstand/typen";
import { erzeugeSuche } from "./suche";
import { HERKUENFTE, type GemeindeZeile, type Herkunft, type MietstufenDaten, type SuchEingabe, type SuchErgebnis } from "./typen";

const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

// Prüft die eingecheckte Datei beim ersten Zugriff. Eine kaputte Datei soll laut scheitern,
// nicht still falsche Stufen liefern.
export function pruefeMietstufenDaten(roh: unknown): MietstufenDaten {
  if (!istObjekt(roh) || !istObjekt(roh.meta) || !istObjekt(roh.laender) || !istObjekt(roh.kreise) || !Array.isArray(roh.gemeinden)) {
    throw new Error("Mietstufen-Daten: Aufbau stimmt nicht (meta, laender, kreise, gemeinden)");
  }
  const laender = roh.laender as Record<string, string>;
  const kreise = roh.kreise as Record<string, string>;
  const gemeinden: GemeindeZeile[] = [];
  const gesehen = new Set<string>();
  for (const zeile of roh.gemeinden as unknown[]) {
    if (!Array.isArray(zeile) || zeile.length !== 4) throw new Error(`Mietstufen-Daten: Zeile ${JSON.stringify(zeile)} hat nicht vier Felder`);
    const [ags, name, stufe, herkunft] = zeile as unknown[];
    if (typeof ags !== "string" || !/^\d{8}$/.test(ags)) throw new Error(`Mietstufen-Daten: AGS ${String(ags)} ungültig`);
    if (gesehen.has(ags)) throw new Error(`Mietstufen-Daten: AGS ${ags} doppelt`);
    gesehen.add(ags);
    if (typeof name !== "string" || name === "") throw new Error(`Mietstufen-Daten: Name bei ${ags} fehlt`);
    if (typeof stufe !== "number" || !MIETSTUFEN.includes(stufe as Mietstufe)) throw new Error(`Mietstufen-Daten: Stufe ${String(stufe)} bei ${ags} ungültig`);
    if (typeof herkunft !== "string" || !HERKUENFTE.includes(herkunft as Herkunft)) throw new Error(`Mietstufen-Daten: Herkunft ${String(herkunft)} bei ${ags} ungültig`);
    if (laender[ags.slice(0, 2)] === undefined) throw new Error(`Mietstufen-Daten: Land ${ags.slice(0, 2)} bei ${ags} unbekannt`);
    if (kreise[ags.slice(0, 5)] === undefined) throw new Error(`Mietstufen-Daten: Kreis ${ags.slice(0, 5)} bei ${ags} unbekannt`);
    gemeinden.push([ags, name, stufe as Mietstufe, herkunft as Herkunft]);
  }
  return { meta: roh.meta as unknown as MietstufenDaten["meta"], laender, kreise, gemeinden };
}

export const MIETSTUFEN_DATEN: MietstufenDaten = pruefeMietstufenDaten(rohdaten);

let suche: ((eingabe: SuchEingabe) => SuchErgebnis) | undefined;

// Ortssuche über die eingecheckten Daten (Spec 3.3 und 4 `mietstufe_finden`).
export function sucheMietstufe(eingabe: SuchEingabe): SuchErgebnis {
  suche ??= erzeugeSuche(MIETSTUFEN_DATEN);
  return suche(eingabe);
}
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run && npx tsc --noEmit; echo "exit=$?"`
Expected: `304 passed` (37 in `mietstufen.test.ts`, 6 in `node-frei.test.ts`), `exit=0`. Zeigt der Test „Neustadt“ eine andere Kandidatenzahl als 5, hat sich der Bestand geändert (nicht die Sollwerte anpassen, sondern die Ursache suchen).

- [ ] **Step 5: Workers-Tauglichkeit prüfen**

Run:
```bash
node_modules/.bin/esbuild src/mietstufen/daten.ts --bundle --platform=neutral --format=esm --outfile=/tmp/mietstufen-bundle.mjs --log-level=warning
ls -la /tmp/mietstufen-bundle.mjs
grep -c "node:" /tmp/mietstufen-bundle.mjs
node --input-type=module -e 'const m = await import("/tmp/mietstufen-bundle.mjs"); console.log(JSON.stringify(m.sucheMietstufe({ gemeinde: "Pellworm" })));'
rm /tmp/mietstufen-bundle.mjs
```
Expected: Bundle rund 478 KB (unminifiziert), `0` Treffer für `node:`, Ausgabe `{"status":"eindeutig","treffer":{"gemeinde":"Pellworm","kreis":"Nordfriesland","land":"Schleswig-Holstein","mietstufe":5,"quelle":"WoGV-Anlage, Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG)"}}`. (`wrangler` bündelt in E4 ebenfalls mit esbuild.)

- [ ] **Step 6: Commit**

```bash
git add src/mietstufen tsconfig.json test/mietstufen
git commit -m "E3: Mietstufen-Daten laden und prüfen, Test 6 (Beispielorte, Kreis, Inseln, Mehrdeutigkeit), Node-frei-Wächter"
```

---

### Task 10: Gegentests, README, Spec-Notiz, Abschluss

**Files:**
- Modify: `scripts/gegentest.mjs` (24 Mutationen)
- Modify: `README.md` (Abschnitte „Mietstufen“, „Quellen“, „Lizenz“)
- Modify: `docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md` (letzter Punkt in Abschnitt 8)

**Interfaces:**
- Consumes: alle Bausteine aus Task 1 bis 9
- Produces: `npm run gegentest` mit 62 Mutationen

- [ ] **Step 1: Mutationen eintragen**

In `scripts/gegentest.mjs` vor der schließenden `];` der Liste `MUTATIONEN` (nach dem Eintrag „Anteil-Schritt fehlt“) einfügen:

```js
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
  { name: "Kandidatenliste unbegrenzt", datei: "src/mietstufen/suche.ts", alt: "MAX_KANDIDATEN = 25", neu: "MAX_KANDIDATEN = 500" },
  { name: "Tippfehler-Abstand 2 auf 0", datei: "src/mietstufen/suche.ts", alt: "ABSTAND_LANG = 2", neu: "ABSTAND_LANG = 0" },
  { name: "Annahme-Hinweis fehlt in der Quelle", datei: "src/mietstufen/suche.ts", alt: "Annahme: Gemeinde fehlt", neu: "Gemeinde fehlt" },
  { name: "Stufenprüfung der Datei aus", datei: "src/mietstufen/daten.ts", alt: "!MIETSTUFEN.includes(stufe as Mietstufe)", neu: "false" },
```

- [ ] **Step 2: Gegentests laufen lassen**

Run: `npm run gegentest; echo "exit=$?"`
Expected: Am Ende `62 rot, 0 grün von 62 Mutationen.` und `exit=0`. Die Mutationen ändern je genau eine Stelle; die Tests, die sie fangen, sind: Taufkirchen- und Pellworm-Zeile der Datei (Regenerierbarkeit, Test 6), Prüfsumme (Rohdaten-Test), Stufenzuordnung `IV`/Kopfzeile/gemeindefreie Gebiete (Anlage- und Verzeichnis-Tests), Einwohnerschwelle (zwei Mutationen: Wert, `>=` gegen `>`), Zusatzklasse, Handzuordnung, Inselstufe, Kreisfallback, Kennzeichen n (Erzeuger-Tests), Umlaut/ß/Abkürzungen/Klammerzusatz (Normalisierung), Wortanfang-Regel, Teilname, Länderkürzel, Listenlänge, Tippfehler-Abstand, Annahme-Text (Suche), Stufenprüfung (Daten laden). Bleibt eine Mutation grün, fehlt ein Test: Test ergänzen, Mutation nicht streichen. Schlägt „Stelle … nicht gefunden“ an, steht in Task 1 bis 9 der Quelltext anders als im Plan.

- [ ] **Step 3: README ergänzen**

Im Absatz „Quellen“ den Satz ersetzen durch:

```markdown
Nur öffentliche Quellen: Wohngeldgesetz, Wohngeldverordnung (mit der Anlage der Mietenstufen), Veröffentlichungen von BMWSB, Destatis (Gemeindeverzeichnis) und Bundestag. Alle Fundstellen mit Abrufdatum stehen in [`docs/quellen/`](docs/quellen/), die Rohdaten der Mietstufen mit Prüfsumme in [`data/roh/quellen.json`](data/roh/quellen.json).
```

Vor „## Quellen“ einen neuen Abschnitt einfügen:

```markdown
## Mietstufen

Die Höchstbeträge hängen von der Mietstufe (I bis VII) des Wohnorts ab. Sie steht in der Anlage zu § 1 Abs. 3 WoGV (Mietenstufen ab 1. Januar 2023, Gebietsstand 31.03.2021). Die Ortssuche in `src/mietstufen/` findet sie über den Gemeindenamen; das MCP-Tool `mietstufe_finden` folgt in E4.

- Gemeinden ab 10.000 Einwohnern stehen einzeln in der Anlage, alle anderen erhalten die Stufe ihres Kreises (Vorbemerkung der Anlage). Die 28 Gemeinden auf Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG) haben gemeinsam Stufe V, auch wenn ihr Kreis niedriger liegt.
- Die Anlage nennt nur Namen. Schlüssel und Kreise kommen aus dem Gemeindeverzeichnis; die Zuordnung läuft über das Verzeichnis 31.12.2020, gesucht wird in den Namen von 31.12.2025. Sechs Gemeinden, die im Verzeichnis 31.12.2020 fehlen (neu gebildet oder neu geschlüsselt), bekommen die Stufe ihres Kreises. Das ist eine Annahme, die Antwort sagt es.
- Ein Ortsname, der mehrfach vorkommt (Neustadt, Weimar, Eisenach), liefert eine Kandidatenliste, keinen Treffer. Teile eines Namens („Bad Homburg“) sind nur Vorschläge.
- Die Datei `data/mietstufen-2023.json` wird erzeugt: `npm run mietstufen:erzeugen`. Der Abgleich mit gesetze-im-internet.de läuft mit `npm run pruefe:mietstufen`.
```

Den Abschnitt „## Lizenz“ ersetzen durch:

```markdown
## Lizenz

Der Code steht unter der MIT-Lizenz, siehe [LICENSE](LICENSE). **Die MIT-Lizenz gilt nicht für `data/`.** Dort liegen:

- `data/roh/anlage.html` und `data/roh/wogg-12.html`: Gesetzes- und Verordnungstexte von gesetze-im-internet.de, amtliche Werke ohne urheberrechtlichen Schutz (§ 5 UrhG). Unverändert.
- `data/roh/gv-31122020.xlsx` und `data/roh/gv-31122025.xlsx`: Gemeindeverzeichnis. © Statistisches Bundesamt (Destatis) im Auftrag der Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder, GV-ISys. Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet. Unverändert.
- `data/mietstufen-2023.json`: aus beiden abgeleitet. Das Gemeindeverzeichnis ist dort nur als Berechnungsgrundlage verwendet und verändert dargestellt (Zuordnung Gemeinde, Kreis, Mietenstufe).

Abrufdatum und Prüfsumme jeder Rohdatei stehen in `data/roh/quellen.json`.
```

- [ ] **Step 4: Spec-Notiz**

In `docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md`, Abschnitt 8, den letzten Punkt `- Lizenz des Destatis-Gemeindeverzeichnisses.` ersetzen durch:

```markdown
- Lizenz des Destatis-Gemeindeverzeichnisses: geklärt in E3 (`docs/quellen/2026-10-08-recherche-lizenz-gemeindeverzeichnis.md`). Quellenangabe ist Pflicht, abgeleitete Daten sind als verändert zu kennzeichnen; die MIT-Lizenz gilt nicht für `data/`.
```

- [ ] **Step 5: Abschlusslauf**

Run:
```bash
npx vitest run && npx tsc --noEmit && npm run gegentest; echo "exit=$?"
npm run pruefe:mietstufen; echo "exit=$?"
git status --short
```
Expected: `304 passed`; kein tsc-Fehler; `62 rot, 0 grün von 62 Mutationen.`; `exit=0`; Quellenabgleich `exit=0`; `git status` zeigt nur die drei geänderten Dateien dieses Tasks.

Manuelle Gegenprobe (Spec 6): Je ein Ort in zwei, drei Stufen im BMWSB-Wohngeldrechner (`https://www.bmwsb.bund.de/wohngeldrechner`) eingeben und mit `sucheMietstufe` vergleichen, z. B. Pellworm (V), Taufkirchen bei München (II), Süderbrarup (I).

- [ ] **Step 6: Commit**

```bash
git add scripts/gegentest.mjs README.md docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md
git commit -m "E3: 24 Gegentests für Mietstufen-Daten und Ortssuche, README (Mietstufen, Datenlizenz), Spec-Notiz zur Lizenz"
```

---

## Hinweise für E4 (nicht Teil dieses Plans)

- Das Tool `mietstufe_finden` importiert `sucheMietstufe` aus `src/mietstufen/daten.ts` und gibt `SuchErgebnis` aus; `anzahl` und `aehnlich` sind Ergänzungen zur Spec-Ausgabe.
- `wohngeld_berechnen` nimmt `wohnort` (`gemeinde`, optional `kreis`, `land`) oder `mietstufe`; bei `mehrdeutig` und `nicht_gefunden` rechnet es nicht (Spec 5). Die Annahme-Zeile (`quelle` mit „Annahme“) gehört in `annahmen` der Antwort.
- Eingabelänge der Gemeinde im zod-Schema begrenzen (zum Beispiel 100 Zeichen), die Suche selbst prüft sie nicht.
- Das Skript `scripts/pruefe-mietstufen.ts` gehört in dieselbe Prüfroutine wie `pruefe:rechtsstand`, sobald es einen CI-Lauf gibt.

## Risiken und Grenzen

- **Zuordnung nicht gegen eine zweite Quelle bestätigt.** 15 Teilname-, 3 Einwohner-, 9 Handfälle (Anhang A) sind nur über Namen und Einwohnerzahl abgesichert. Eine Verwechslung zwischen zwei Orten gleicher Größe bliebe unentdeckt. Gegenmittel: Anhang A beim Review lesen; E3-Abnahme mit der manuellen Gegenprobe.
- **Neue Verordnung ab 2027.** Anlage und Handzuordnungen müssen neu geprüft werden; der Erzeuger bricht bei veralteten Handfällen und offenen Zeilen ab, statt zu raten.
- **Gesetzesseiten ändern sich.** `pruefe:mietstufen` schlägt dann an; die Prüfsummen in `quellen.json` gelten für den Stand 08.10.2026.
- **Alte Namen.** Gemeinden, die seit 2020 eingemeindet wurden (45 Schlüssel), sind in der Suche „nicht gefunden“.
- **Eingabelänge und Last** sind in E4 zu begrenzen; die Suche ist unabhängig davon schnell (erster Aufruf 63 ms, Tippfehlersuche 16 ms).

## Anhang A: Zuordnungen, die nicht der erste Namensvergleich lieferte

Verzeichnis 31.12.2020, Einwohner 31.12.2020. Kreise unten.

| Verfahren | Land | Name in der Anlage | Name im Verzeichnis | AGS | Einwohner |
|---|---|---|---|---|---:|
| einwohner | Baden-Württemberg | Malsch | Malsch | 08215046 | 14558 |
| einwohner | Bayern | Eching | Eching | 09178120 | 14039 |
| einwohner | Bayern | Taufkirchen | Taufkirchen | 09184145 | 17954 |
| hand | Baden-Württemberg | Phillipsburg, Stadt | Philippsburg, Stadt | 08215066 | 13723 |
| hand | Baden-Württemberg | Weingarten, Baden | Weingarten (Baden) | 08215090 | 10406 |
| hand | Hessen | Arolsen, Stadt | Bad Arolsen, Stadt | 06635002 | 15571 |
| hand | Hessen | Höchst i. Odenwald | Höchst i. Odw. | 06437009 | 10209 |
| hand | Niedersachsen | Hude (Oldenburg) | Hude (Oldb) | 03458010 | 16052 |
| hand | Sachsen | Reichenbach/Vogtl., Stadt | Reichenbach im Vogtland, Stadt | 14523340 | 20198 |
| teilname | Bayern | Alzenau i. Ufr., Stadt | Alzenau, St | 09671111 | 18525 |
| teilname | Brandenburg | Ahrensfelde-Blumberg | Ahrensfelde | 12060005 | 13959 |
| teilname | Brandenburg | Cottbus, Stadt | Cottbus/Chóśebuz, Stadt | 12052000 | 98693 |
| teilname | Brandenburg | Forst (Lausitz), Stadt | Forst (Lausitz)/Baršć (Łužyca), Stadt | 12071076 | 17691 |
| teilname | Brandenburg | Senftenberg, Stadt | Senftenberg/Zły Komorow, Stadt | 12066304 | 23371 |
| teilname | Brandenburg | Spremberg, Stadt | Spremberg/Grodk, Stadt | 12071372 | 21749 |
| teilname | Hessen | Heppenheim (Bergstr.), Stadt | Heppenheim (Bergstraße), Kreisstadt | 06431011 | 26218 |
| teilname | Hessen | Münster | Münster (Hessen) | 06432015 | 14450 |
| teilname | Hessen | Neustadt | Neustadt (Hessen), Stadt | 06534016 | 9947 |
| teilname | Hessen | Rüsselsheim, Stadt | Rüsselsheim am Main, Stadt | 06433012 | 65972 |
| teilname | Nordrhein-Westfalen | Gronau (Westfalen), Stadt | Gronau (Westf.), Stadt | 05554020 | 48576 |
| teilname | Nordrhein-Westfalen | Halle (Westfalen), Stadt | Halle (Westf.), Stadt | 05754012 | 21448 |
| teilname | Rheinland-Pfalz | Neustadt (a. d. Weinstr.), Stadt | Neustadt an der Weinstraße, Stadt | 07316000 | 53306 |
| teilname | Sachsen | Oelsnitz/Vogtland, Stadt | Oelsnitz/Vogtl., Stadt | 14523300 | 10045 |
| teilname | Thüringen | Bad Frankenhausen/Kyff | Bad Frankenhausen/Kyffhäuser, Stadt | 16065003 | 10019 |
| kreis-abkuerzung | Bayern | Landsberg a. Lech | Landsberg am Lech | 09181 | - |
| kreis-abkuerzung | Bayern | Neumarkt i. d. Oberpfalz | Neumarkt i.d.OPf. | 09373 | - |
| kreis-hand | Bayern | Neustadt/Aisch-Bad Windsheim | Neustadt a.d.Aisch-Bad Windsheim | 09575 | - |
| kreis-abkuerzung | Bayern | Wunsiedel im Fichtelgebirge | Wunsiedel i.Fichtelgebirge | 09479 | - |
| kreis-hand | Niedersachsen | Soltau-Fallingbostel (Heidekreis) | Heidekreis | 03358 | - |
| kreis-hand | Rheinland-Pfalz | Bitburg-Prüm | Eifelkreis Bitburg-Prüm | 07232 | - |
