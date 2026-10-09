# E4: Tools, Metadaten und Deploy – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der MCP-Server bietet die beiden Tools `mietstufe_finden` und `wohngeld_berechnen` mit zweisprachigen Metadaten an, ist auf workers.dev deployt und lässt sich in ChatGPT im Gespräch benutzen.

**Architecture:** Der Server übersetzt nur: Zod-Schema (snake_case, wie in der Spec) → Engine-Eingabe (camelCase) → Engine bzw. Ortssuche → flaches Ausgabeobjekt. Fachlogik bleibt in `src/engine/` und `src/mietstufen/`. Jedes Tool liegt in einer eigenen Datei unter `src/server/`, gemeinsame Schemas in `src/server/gemeinsam.ts`.

**Tech Stack:** TypeScript 5.9, `@modelcontextprotocol/server` 2.3 (`McpServer`, `createMcpHandler`), Zod 4, Vitest 5, Wrangler 4, Cloudflare Workers (Free).

**Spec:** `docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md` (Abschnitte 3.4, 4, 5, 6 Nr. 7 und 8, 7 Zeile E4). Dazu der E3-Handoff `handoffs/2026-10-09-e3-fertig-handoff.md` im Haupt-Repo, Abschnitt „Für E4“.

**Arbeitsort:** Worktree `~/Developer/worktrees/wohngeld-rechner-e4`, Branch `bau/e4` auf `bau/e3` (ab6f22e). Nicht pushen, nicht mergen.

## Global Constraints

- Alle Tools tragen `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false` als explizite Booleans (Spec 3.4).
- Jede Antwort von `wohngeld_berechnen` enthält den Hinweis „Unverbindliche Schätzung. Über den Anspruch entscheidet die Wohngeldbehörde.“ (Spec 4), auch bei mehrdeutigem oder unbekanntem Wohnort.
- Beschreibungen: englischer Satz nach dem Muster „Use this when …“, dazu deutsche Stichworte (Wohngeld, Wohngeldrechner, Mietzuschuss, Lastenzuschuss, Mietstufe, Wohngeld Plus) und Ausschlussfälle (z. B. nicht für Bürgergeld-Berechnung). Jeder Parameter mit Beispielwerten (Spec 4, Metadaten).
- Kein „kostenlos“ und kein „amtlich“ in Tool-Texten (Spec 1 und 4).
- Keine Speicherung und kein Logging von Eingaben: kein `console.*` in `src/`, `observability` in `wrangler.jsonc` bleibt `false` (Spec 1).
- `src/` bleibt Node-frei (keine `node:`-Importe), damit der Code auf Workers läuft (Spec 3).
- Der Server enthält keine Fachlogik (Spec 3.4).
- Bezeichner, Kommentare und Testnamen auf Deutsch wie im bestehenden Code.
- Prüfbefehle: `npx vitest run`, `npx tsc --noEmit`. `npm run gegentest` dauert über 300 s und läuft im Hintergrund.
- Commit-Trailer laut Session-Vorgabe des Controllers.

## Rulings dieses Plans (Abweichungen und Präzisierungen gegenüber der Spec)

1. `rechner_status` (Durchstich-Tool aus E0) entfällt. Die Spec kennt nur zwei Tools. Die E4-Abnahme in ChatGPT ersetzt die E0-Abnahme, falls diese bis zum Deploy nicht erfolgt ist.
2. Ausgaben sind flache Objekte mit `status`. Das MCP-`outputSchema` muss ein Objekt sein, und das SDK prüft mit `additionalProperties: false`. `wohngeld_berechnen` bekommt deshalb `status: "berechnet" | "wohnort_mehrdeutig" | "wohnort_nicht_gefunden"` und gibt zusätzlich `stichtag` und bei Ortssuche `wohnort` (den Treffer) zurück.
3. Entweder `wohnort` oder `mietstufe`, nicht beides und nicht keins. Sonst Fehler mit Feldname `wohnort`.
4. `mietstufe_finden` gibt bei „mehrdeutig“ zusätzlich `gemeinsame_mietstufe` aus, wenn alle Kandidaten dieselbe Stufe haben **und** die Liste vollständig ist (`kandidaten.length === anzahl`). Grund: die sechs Gemeinden, die auch mit Name, Land und Kreis nicht eindeutig sind (Garding u. a.), haben paarweise dieselbe Stufe. `wohngeld_berechnen` rechnet bei Mehrdeutigkeit trotzdem nicht (Spec 4); das Sprachmodell kann die Stufe dann direkt übergeben.
5. Standard-Stichtag ist „heute“ in Europe/Berlin, nicht in UTC.
6. Fehlermeldungen der Engine nennen Felder in camelCase. Der Server übersetzt sie in die snake_case-Namen des Tool-Schemas. Ein fehlender Rechtsstand wird zu „Rechtsstand noch nicht verfügbar. …“ (Spec 5).
7. Eingabelängen: `gemeinde` und `kreis` höchstens 100 Zeichen, `land` höchstens 60, `mitglieder` höchstens 30, `einnahmen` je Mitglied höchstens 20, `unterhalt_gezahlt` höchstens 30. Grund: Workers Free hat 10 ms CPU, 2.000 Zeichen kosteten in der Ähnlichkeitssuche rund 1 s.
8. Verzeichnistexte (englisch, deutsch unter `translations`) gehören zur Einreichung (Spec 7, „Später“) und sind nicht Teil von E4.
9. README auf Deutsch mit kurzem englischem Absatz am Anfang (Portfolio, öffentliches Repo).
10. Korrektur aus E3 (gefunden bei der Planprüfung am 09.10.2026): „Neustadt“ lieferte nur die fünf Orte mit Klammer- oder Schrägstrichzusatz, alle Stufe I. Neustadt an der Weinstraße (III), an der Aisch (II), an der Donau (II) usw. fehlten. Ursache: Orte, die nur über den Zusatz treffen, wurden nur bei **genau einem** solchen Treffer um die Gemeinden mit passendem Wortanfang ergänzt (`liste.length === 1`). Die Regel gilt jetzt ab einem Treffer. So verlangen es Spec 3.3 („Kurzname … liefert die Kandidatenliste“) und die am 09.10. bestätigte Entscheidung C-2. Der bestehende Test „Neustadt hat fünf Gemeinden“ wird bewusst geändert. Die Korrektur verlängert nur Listen, die schon mehrdeutig sind; ein eindeutiger Treffer kann dadurch nicht entstehen. Probelauf: 319/320 grün, rot nur der genannte Test.

## Gemessenes SDK-Verhalten (Probe vom 09.10.2026, SDK 2.3)

- Ungültige Eingabe → `result.isError: true`, Text `Input validation error: Invalid arguments for tool <name>: <feld>: <meldung>`. Kein JSON-RPC-Fehler.
- Im Handler geworfener `Error` → `result.isError: true`, Text = `error.message`.
- `structuredContent` wird gegen `outputSchema` geprüft. Ein unbekannter Schlüssel oder ein falscher Wert → `isError: true`, Text `Output validation error: …`. Deshalb nie Felder ausgeben, die nicht im Schema stehen.
- `.describe("…")` erscheint als `description` im JSON-Schema von `tools/list`.

## Review Focus

0. Kurzname, zu dem es mehrere Orte mit Zusatz gibt („Neustadt“): Die Kandidatenliste enthält auch die Städte, deren Name mit dem Kurznamen beginnt. Sonst meldet `mietstufe_finden` „gemeinsame Stufe I“ für fünf Dörfer, obwohl Neustadt an der Weinstraße Stufe III hat (Test in Task 1).
1. Gemeinde nur aus Leerzeichen oder leer: Erwartet wird ein Schemafehler mit Feldname `gemeinde`, nicht „nicht_gefunden“ (Test in Task 2).
2. Gekürzte Kandidatenliste (mehr als 25 Treffer): Dann darf keine gemeinsame Stufe behauptet werden, auch wenn alle 25 gezeigten Kandidaten gleich sind (Test in Task 2).
3. Aufruf kurz nach Mitternacht am Jahreswechsel: Der Standard-Stichtag ist das Berliner Datum, sonst rechnet das Tool am 1.1. um 00:30 mit dem Vorjahr (Test in Task 3).
4. Falsch belegtes Einnahmefeld: Die Fehlermeldung nennt das Feld so, wie es im Tool heißt (`werbungskosten_monatlich`), nicht `werbungskostenMonatlich` (Test in Task 3).
5. Sehr lange Ortsnamen: Sie werden am Schema abgewiesen, und die Ähnlichkeitssuche überspringt Namen mit zu großem Längenunterschied (Tests in Task 1 und 2).

---

## Dateiübersicht

| Datei | Aufgabe |
|---|---|
| `src/mietstufen/suche.ts` | Landaliase, Längenvorfilter (Task 1) |
| `src/mietstufen/daten.ts` | Suchindex beim Laden des Moduls (Task 1) |
| `src/server/gemeinsam.ts` | neu: `NUR_LESEND`, Ort- und Trefferschemas, `antwort()` (Task 2) |
| `src/server/mietstufe-finden.ts` | neu: Tool `mietstufe_finden` (Task 2) |
| `src/server/wohngeld-berechnen.ts` | neu: Tool `wohngeld_berechnen` (Task 3) |
| `src/server/server.ts` | registriert beide Tools, Version 0.2.0 (Task 2, 3) |
| `test/server/*.test.ts` | Protokolltests (Task 2, 3, 4) |
| `test/golden-prompts.md` | neu: 5 positive, 3 negative Fälle (Task 4) |
| `scripts/pruefe-bundle.mjs` | neu: Bundle-Prüfung (Task 5) |
| `scripts/gegentest.mjs` | neue Mutationen (Task 5) |
| `scripts/pruefe-deploy.ts` | neu: Live-Prüfung nach dem Deploy (Task 6) |
| `README.md` | neu (Task 6) |

---

### Task 1: Ortssuche härten (Neustadt-Korrektur, Landaliase, Längenvorfilter, Index beim Laden)

**Files:**
- Modify: `src/mietstufen/suche.ts:13-16` (KUERZEL), `:77-81` (Landfilter), `:116-119` (Wortanfang-Ergänzung), `:146-148` (Ähnlichkeit)
- Modify: `src/mietstufen/daten.ts:36-44`
- Test: `test/mietstufen/suche.test.ts`, `test/mietstufen/mietstufen.test.ts:85-97`

**Interfaces:**
- Consumes: `sucheMietstufe(eingabe: SuchEingabe): SuchErgebnis` aus `src/mietstufen/daten.ts` (unverändert).
- Produces: dieselbe Signatur; neu erkannt werden die Landangaben „NRW“, „BaWü“ und Langformen mit „Freistaat“, „Freie Hansestadt“, „Freie und Hansestadt“, „Land“.

- [ ] **Step 1: Failing Tests schreiben**

In `test/mietstufen/mietstufen.test.ts` den Test „„Neustadt“ hat fünf Gemeinden gleichen Namens mit Klammer- oder Schrägstrichzusatz“ (Zeilen 85 bis 97) vollständig ersetzen durch:

```ts
  it("„Neustadt“: die Orte mit Zusatz und die Städte, deren Name mit Neustadt beginnt (Ruling 10 im E4-Plan)", () => {
    const e = sucheMietstufe({ gemeinde: "Neustadt" });
    expect(e.status).toBe("mehrdeutig");
    expect(e.status === "mehrdeutig" ? e.anzahl : 0).toBe(17);
    const namen = kandidaten(e).map((k) => k.gemeinde);
    expect(namen).toContain("Neustadt (Dosse), Stadt");
    expect(namen).toContain("Neustadt an der Weinstraße, Stadt");
    expect(namen).toContain("Neustadt a.d.Aisch, St");
    expect(new Set(kandidaten(e).map((k) => k.mietstufe)).size).toBeGreaterThan(1);
    expect(kandidaten(sucheMietstufe({ gemeinde: "Neustadt", land: "Rheinland-Pfalz" })).map((k) => k.gemeinde)).toEqual([
      "Neustadt (Wied)",
      "Neustadt an der Weinstraße, Stadt",
      "Neustadt/ Westerwald",
    ]);
    expect(eindeutig(sucheMietstufe({ gemeinde: "Neustadt", land: "Hessen" })).gemeinde).toBe("Neustadt (Hessen), Stadt");
  });
```

Die Zahl 17 und die Namen stammen aus dem Probelauf vom 09.10.2026 gegen `data/mietstufen-2023.json`. Ist die Hessen-Zeile nach der Korrektur rot, weil es in Hessen eine weitere Gemeinde gibt, deren Name mit „Neustadt“ beginnt, die Erwartung auf „mehrdeutig“ ändern und die Kandidaten im Bericht nennen.

Dann am Ende von `test/mietstufen/suche.test.ts` anfügen (Import von `sucheMietstufe` aus `../../src/mietstufen/daten` ergänzen, falls nicht vorhanden):

```ts
describe("Landangabe in Kurz- und Langform (E4)", () => {
  it("„NRW“ trennt Monheim am Rhein von Monheim in Bayern", () => {
    const e = sucheMietstufe({ gemeinde: "Monheim", land: "NRW" });
    expect(e.status).toBe("eindeutig");
    if (e.status === "eindeutig") {
      expect(e.treffer.gemeinde).toBe("Monheim am Rhein, Stadt");
      expect(e.treffer.mietstufe).toBe(6);
    }
  });

  it("„BaWü“ trennt Esslingen am Neckar vom Eifeldorf", () => {
    const e = sucheMietstufe({ gemeinde: "Esslingen", land: "BaWü" });
    expect(e.status).toBe("eindeutig");
    if (e.status === "eindeutig") expect(e.treffer.land).toBe("Baden-Württemberg");
  });

  it.each([
    ["Bremen", "Freie Hansestadt Bremen", "Bremen"],
    ["Hamburg", "Freie und Hansestadt Hamburg", "Hamburg"],
    ["Berlin", "Land Berlin", "Berlin"],
    ["Dresden", "Freistaat Sachsen", "Sachsen"],
  ])("%s mit Landangabe „%s“", (gemeinde, land, erwartetesLand) => {
    const e = sucheMietstufe({ gemeinde, land });
    expect(e.status).toBe("eindeutig");
    if (e.status === "eindeutig") expect(e.treffer.land).toBe(erwartetesLand);
  });
});

describe("Laufzeit bei langen Eingaben (E4)", () => {
  it("2.000 Zeichen dauern keine 200 ms", () => {
    sucheMietstufe({ gemeinde: "Aachen" }); // Index aufbauen, nicht mitmessen
    const start = performance.now();
    const e = sucheMietstufe({ gemeinde: "x".repeat(2000) });
    expect(e.status).toBe("nicht_gefunden");
    expect(performance.now() - start).toBeLessThan(200);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Rot prüfen**

Run: `npx vitest run test/mietstufen/suche.test.ts`
Run: `npx vitest run test/mietstufen/mietstufen.test.ts -t Neustadt`
Expected: FAIL mit `expected 5 to be 17`.

Expected für `suche.test.ts`: Die vier Langform- und die zwei Kürzel-Tests schlagen mit `expected 'nicht_gefunden' to be 'eindeutig'` fehl. „Freistaat Sachsen“ darf schon grün sein (Präfix wird heute bereits entfernt). Der Laufzeittest schlägt mit rund 1.000 ms fehl. Falls ein Test aus einem anderen Grund rot ist (z. B. Name in den Daten anders geschrieben), Namen in `data/mietstufen-2023.json` nachsehen und die Erwartung an die Daten anpassen, nicht an den Code.

- [ ] **Step 3: Landfilter erweitern**

In `src/mietstufen/suche.ts` die Kürzeltabelle ergänzen und eine Präfixregel einführen:

```ts
const KUERZEL: Readonly<Record<string, string>> = {
  sh: "01", hh: "02", ni: "03", hb: "04", nw: "05", he: "06", rp: "07", bw: "08",
  by: "09", sl: "10", be: "11", bb: "12", mv: "13", sn: "14", st: "15", th: "16",
  nrw: "05", bawue: "08",
};

// Amtliche Langformen („Freie Hansestadt Bremen“, „Freistaat Bayern“, „Land Berlin“) auf den Ländernamen kürzen.
const LAND_VORSATZ = /^(freistaat|freie und hansestadt|freie hansestadt|land) /;
```

und im Landfilter `filtere` die Zeile

```ts
      const l = normalisiere(eingabe.land).replace(/^freistaat /, "");
```

ersetzen durch

```ts
      const l = normalisiere(eingabe.land).replace(LAND_VORSATZ, "");
```

- [ ] **Step 3b: Wortanfang-Ergänzung ab einem Treffer**

In `src/mietstufen/suche.ts`

```ts
    if (liste.length === 1 && !hatStarkenTreffer) {
      const einziger = liste[0];
      liste = [...liste, ...filtere(eintraege.filter((e) => e !== einziger && wortAnfang(e)), eingabe)];
    }
```

ersetzen durch

```ts
    if (liste.length >= 1 && !hatStarkenTreffer) {
      const schon = new Set(liste);
      liste = [...liste, ...filtere(eintraege.filter((e) => !schon.has(e) && wortAnfang(e)), eingabe)];
    }
```

Den Kommentar darüber anpassen: „Nur über den Klammerzusatz oder Schrägstrich gefunden („Frankfurt“ -> Frankfurt (Oder), „Neustadt“ -> Neustadt (Dosse) u. a.): Gemeinden, deren Name mit der Eingabe beginnt, gehören dazu („Frankfurt am Main“, „Neustadt an der Weinstraße“), auch ohne eigene Anlagezeile.“

- [ ] **Step 4: Längenvorfilter einbauen**

In `src/mietstufen/suche.ts` die Zeile

```ts
      .map((e): [number, Eintrag] => [Math.min(...e.stark.map((k) => abstand(q1, k))), e])
```

ersetzen durch

```ts
      // Der Längenunterschied ist eine untere Schranke des Abstands; ist er größer als die Grenze, entfällt die Rechnung.
      .map((e): [number, Eintrag] => [Math.min(...e.stark.map((k) => (Math.abs(k.length - q1.length) > grenze ? grenze + 1 : abstand(q1, k)))), e])
```

- [ ] **Step 5: Index beim Laden des Moduls bauen**

In `src/mietstufen/daten.ts` den verzögerten Aufbau

```ts
let suche: ((eingabe: SuchEingabe) => SuchErgebnis) | undefined;

// Ortssuche über die eingecheckten Daten (Spec 3.3 und 4 `mietstufe_finden`).
export function sucheMietstufe(eingabe: SuchEingabe): SuchErgebnis {
  suche ??= erzeugeSuche(MIETSTUFEN_DATEN);
  return suche(eingabe);
}
```

ersetzen durch

```ts
// Beim Laden gebaut: Auf Workers zählt das zur Startzeit des Isolats (Grenze 1 s), nicht zur CPU-Zeit
// des ersten Requests (Free: 10 ms).
const suche = erzeugeSuche(MIETSTUFEN_DATEN);

// Ortssuche über die eingecheckten Daten (Spec 3.3 und 4 `mietstufe_finden`).
export function sucheMietstufe(eingabe: SuchEingabe): SuchErgebnis {
  return suche(eingabe);
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle Tests grün (320 bisherige plus die neuen), `tsc` ohne Ausgabe.

- [ ] **Step 7: Laufzeit messen und notieren**

Run:
```bash
npx tsx -e '(async () => { const t0=performance.now(); const { sucheMietstufe } = await import("./src/mietstufen/daten.ts"); const t1=performance.now(); const fall=(g)=>{const s=performance.now(); sucheMietstufe({gemeinde:g}); return (performance.now()-s).toFixed(1)}; console.log("Laden+Index", (t1-t0).toFixed(0), "ms"); for (const g of ["Esslingen","Neustadt","Neustdat","Xqzwvbnmlkjh","Gemeinde Langername Am Fluss","x".repeat(100)]) console.log(g.slice(0,30), fall(g), "ms"); })()'
```
Expected: sechs Zeilen mit Millisekunden. (`tsx -e` kann kein Top-Level-`await`, daher die async-Hülle.) Die Werte kommen in den Bericht an den Controller. Liegt ein Einzelfall über 10 ms, ist das kein Abbruchgrund, muss aber im Bericht stehen.

- [ ] **Step 8: Commit**

```bash
git add src/mietstufen/suche.ts src/mietstufen/daten.ts test/mietstufen/suche.test.ts test/mietstufen/mietstufen.test.ts
git commit -m "E4 Task 1: Neustadt-Korrektur, Landaliase, Längenvorfilter, Suchindex beim Laden"
```

---

### Task 2: Tool `mietstufe_finden` und Server-Umbau

**Files:**
- Create: `src/server/gemeinsam.ts`
- Create: `src/server/mietstufe-finden.ts`
- Modify: `src/server/server.ts` (vollständig ersetzen)
- Modify: `test/server/server.test.ts` (vollständig ersetzen)
- Create: `test/server/mietstufe-finden.test.ts`
- Modify: `package.json` (`"version": "0.2.0"`)

**Interfaces:**
- Consumes: `sucheMietstufe`, `SuchErgebnis`, `MietstufenTreffer` (Task 1, unverändert).
- Produces:
  - `src/server/gemeinsam.ts`: `NUR_LESEND`, `mietstufeSchema`, `ortFelder`, `trefferSchema`, `antwort(daten)`.
  - `src/server/mietstufe-finden.ts`: `registriereMietstufeFinden(server: McpServer): void`, `alsAusgabe(e: SuchErgebnis): MietstufeFindenAusgabe`, `gemeinsameMietstufe(e): Mietstufe | undefined`.
  - `src/server/server.ts`: `SERVER_NAME`, `SERVER_VERSION = "0.2.0"`, `erzeugeServer()`. Task 3 ergänzt dort `registriereWohngeldBerechnen(server)`.

- [ ] **Step 1: Failing Tests schreiben**

`test/server/server.test.ts` vollständig ersetzen:

```ts
import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { INITIALIZE_PARAMS, rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);

describe("MCP-Server", () => {
  it("antwortet auf initialize mit Name und Version", async () => {
    const { status, body } = await rufeMcp(fetchFn, "initialize", INITIALIZE_PARAMS);
    expect(status).toBe(200);
    expect(body.result.serverInfo).toMatchObject({ name: "wohngeld-rechner", version: "0.2.0" });
  });

  it("listet genau die Tools der Spec, alle nur lesend", async () => {
    const { body } = await rufeMcp(fetchFn, "tools/list");
    const tools = body.result.tools;
    // Task 3 erweitert diese Liste um "wohngeld_berechnen".
    expect(tools.map((t: any) => t.name).sort()).toEqual(["mietstufe_finden"]);
    for (const t of tools)
      expect(t.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, openWorldHint: false });
  });

  it("liefert 404 außerhalb von /mcp", async () => {
    const response = await worker.fetch(new Request("https://test.local/anderes"));
    expect(response.status).toBe(404);
  });
});
```

`test/server/mietstufe-finden.test.ts` anlegen:

```ts
import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { alsAusgabe } from "../../src/server/mietstufe-finden";
import type { MietstufenTreffer } from "../../src/mietstufen/typen";
import { rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);
const rufe = (args: Record<string, unknown>) => rufeMcp(fetchFn, "tools/call", { name: "mietstufe_finden", arguments: args });

describe("Tool mietstufe_finden", () => {
  it("findet Esslingen am Neckar eindeutig", async () => {
    const { body } = await rufe({ gemeinde: "Esslingen am Neckar" });
    expect(body.result.isError).toBeFalsy();
    expect(body.result.structuredContent.status).toBe("eindeutig");
    expect(body.result.structuredContent.treffer).toMatchObject({ land: "Baden-Württemberg", mietstufe: 5 });
    expect(JSON.parse(body.result.content[0].text)).toEqual(body.result.structuredContent);
  });

  it("„Neustadt“ ist mehrdeutig, ohne gemeinsame Stufe", async () => {
    const { body } = await rufe({ gemeinde: "Neustadt" });
    const a = body.result.structuredContent;
    expect(a.status).toBe("mehrdeutig");
    expect(a.anzahl).toBeGreaterThan(1);
    expect(a.gemeinsame_mietstufe).toBeUndefined();
  });

  it("„Garding“ ist mehrdeutig, beide Kandidaten haben Stufe I", async () => {
    const { body } = await rufe({ gemeinde: "Garding" });
    const a = body.result.structuredContent;
    expect(a.status).toBe("mehrdeutig");
    expect(a.gemeinsame_mietstufe).toBe(1);
  });

  it("unbekannter Ort liefert nicht_gefunden mit Liste", async () => {
    const { body } = await rufe({ gemeinde: "Xqzwvbnm" });
    expect(body.result.structuredContent).toEqual({ status: "nicht_gefunden", aehnlich: [] });
  });

  it.each([
    [{ gemeinde: "" }, "gemeinde"],
    [{ gemeinde: "   " }, "gemeinde"],
    [{ gemeinde: "a".repeat(101) }, "gemeinde"],
    [{ gemeinde: "Aachen", kreis: "k".repeat(101) }, "kreis"],
    [{ gemeinde: "Aachen", land: "l".repeat(61) }, "land"],
    [{}, "gemeinde"],
  ])("Schemafehler bei %j nennt das Feld", async (args, feld) => {
    const { body } = await rufe(args);
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain(feld);
  });
});

describe("gemeinsame Stufe nur bei vollständiger Liste", () => {
  const k = (stufe: 1 | 2): MietstufenTreffer => ({ gemeinde: "G", kreis: "K", land: "L", mietstufe: stufe, quelle: "Q" });

  it("vollständige Liste mit gleicher Stufe", () => {
    expect(alsAusgabe({ status: "mehrdeutig", anzahl: 2, kandidaten: [k(1), k(1)] }).gemeinsame_mietstufe).toBe(1);
  });

  it("gekürzte Liste: keine Aussage, auch wenn alle gezeigten gleich sind", () => {
    const kandidaten = Array.from({ length: 25 }, () => k(1));
    expect(alsAusgabe({ status: "mehrdeutig", anzahl: 30, kandidaten }).gemeinsame_mietstufe).toBeUndefined();
  });

  it("verschiedene Stufen: keine Aussage", () => {
    expect(alsAusgabe({ status: "mehrdeutig", anzahl: 2, kandidaten: [k(1), k(2)] }).gemeinsame_mietstufe).toBeUndefined();
  });
});
```

Vor dem Schreiben in `data/mietstufen-2023.json` prüfen: „Esslingen am Neckar“ hat Stufe 5, „Garding, Kirchspiel“ und „Garding, Stadt“ haben Stufe 1, und `sucheMietstufe({ gemeinde: "Garding" })` ist mehrdeutig. Weicht die Datei ab, die Erwartung an die Datei anpassen.

- [ ] **Step 2: Tests laufen lassen, Rot prüfen**

Run: `npx vitest run test/server`
Expected: FAIL. `mietstufe-finden.test.ts` scheitert am Import von `../../src/server/mietstufe-finden`. Damit der Rot-Zustand echt ist (Swift-/TS-TDD: „nicht gefunden“ ist kein RED), zuerst einen Stub `src/server/mietstufe-finden.ts` mit `export function alsAusgabe(_: unknown): any { return {}; }` anlegen und erneut laufen lassen: Dann müssen die Protokolltests (Tool fehlt) und die Unit-Tests (falsche Werte) fehlschlagen, `server.test.ts` an Version und Tool-Liste.

- [ ] **Step 3: `src/server/gemeinsam.ts` anlegen**

```ts
import { z } from "zod";

// Alle Tools rechnen nur: nichts wird geschrieben, nichts außerhalb des Servers abgefragt.
export const NUR_LESEND = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export const mietstufeSchema = z.number().int().min(1).max(7);

// Längen begrenzt: Die Ähnlichkeitssuche ist quadratisch in der Länge, Workers Free hat 10 ms CPU.
export const ortFelder = {
  gemeinde: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe('Name der Gemeinde oder Stadt, ohne Postleitzahl. Beispiel: "Esslingen am Neckar", "Leipzig"'),
  kreis: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe('Kreis oder kreisfreie Stadt, nur zur Unterscheidung gleichnamiger Orte. Beispiel: "Esslingen", "Leipzig"'),
  land: z
    .string()
    .trim()
    .max(60)
    .optional()
    .describe('Bundesland als Name oder Kürzel. Beispiel: "Baden-Württemberg", "BW", "NRW"'),
};

export const trefferSchema = z.object({
  gemeinde: z.string(),
  kreis: z.string(),
  land: z.string(),
  mietstufe: mietstufeSchema,
  quelle: z.string(),
});

// Text und strukturierter Inhalt tragen dieselben Daten (Clients ohne structuredContent lesen den Text).
export function antwort<T extends Record<string, unknown>>(daten: T) {
  return { content: [{ type: "text" as const, text: JSON.stringify(daten) }], structuredContent: daten };
}
```

- [ ] **Step 4: `src/server/mietstufe-finden.ts` schreiben (Stub ersetzen)**

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { sucheMietstufe } from "../mietstufen/daten";
import type { SuchErgebnis } from "../mietstufen/typen";
import type { Mietstufe } from "../rechtsstand";
import { antwort, mietstufeSchema, NUR_LESEND, ortFelder, trefferSchema } from "./gemeinsam";

export const MIETSTUFE_FINDEN_BESCHREIBUNG =
  "Use this when the user asks for the Mietstufe (rent level I to VII) of a German municipality, " +
  "or when a place must be resolved before estimating housing benefit with wohngeld_berechnen. " +
  "Looks the place up in the annex to § 1 Abs. 3 WoGV. If the result is ambiguous, ask for Kreis or Bundesland. " +
  "Stichworte: Wohngeld, Wohngeldrechner, Wohngeld Plus, Mietstufe, Mietenstufe, Mietzuschuss, Lastenzuschuss. " +
  "Nicht für: Bürgergeld, Mietspiegel, ortsübliche Vergleichsmiete, Kosten der Unterkunft nach SGB II.";

export const mietstufeFindenEingabe = z.object(ortFelder);

export const mietstufeFindenAusgabe = z.object({
  status: z.enum(["eindeutig", "mehrdeutig", "nicht_gefunden"]),
  treffer: trefferSchema.optional(),
  anzahl: z.number().int().optional(),
  kandidaten: z.array(trefferSchema).optional(),
  gemeinsame_mietstufe: mietstufeSchema.optional(),
  aehnlich: z.array(trefferSchema).optional(),
});
export type MietstufeFindenAusgabe = z.infer<typeof mietstufeFindenAusgabe>;

type Mehrdeutig = Extract<SuchErgebnis, { status: "mehrdeutig" }>;

// Nur bei vollständiger Liste: Bei gekürzter Liste (anzahl > kandidaten) ist die Stufe der übrigen unbekannt.
export function gemeinsameMietstufe(e: Mehrdeutig): Mietstufe | undefined {
  if (e.kandidaten.length !== e.anzahl) return undefined;
  const stufen = new Set(e.kandidaten.map((k) => k.mietstufe));
  return stufen.size === 1 ? e.kandidaten[0]?.mietstufe : undefined;
}

export function alsAusgabe(e: SuchErgebnis): MietstufeFindenAusgabe {
  switch (e.status) {
    case "eindeutig":
      return { status: e.status, treffer: e.treffer };
    case "mehrdeutig": {
      const gemeinsam = gemeinsameMietstufe(e);
      return { status: e.status, anzahl: e.anzahl, kandidaten: e.kandidaten, ...(gemeinsam ? { gemeinsame_mietstufe: gemeinsam } : {}) };
    }
    case "nicht_gefunden":
      return { status: e.status, aehnlich: e.aehnlich };
  }
}

export function registriereMietstufeFinden(server: McpServer): void {
  server.registerTool(
    "mietstufe_finden",
    {
      title: "Mietstufe nach Ort finden",
      description: MIETSTUFE_FINDEN_BESCHREIBUNG,
      inputSchema: mietstufeFindenEingabe,
      outputSchema: mietstufeFindenAusgabe,
      annotations: NUR_LESEND,
    },
    async (eingabe) => antwort(alsAusgabe(sucheMietstufe(eingabe))),
  );
}
```

- [ ] **Step 5: `src/server/server.ts` ersetzen**

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { registriereMietstufeFinden } from "./mietstufe-finden";

export const SERVER_NAME = "wohngeld-rechner";
export const SERVER_VERSION = "0.2.0";

// Pro Request ein frischer Server (zustandslos).
export function erzeugeServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registriereMietstufeFinden(server);
  return server;
}
```

In `package.json` `"version": "0.1.0"` auf `"version": "0.2.0"` setzen. Mit `grep -rn "NUR_LESEND\|rechner_status" src test scripts` prüfen, dass keine Stelle mehr auf das alte Tool oder den alten Ort von `NUR_LESEND` zeigt.

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alles grün, `tsc` leer. Schlägt ein Aufruf mit `Output validation error` fehl, gibt `alsAusgabe` ein Feld aus, das nicht im Schema steht.

- [ ] **Step 7: Commit**

```bash
git add src/server test/server package.json
git commit -m "E4 Task 2: Tool mietstufe_finden, rechner_status entfernt, Version 0.2.0"
```

---

### Task 3: Tool `wohngeld_berechnen`

**Files:**
- Create: `src/server/wohngeld-berechnen.ts`
- Modify: `src/server/server.ts` (Registrierung ergänzen)
- Modify: `test/server/server.test.ts` (Tool-Liste)
- Create: `test/server/wohngeld-berechnen.test.ts`

**Interfaces:**
- Consumes: `ortFelder`, `trefferSchema`, `mietstufeSchema`, `antwort`, `NUR_LESEND` (Task 2); `sucheMietstufe` (Task 1); `berechneWohngeld(e: HaushaltEingabe): Berechnung`, `HINWEIS_UNVERBINDLICH` aus `src/engine/berechnen.ts`; `EingabeFehler` aus `src/engine/rechenweg.ts`; `RechtsstandFehlt`, `UNTERHALT_ARTEN`, `Mietstufe` aus `src/rechtsstand`; `EINNAHME_ARTEN`, `AUSSCHLUSS_LEISTUNGEN`, `HaushaltEingabe` aus `src/engine/eingabe.ts`.
- Produces: `registriereWohngeldBerechnen(server)`, `berechne(a: BerechnenEingabe, jetzt?: Date): BerechnenAusgabe`, `heuteInBerlin(jetzt: Date): string`, `feldImTool(feld: string): string`.

- [ ] **Step 1: Feldpfade der Engine erheben**

Run: `grep -rn "EingabeFehler(" src/engine | grep -o 'EingabeFehler([^,]*' | sort -u`
Expected: Liste der Feldpfade, die die Engine meldet (z. B. `` `mitglieder[${i}].einnahmen[${j}].werbungskostenMonatlich` ``). Jeder camelCase-Bestandteil daraus muss in `FELDNAMEN` (Step 4) stehen. Ein Bestandteil ohne Eintrag ist ein Befund für den Bericht.

- [ ] **Step 2: Failing Tests schreiben**

In `test/server/server.test.ts` die Erwartung der Tool-Liste ändern:

```ts
    expect(tools.map((t: any) => t.name).sort()).toEqual(["mietstufe_finden", "wohngeld_berechnen"]);
```

(den Kommentar „Task 3 erweitert …“ löschen).

`test/server/wohngeld-berechnen.test.ts` anlegen:

```ts
import { describe, expect, it } from "vitest";
import { HINWEIS_UNVERBINDLICH } from "../../src/engine/berechnen";
import worker from "../../src/server/index";
import { feldImTool, heuteInBerlin } from "../../src/server/wohngeld-berechnen";
import { rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);
const rufe = (args: Record<string, unknown>) => rufeMcp(fetchFn, "tools/call", { name: "wohngeld_berechnen", arguments: args });
const ohne = { zahlt_steuern: false, zahlt_kv_pv: false, zahlt_rv: false };

// BMWSB-Rechenbeispiel 1 (Stand 01.01.2025), wie test/fixtures/bmwsb-2025-eingaben.ts Nr. 1
const BEISPIEL_1 = {
  stichtag: "2025-07-01",
  mietstufe: 1,
  art: "mietzuschuss",
  miete_monatlich: 335,
  mitglieder: [{ einnahmen: [{ art: "rente", betrag_monatlich: 1300 }], ...ohne, zahlt_kv_pv: true }],
};

// BMWSB-Rechenbeispiel 5 (Wiesbaden), Wohnort statt Mietstufe
const BEISPIEL_5 = {
  stichtag: "2025-07-01",
  wohnort: { gemeinde: "Wiesbaden" },
  art: "mietzuschuss",
  miete_monatlich: 700,
  alleinerziehend: true,
  mitglieder: [
    { einnahmen: [{ art: "nichtselbstaendig", betrag_monatlich: 1530 }], ...ohne, zahlt_kv_pv: true, zahlt_rv: true },
    { einnahmen: [{ art: "unterhaltsvorschuss", betrag_monatlich: 696 }], ...ohne },
    { einnahmen: [], ...ohne },
  ],
};

describe("Tool wohngeld_berechnen", () => {
  it("rechnet Beispiel 1 mit direkter Mietstufe", async () => {
    const { body } = await rufe(BEISPIEL_1);
    expect(body.result.isError).toBeFalsy();
    const a = body.result.structuredContent;
    expect(a).toMatchObject({ status: "berechnet", wohngeld_monatlich: 110, mietstufe: 1, y: "1162.35", m: "445.40", stichtag: "2025-07-01" });
    expect(a.hinweise).toContain(HINWEIS_UNVERBINDLICH);
    expect(a.wohnort).toBeUndefined();
  });

  it("rechnet Beispiel 5 über den Wohnort Wiesbaden", async () => {
    const { body } = await rufe(BEISPIEL_5);
    const a = body.result.structuredContent;
    expect(a).toMatchObject({ status: "berechnet", wohngeld_monatlich: 372, mietstufe: 6, y: "1728.00", m: "870.20" });
    expect(a.wohnort.gemeinde).toContain("Wiesbaden");
    expect(a.rechenweg.length).toBeGreaterThan(3);
  });

  it("mehrdeutiger Wohnort: keine Rechnung, Kandidaten und Hinweis", async () => {
    const { body } = await rufe({ ...BEISPIEL_5, wohnort: { gemeinde: "Neustadt" } });
    const a = body.result.structuredContent;
    expect(a.status).toBe("wohnort_mehrdeutig");
    expect(a.wohngeld_monatlich).toBeUndefined();
    expect(a.kandidaten.length).toBeGreaterThan(1);
    expect(a.hinweise).toContain(HINWEIS_UNVERBINDLICH);
  });

  it("unbekannter Wohnort: keine Rechnung, Hinweis", async () => {
    const { body } = await rufe({ ...BEISPIEL_5, wohnort: { gemeinde: "Xqzwvbnm" } });
    const a = body.result.structuredContent;
    expect(a.status).toBe("wohnort_nicht_gefunden");
    expect(a.wohngeld_monatlich).toBeUndefined();
    expect(a.hinweise).toContain(HINWEIS_UNVERBINDLICH);
  });

  it("Stichtag ohne Rechtsstand: Fehler „Rechtsstand noch nicht verfügbar“", async () => {
    const { body } = await rufe({ ...BEISPIEL_1, stichtag: "2027-01-01" });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toMatch(/^Rechtsstand noch nicht verfügbar\./);
  });

  it("ohne Stichtag gilt heute in Berlin", async () => {
    const { stichtag: _, ...ohneStichtag } = BEISPIEL_1;
    const { body } = await rufe(ohneStichtag);
    expect(body.result.structuredContent.stichtag).toBe(heuteInBerlin(new Date()));
  });

  it.each([
    [{ ...BEISPIEL_1, wohnort: { gemeinde: "Jüterbog" } }, "wohnort"],
    [{ ...BEISPIEL_1, mietstufe: undefined }, "wohnort"],
    [{ ...BEISPIEL_1, mitglieder: [] }, "mitglieder"],
    [{ ...BEISPIEL_1, miete_monatlich: -1 }, "miete_monatlich"],
    [{ ...BEISPIEL_1, stichtag: "09.10.2026" }, "stichtag"],
    [{ ...BEISPIEL_1, mietstufe: 8 }, "mietstufe"],
    [{ ...BEISPIEL_1, mitglieder: [{ einnahmen: [], zahlt_steuern: false, zahlt_kv_pv: false }] }, "zahlt_rv"],
    [{ ...BEISPIEL_1, art: "mietzuschuß" }, "art"],
  ])("Fehler nennt das Feld (%#)", async (args, feld) => {
    const { body } = await rufe(args as Record<string, unknown>);
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain(feld);
  });

  it("Fehler aus der Engine nennt das Feld im snake_case des Tools", async () => {
    const { body } = await rufe({
      ...BEISPIEL_1,
      mitglieder: [{ einnahmen: [{ art: "rente", betrag_monatlich: 1300, werbungskosten_monatlich: 10 }], ...ohne }],
    });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("werbungskosten_monatlich");
    expect(body.result.content[0].text).not.toContain("werbungskostenMonatlich");
  });
});

describe("Hilfsfunktionen", () => {
  it("heute in Berlin: Silvester 23:30 UTC ist schon Neujahr", () => {
    expect(heuteInBerlin(new Date("2025-12-31T23:30:00Z"))).toBe("2026-01-01");
  });

  it("heute in Berlin: Sommerzeit, 21:59 UTC ist noch derselbe Tag", () => {
    expect(heuteInBerlin(new Date("2026-06-30T21:59:00Z"))).toBe("2026-06-30");
  });

  it("übersetzt Feldpfade der Engine", () => {
    expect(feldImTool("mitglieder[0].einnahmen[1].werbungskostenMonatlich")).toBe("mitglieder[0].einnahmen[1].werbungskosten_monatlich");
    expect(feldImTool("mitglieder[2].kindUnter25")).toBe("mitglieder[2].kind_unter_25");
    expect(feldImTool("mieteMonatlich")).toBe("miete_monatlich");
  });
});
```

Zum Engine-Fehlertest: Vorher mit `grep -n "werbungskosten" src/engine/einkommen/jahreseinkommen.ts` prüfen, dass die Engine `werbungskostenMonatlich` bei der Art `rente` mit `EingabeFehler` ablehnt. Tut sie das nicht, ein Feld aus der Liste von Step 1 nehmen, das die Engine sicher ablehnt, und Test und Begründung im Bericht nennen.

- [ ] **Step 3: Tests laufen lassen, Rot prüfen**

Zuerst einen Stub `src/server/wohngeld-berechnen.ts` anlegen:

```ts
export const heuteInBerlin = (_: Date): string => "";
export const feldImTool = (f: string): string => f;
```

Run: `npx vitest run test/server`
Expected: FAIL. Die Protokolltests scheitern, weil das Tool fehlt (`Tool wohngeld_berechnen not found` o. ä. mit `isError`), die Hilfsfunktionstests an den Werten, `server.test.ts` an der Tool-Liste.

- [ ] **Step 4: `src/server/wohngeld-berechnen.ts` schreiben**

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type Berechnung, berechneWohngeld, HINWEIS_UNVERBINDLICH } from "../engine/berechnen";
import { AUSSCHLUSS_LEISTUNGEN, EINNAHME_ARTEN, type HaushaltEingabe } from "../engine/eingabe";
import { EingabeFehler } from "../engine/rechenweg";
import { sucheMietstufe } from "../mietstufen/daten";
import type { MietstufenTreffer } from "../mietstufen/typen";
import { type Mietstufe, RechtsstandFehlt, UNTERHALT_ARTEN } from "../rechtsstand";
import { antwort, mietstufeSchema, NUR_LESEND, ortFelder, trefferSchema } from "./gemeinsam";

export const WOHNGELD_BERECHNEN_BESCHREIBUNG =
  "Use this when the user wants an estimate of German housing benefit (Wohngeld, § 19 WoGG) for a rented flat " +
  "(Mietzuschuss) or owner-occupied home (Lastenzuschuss). Needs household members with their monthly income and " +
  "whether each pays taxes, health/care insurance and pension insurance; ask the user for these three, do not assume them. " +
  "Returns the monthly amount, the calculation path with legal references, assumptions and notes. " +
  "If the place is ambiguous, no amount is calculated; ask for Kreis or Bundesland, or pass mietstufe. " +
  "Stichworte: Wohngeld, Wohngeldrechner, Wohngeld Plus, Mietzuschuss, Lastenzuschuss, Mietstufe. " +
  "Nicht für: Bürgergeld, Kinderzuschlag, Grundsicherung, BAföG, Kosten der Unterkunft nach SGB II. " +
  "Unverbindliche Schätzung.";

const betrag = z.number().nonnegative().max(1_000_000);

const einnahmeSchema = z.object({
  art: z.enum(EINNAHME_ARTEN).describe('Einnahmeart nach § 14 WoGG. Beispiel: "nichtselbstaendig", "rente", "elterngeld"'),
  betrag_monatlich: z
    .number()
    .min(-1_000_000)
    .max(1_000_000)
    .describe("Monatlicher Bruttobetrag in Euro; bei selbstaendig und vermietung Gewinn bzw. Überschuss, darf negativ sein. Beispiel: 2150"),
  werbungskosten_monatlich: betrag
    .optional()
    .describe("Nur nichtselbstaendig und minijob_pauschal: Werbungskosten je Monat, sofern über dem Pauschbetrag. Beispiel: 150"),
  sonderzahlung_jaehrlich: betrag.optional().describe("Nur nichtselbstaendig: Weihnachts- und Urlaubsgeld im Jahr. Beispiel: 1800"),
  elterngeld_plus: z.boolean().optional().describe("Nur elterngeld: true bei ElterngeldPlus. Beispiel: false"),
  nummer: z
    .number()
    .int()
    .optional()
    .describe("Nur sonstige_voll und sonstige_haelfte: Nummer in § 14 Abs. 2 WoGG. Beispiel: 12"),
});

const mitgliedSchema = z.object({
  einnahmen: z.array(einnahmeSchema).max(20).describe('Einnahmen des Mitglieds, leer bei keinem Einkommen. Beispiel: [{"art":"rente","betrag_monatlich":1300}]'),
  zahlt_steuern: z.boolean().describe("Zahlt Steuern vom Einkommen (§ 16 WoGG). Pflichtangabe, beim Nutzer erfragen. Beispiel: true"),
  zahlt_kv_pv: z.boolean().describe("Zahlt Kranken- und Pflegeversicherung (§ 16 WoGG). Pflichtangabe, beim Nutzer erfragen. Beispiel: true"),
  zahlt_rv: z.boolean().describe("Zahlt Rentenversicherung (§ 16 WoGG). Pflichtangabe, beim Nutzer erfragen. Beispiel: false"),
  schwerbehindert: z.boolean().optional().describe("Grad der Behinderung 100 oder pflegebedürftig mit häuslicher Pflege (§ 17 Nr. 1). Beispiel: false"),
  ns_verfolgt: z.boolean().optional().describe("Opfer nationalsozialistischer Verfolgung (§ 17 Nr. 2). Beispiel: false"),
  kind_unter_25: z.boolean().optional().describe("Kind eines Haushaltsmitglieds, noch nicht 25, mit eigenem Einkommen (§ 17 Nr. 4). Beispiel: true"),
  grundrentenzeiten_33: z.boolean().optional().describe("Mindestens 33 Jahre Grundrentenzeiten (§ 17a). Beispiel: false"),
  ausschluss: z
    .enum(AUSSCHLUSS_LEISTUNGEN)
    .optional()
    .describe('Bezieht eine Transferleistung, die Wohngeld ausschließt (§ 7). Beispiel: "grundsicherungsgeld_sgb2"'),
});

const unterhaltSchema = z.object({
  art: z.enum(UNTERHALT_ARTEN).describe('Empfänger des gezahlten Unterhalts (§ 18). Beispiel: "ehegatte"'),
  betrag_monatlich: betrag.describe("Gezahlter Unterhalt je Monat in Euro. Beispiel: 300"),
  tituliert: z.boolean().optional().describe("Durch Titel, notarielle Vereinbarung oder Bescheid festgelegt. Beispiel: true"),
});

export const wohngeldBerechnenEingabe = z.object({
  stichtag: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "erwartet JJJJ-MM-TT")
    .optional()
    .describe('Datum, für das gerechnet wird, Standard heute. Beispiel: "2026-07-01"'),
  wohnort: z
    .object(ortFelder)
    .optional()
    .describe('Wohnort zum Nachschlagen der Mietstufe; entweder wohnort oder mietstufe. Beispiel: {"gemeinde":"Leipzig","land":"Sachsen"}'),
  mietstufe: mietstufeSchema.optional().describe("Mietstufe I bis VII als Zahl, wenn bekannt; entweder wohnort oder mietstufe. Beispiel: 4"),
  art: z.enum(["mietzuschuss", "lastenzuschuss"]).describe('Mietzuschuss für Mieter, Lastenzuschuss für Eigentümer. Beispiel: "mietzuschuss"'),
  miete_monatlich: betrag.describe("Bruttokaltmiete (Miete mit kalten Nebenkosten, ohne Heizung) bzw. Belastung je Monat in Euro. Beispiel: 650"),
  mitglieder: z.array(mitgliedSchema).min(1).max(30).describe("Alle Haushaltsmitglieder einschließlich der antragstellenden Person. Beispiel: [{\"einnahmen\":[{\"art\":\"rente\",\"betrag_monatlich\":1300}],\"zahlt_steuern\":false,\"zahlt_kv_pv\":true,\"zahlt_rv\":false}]"),
  alleinerziehend: z.boolean().optional().describe("Alleinerziehend mit Kind unter 18 im Haushalt (§ 17 Nr. 3). Beispiel: true"),
  unterhalt_gezahlt: z.array(unterhaltSchema).max(30).optional().describe('Gezahlter Unterhalt (§ 18). Beispiel: [{"art":"ehegatte","betrag_monatlich":300}]'),
  vermoegen: betrag.optional().describe("Vermögen aller zu berücksichtigenden Mitglieder in Euro (§ 21 Nr. 3). Beispiel: 15000"),
});
export type BerechnenEingabe = z.infer<typeof wohngeldBerechnenEingabe>;

const schrittSchema = z.object({ schritt: z.string(), norm: z.string(), wert: z.string(), erklaerung: z.string() });
const grundSchema = z.object({
  code: z.enum(["alle_ausgeschlossen", "vermoegen", "rechnerisch_kein_wohngeld", "bagatellgrenze"]),
  norm: z.string(),
  text: z.string(),
});

export const wohngeldBerechnenAusgabe = z.object({
  status: z.enum(["berechnet", "wohnort_mehrdeutig", "wohnort_nicht_gefunden"]),
  wohngeld_monatlich: z.number().optional(),
  stichtag: z.string().optional(),
  rechtsstand: z.string().optional(),
  mietstufe: mietstufeSchema.optional(),
  art: z.enum(["mietzuschuss", "lastenzuschuss"]).optional(),
  y: z.string().nullable().optional(),
  m: z.string().nullable().optional(),
  rechenweg: z.array(schrittSchema).optional(),
  annahmen: z.array(z.string()).optional(),
  ausschlussgrund: grundSchema.optional(),
  wohnort: trefferSchema.optional(),
  anzahl: z.number().int().optional(),
  kandidaten: z.array(trefferSchema).optional(),
  aehnlich: z.array(trefferSchema).optional(),
  hinweise: z.array(z.string()),
});
export type BerechnenAusgabe = z.infer<typeof wohngeldBerechnenAusgabe>;

const HINWEIS_MEHRDEUTIG = "Der Wohnort ist mehrdeutig. Bitte Kreis oder Bundesland angeben oder einen der Kandidaten wählen.";
const HINWEIS_NICHT_GEFUNDEN = "Der Wohnort wurde nicht gefunden. Bitte die Schreibweise prüfen oder einen der ähnlichen Namen wählen.";

// Kalendertag in Deutschland; "sv-SE" formatiert als JJJJ-MM-TT.
export function heuteInBerlin(jetzt: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(jetzt);
}

// Feldnamen der Engine (camelCase) → Feldnamen des Tool-Schemas (snake_case).
const FELDNAMEN: Readonly<Record<string, string>> = {
  mieteMonatlich: "miete_monatlich",
  betragMonatlich: "betrag_monatlich",
  werbungskostenMonatlich: "werbungskosten_monatlich",
  sonderzahlungJaehrlich: "sonderzahlung_jaehrlich",
  elterngeldPlus: "elterngeld_plus",
  zahltSteuern: "zahlt_steuern",
  zahltKvPv: "zahlt_kv_pv",
  zahltRv: "zahlt_rv",
  nsVerfolgt: "ns_verfolgt",
  kindUnter25: "kind_unter_25",
  grundrentenzeiten33: "grundrentenzeiten_33",
  unterhaltGezahlt: "unterhalt_gezahlt",
};

export function feldImTool(feld: string): string {
  return feld.replace(/[A-Za-z0-9]+/g, (w) => FELDNAMEN[w] ?? w);
}

function zuHaushalt(a: BerechnenEingabe, mietstufe: Mietstufe, stichtag: string): HaushaltEingabe {
  return {
    stichtag,
    mietstufe,
    art: a.art,
    mieteMonatlich: a.miete_monatlich,
    alleinerziehend: a.alleinerziehend,
    vermoegen: a.vermoegen,
    unterhaltGezahlt: a.unterhalt_gezahlt?.map((u) => ({ art: u.art, betragMonatlich: u.betrag_monatlich, tituliert: u.tituliert })),
    mitglieder: a.mitglieder.map((m) => ({
      einnahmen: m.einnahmen.map((e) => ({
        art: e.art,
        betragMonatlich: e.betrag_monatlich,
        werbungskostenMonatlich: e.werbungskosten_monatlich,
        sonderzahlungJaehrlich: e.sonderzahlung_jaehrlich,
        elterngeldPlus: e.elterngeld_plus,
        nummer: e.nummer,
      })),
      zahltSteuern: m.zahlt_steuern,
      zahltKvPv: m.zahlt_kv_pv,
      zahltRv: m.zahlt_rv,
      schwerbehindert: m.schwerbehindert,
      nsVerfolgt: m.ns_verfolgt,
      kindUnter25: m.kind_unter_25,
      grundrentenzeiten33: m.grundrentenzeiten_33,
      ausschluss: m.ausschluss,
    })),
  };
}

function rechne(e: HaushaltEingabe): Berechnung {
  try {
    return berechneWohngeld(e);
  } catch (f) {
    if (f instanceof RechtsstandFehlt) throw new Error(`Rechtsstand noch nicht verfügbar. ${f.message}`);
    if (f instanceof EingabeFehler) throw new Error(`${feldImTool(f.feld)}: ${f.message.slice(f.feld.length + 2)}`);
    throw f;
  }
}

export function berechne(a: BerechnenEingabe, jetzt: Date = new Date()): BerechnenAusgabe {
  if (a.wohnort && a.mietstufe !== undefined) throw new Error("wohnort: entweder wohnort oder mietstufe angeben, nicht beides");
  if (!a.wohnort && a.mietstufe === undefined) throw new Error("wohnort: wohnort oder mietstufe fehlt");

  let mietstufe: Mietstufe;
  let wohnort: MietstufenTreffer | undefined;
  if (a.wohnort) {
    const s = sucheMietstufe(a.wohnort);
    if (s.status === "mehrdeutig")
      return { status: "wohnort_mehrdeutig", anzahl: s.anzahl, kandidaten: s.kandidaten, hinweise: [HINWEIS_UNVERBINDLICH, HINWEIS_MEHRDEUTIG] };
    if (s.status === "nicht_gefunden")
      return { status: "wohnort_nicht_gefunden", aehnlich: s.aehnlich, hinweise: [HINWEIS_UNVERBINDLICH, HINWEIS_NICHT_GEFUNDEN] };
    mietstufe = s.treffer.mietstufe;
    wohnort = s.treffer;
  } else {
    mietstufe = a.mietstufe as Mietstufe; // Schema: ganze Zahl 1 bis 7
  }

  const stichtag = a.stichtag ?? heuteInBerlin(jetzt);
  const b = rechne(zuHaushalt(a, mietstufe, stichtag));
  return {
    status: "berechnet",
    wohngeld_monatlich: b.wohngeldMonatlich,
    stichtag,
    rechtsstand: b.rechtsstand,
    mietstufe: b.mietstufe,
    art: b.art,
    y: b.y,
    m: b.m,
    rechenweg: b.rechenweg,
    annahmen: b.annahmen,
    hinweise: b.hinweise,
    ...(b.ausschlussgrund ? { ausschlussgrund: b.ausschlussgrund } : {}),
    ...(wohnort ? { wohnort } : {}),
  };
}

export function registriereWohngeldBerechnen(server: McpServer): void {
  server.registerTool(
    "wohngeld_berechnen",
    {
      title: "Wohngeld berechnen",
      description: WOHNGELD_BERECHNEN_BESCHREIBUNG,
      inputSchema: wohngeldBerechnenEingabe,
      outputSchema: wohngeldBerechnenAusgabe,
      annotations: NUR_LESEND,
    },
    async (eingabe) => antwort(berechne(eingabe)),
  );
}
```

Falls `z.enum(EINNAHME_ARTEN)` mit dem `readonly`-Tupel in Zod 4 nicht typisiert, `z.enum([...EINNAHME_ARTEN] as [EinnahmeArt, ...EinnahmeArt[]])` verwenden. Falls Step 1 weitere camelCase-Bestandteile gezeigt hat, sie in `FELDNAMEN` ergänzen.

- [ ] **Step 5: In `src/server/server.ts` registrieren**

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { registriereMietstufeFinden } from "./mietstufe-finden";
import { registriereWohngeldBerechnen } from "./wohngeld-berechnen";

export const SERVER_NAME = "wohngeld-rechner";
export const SERVER_VERSION = "0.2.0";

// Pro Request ein frischer Server (zustandslos).
export function erzeugeServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registriereMietstufeFinden(server);
  registriereWohngeldBerechnen(server);
  return server;
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alles grün, `tsc` leer. `Output validation error` bedeutet: Ausgabe und Schema passen nicht zusammen (z. B. `y: null` ohne `.nullable()`).

- [ ] **Step 7: Commit**

```bash
git add src/server test/server
git commit -m "E4 Task 3: Tool wohngeld_berechnen mit Wohnortsuche und Fehlerübersetzung"
```

---

### Task 4: Metadaten prüfen und Golden-Prompt-Set

**Files:**
- Create: `test/server/metadaten.test.ts`
- Create: `test/golden-prompts.md`
- Modify (nur falls ein Test rot wird): `src/server/gemeinsam.ts`, `src/server/mietstufe-finden.ts`, `src/server/wohngeld-berechnen.ts`

**Interfaces:**
- Consumes: `tools/list` des Servers (Task 2, 3).
- Produces: keine Code-Schnittstelle; `test/golden-prompts.md` wird in Task 6 für die ChatGPT-Abnahme benutzt.

- [ ] **Step 1: Test schreiben**

`test/server/metadaten.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);
const tools = async (): Promise<any[]> => (await rufeMcp(fetchFn, "tools/list")).body.result.tools;

// Sammelt alle Eigenschaften eines JSON-Schemas mit Pfad, auch in verschachtelten Objekten und Array-Elementen.
function eigenschaften(schema: any, pfad = ""): [string, any][] {
  const liste: [string, any][] = [];
  for (const [name, p] of Object.entries<any>(schema?.properties ?? {})) {
    liste.push([`${pfad}${name}`, p]);
    liste.push(...eigenschaften(p, `${pfad}${name}.`));
    if (p.items) liste.push(...eigenschaften(p.items, `${pfad}${name}[].`));
  }
  return liste;
}

describe("Metadaten (Spec 4)", () => {
  it("jede Beschreibung beginnt mit „Use this when“ und nennt Ausschlussfälle", async () => {
    for (const t of await tools()) {
      expect(t.description, t.name).toMatch(/^Use this when /);
      expect(t.description, t.name).toContain("Nicht für:");
      expect(t.description, t.name).toContain("Bürgergeld");
    }
  });

  it("deutsche Stichworte", async () => {
    const alle = ["Wohngeld", "Wohngeldrechner", "Wohngeld Plus", "Mietzuschuss", "Lastenzuschuss", "Mietstufe"];
    for (const t of await tools()) for (const w of alle) expect(t.description, `${t.name}: ${w}`).toContain(w);
  });

  it("kein „kostenlos“, kein „amtlich“", async () => {
    for (const t of await tools()) {
      const text = JSON.stringify(t).toLowerCase();
      expect(text, t.name).not.toContain("kostenlos");
      expect(text, t.name).not.toContain("amtlich");
    }
  });

  it("jeder Parameter hat eine Beschreibung mit Beispiel", async () => {
    for (const t of await tools()) {
      const liste = eigenschaften(t.inputSchema);
      expect(liste.length, t.name).toBeGreaterThan(0);
      for (const [pfad, p] of liste) expect(p.description ?? "", `${t.name}.${pfad}`).toMatch(/Beispiel/);
    }
  });
});

describe("Golden-Prompt-Set (Spec 4)", () => {
  const text = readFileSync("test/golden-prompts.md", "utf8");
  it("5 positive und 3 negative Fälle", () => {
    expect(text.match(/^### P\d+ /gm)?.length).toBe(5);
    expect(text.match(/^### N\d+ /gm)?.length).toBe(3);
  });
  it("jeder Fall nennt erwartetes Tool und Verhalten", () => {
    const faelle = text.split(/^### /m).slice(1);
    for (const f of faelle) {
      expect(f).toMatch(/\*\*Erwartetes Tool:\*\*/);
      expect(f).toMatch(/\*\*Erwartetes Verhalten:\*\*/);
    }
  });
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `npx vitest run test/server/metadaten.test.ts`
Expected: Die Golden-Prompt-Tests schlagen fehl (`ENOENT … test/golden-prompts.md`). Die Metadaten-Tests sind grün, wenn Task 2 und 3 die Texte wie im Plan übernommen haben. Ist einer rot (z. B. eine verschachtelte Eigenschaft ohne „Beispiel“), die Beschreibung im Quelltext ergänzen, nicht den Test lockern. Der Pfad im Fehlertext zeigt die Stelle.

- [ ] **Step 3: Zähne der Metadaten-Tests prüfen**

In `src/server/gemeinsam.ts` bei `land` das Wort `Beispiel` vorübergehend durch `Etwa` ersetzen, `npx vitest run test/server/metadaten.test.ts` ausführen: Der Parametertest muss rot werden und `land` nennen. Änderung zurücknehmen (`git checkout src/server/gemeinsam.ts`).

- [ ] **Step 4: `test/golden-prompts.md` anlegen**

```markdown
# Golden-Prompt-Set

Prüffälle für die Abnahme in ChatGPT (Spec 4 und 7, E4). Dieselben Fälle dienen später als Testfälle der Einreichung.
Eine Abnahme gilt als bestanden, wenn ChatGPT bei allen positiven Fällen das genannte Tool aufruft und bei allen
negativen Fällen keines dieser Tools.

## Positive Fälle

### P1 Rentnerin, Mietstufe über den Ort

**Prompt:** „Wie viel Wohngeld bekomme ich? Ich bin Rentnerin, bekomme 1.300 € Rente im Monat und wohne allein in Jüterbog. Meine Miete ohne Heizung beträgt 335 €.“

**Erwartetes Tool:** `wohngeld_berechnen` (ggf. vorher `mietstufe_finden`)

**Erwartetes Verhalten:** ChatGPT fragt nach Steuern, Kranken- und Pflegeversicherung und Rentenversicherung, bevor es rechnet, und setzt sie nicht selbst. Mit „nur Kranken- und Pflegeversicherung“ und Stichtag 2025 ergibt sich 110 € (BMWSB-Beispiel 1). Die Antwort enthält den Hinweis auf die unverbindliche Schätzung.

### P2 Mietstufe eines mehrdeutigen Orts

**Prompt:** „Welche Mietstufe hat Esslingen?“

**Erwartetes Tool:** `mietstufe_finden`

**Erwartetes Verhalten:** Das Tool liefert „mehrdeutig“ (Esslingen am Neckar, Eßlingen in der Eifel). ChatGPT fragt nach dem Bundesland oder nennt beide mit Stufe.

### P3 Alleinerziehende in Wiesbaden

**Prompt:** „Ich bin alleinerziehend mit zwei Kindern in Wiesbaden, verdiene 1.530 € brutto, zahle Kranken- und Rentenversicherung, aber keine Steuern. Ein Kind bekommt 696 € Unterhaltsvorschuss. Die Miete ohne Heizung liegt bei 700 €. Habe ich Anspruch auf Wohngeld Plus?“

**Erwartetes Tool:** `wohngeld_berechnen`

**Erwartetes Verhalten:** Rechnung mit Mietstufe VI über den Wohnort. Ergebnis 372 € bei Stichtag 2025 (BMWSB-Beispiel 5), mit Rechenweg und Hinweis.

### P4 Lastenzuschuss für Eigentümer

**Prompt:** „Wir haben ein Eigenheim in Süderbrarup, sind zu dritt, ich verdiene 2.150 € brutto mit Kranken- und Rentenversicherung, die anderen haben kein Einkommen. Die Belastung liegt bei 750 € im Monat. Bekommen wir Lastenzuschuss?“

**Erwartetes Tool:** `wohngeld_berechnen` mit `art: "lastenzuschuss"`

**Erwartetes Verhalten:** Mietstufe I über den Kreis Schleswig-Flensburg, Ergebnis 320 € bei Stichtag 2025 (BMWSB-Beispiel 4).

### P5 Ort mit Landangabe

**Prompt:** „Ich ziehe nach Monheim in NRW. Welche Mietstufe gilt dort fürs Wohngeld?“

**Erwartetes Tool:** `mietstufe_finden` mit `land: "NRW"`

**Erwartetes Verhalten:** Eindeutig Monheim am Rhein, Mietstufe VI.

## Negative Fälle

### N1 Bürgergeld

**Prompt:** „Wie viel Bürgergeld steht mir als Single zu?“

**Erwartetes Tool:** keines

**Erwartetes Verhalten:** ChatGPT antwortet ohne die Tools des Wohngeld-Rechners.

### N2 Mietspiegel

**Prompt:** „Wie hoch ist der Mietspiegel in Köln pro Quadratmeter?“

**Erwartetes Tool:** keines

**Erwartetes Verhalten:** Kein Aufruf von `mietstufe_finden`; Mietstufe und Mietspiegel sind verschiedene Dinge.

### N3 Kindergeld

**Prompt:** „Wie beantrage ich Kindergeld für mein Neugeborenes?“

**Erwartetes Tool:** keines

**Erwartetes Verhalten:** ChatGPT antwortet ohne die Tools des Wohngeld-Rechners.
```

Vor dem Speichern prüfen, dass P4 zu `test/fixtures/bmwsb-2025-eingaben.ts` Nr. 4 passt (Einnahmen, Abzüge, Mitglieder). Weicht der Prompt ab, den Prompt an das Beispiel anpassen.

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alles grün.

- [ ] **Step 6: Commit**

```bash
git add test/server/metadaten.test.ts test/golden-prompts.md src/server
git commit -m "E4 Task 4: Metadaten-Tests und Golden-Prompt-Set"
```

---

### Task 5: Bundle-Prüfung und Gegentests

**Files:**
- Create: `scripts/pruefe-bundle.mjs`
- Modify: `package.json` (Skript `pruefe:bundle`)
- Modify: `.gitignore` (`dist-pruefung/`)
- Modify: `scripts/gegentest.mjs` (Mutationen anhängen)

**Interfaces:**
- Consumes: den Code aus Task 1 bis 3, dessen Zeichenketten die Mutationen exakt treffen müssen.
- Produces: `npm run pruefe:bundle` (Exit 0 = baubar, Node-frei, unter 3 MiB gzip).

- [ ] **Step 1: Bundle-Skript schreiben**

`scripts/pruefe-bundle.mjs`:

```js
// Baut den Worker wie beim Deploy (ohne Hochladen) und prüft das Ergebnis:
// keine node:-Importe (Workers ohne nodejs_compat) und unter 3 MiB gzip (Workers Free).
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { gzipSync } from "node:zlib";

const AUSGABE = "dist-pruefung";
const GRENZE_GZIP = 3 * 1024 * 1024;

rmSync(AUSGABE, { recursive: true, force: true });
const bau = spawnSync("npx", ["wrangler", "deploy", "--dry-run", "--outdir", AUSGABE], { stdio: "inherit" });
if (bau.status !== 0) {
  console.error("wrangler deploy --dry-run ist fehlgeschlagen.");
  process.exit(1);
}

const dateien = readdirSync(AUSGABE).filter((d) => d.endsWith(".js"));
if (dateien.length === 0) {
  console.error(`Keine .js-Datei in ${AUSGABE}.`);
  process.exit(1);
}
let fehler = 0;
for (const d of dateien) {
  const code = readFileSync(`${AUSGABE}/${d}`, "utf8");
  const node = code.match(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']node:[^"']+["']/g) ?? [];
  const gz = gzipSync(code).length;
  console.log(`${d}: ${code.length} Bytes, gzip ${gz} Bytes, node:-Importe ${node.length}`);
  if (node.length > 0) {
    console.error(node.join("\n"));
    fehler++;
  }
  if (gz > GRENZE_GZIP) {
    console.error(`${d} ist größer als 3 MiB gzip.`);
    fehler++;
  }
}
process.exit(fehler > 0 ? 1 : 0);
```

In `package.json` unter `scripts` ergänzen: `"pruefe:bundle": "node scripts/pruefe-bundle.mjs"`. In `.gitignore` die Zeile `dist-pruefung/` ergänzen.

- [ ] **Step 2: Bundle prüfen**

Run: `npm run pruefe:bundle; echo "Exit $?"`
Expected: eine Zeile mit Bytes, gzip-Größe und `node:-Importe 0`, `Exit 0`. Die Zahlen kommen in den Bericht.

- [ ] **Step 3: Zähne der Bundle-Prüfung zeigen**

Vorübergehend als erste Zeile in `src/server/index.ts` einfügen: `import { readFileSync } from "node:fs"; void readFileSync;`
Run: `npm run pruefe:bundle; echo "Exit $?"`
Expected: `Exit 1` (Wrangler bricht ab oder das Skript findet den Import). Zeile wieder entfernen, erneut ausführen: `Exit 0`.

- [ ] **Step 4: Mutationen anhängen**

Zuerst die Struktur von `scripts/gegentest.mjs` lesen: wie Mutationen eingetragen werden und ob das Skript prüft, dass `alt` genau einmal vorkommt. Dann an das Array `MUTATIONEN` anhängen:

```js
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
```

Jede `alt`-Zeichenkette muss im Code genau einmal vorkommen. Vorher je Mutation mit `grep -cF -- '<alt>' <datei>` prüfen (Ergebnis 1). Wo Prettier oder die Umsetzung den Text anders formatiert hat (z. B. die zweizeilige Längengrenze), die Mutation an den tatsächlichen Code anpassen, nicht den Code an die Mutation.

- [ ] **Step 5: Gegentests im Hintergrund laufen lassen**

Run (Hintergrund, über 300 s): `npm run gegentest > /tmp/gegentest-e4.txt 2>&1; echo "Exit $?" >> /tmp/gegentest-e4.txt`
Expected: am Ende `Exit 0` und in der Zusammenfassung 77 rot, 0 grün (65 bisherige plus 12 neue). Gezählt wird über die Ausgabe des Skripts, die selbst auf Exit-Codes beruht. Eine grüne Mutation ist ein Befund: Entweder erreicht kein Test die Stelle, oder die Stelle ist toter Code. Ursache im Bericht nennen, nicht die Mutation streichen.

- [ ] **Step 6: Commit**

```bash
git add scripts/pruefe-bundle.mjs scripts/gegentest.mjs package.json .gitignore
git commit -m "E4 Task 5: Bundle-Prüfung und Gegentests für Server und Suche"
```

---

### Task 6: README, Deploy und Live-Prüfung

**Vorbedingung:** Der Controller fragt den Nutzer vor Step 4, ob deployt werden darf. Der Deploy ersetzt den E0-Stand auf workers.dev (`rechner_status` fällt weg). Die E0-Abnahme in ChatGPT steht noch aus (Stand 09.10.2026).

**Files:**
- Create: `README.md`
- Create: `scripts/pruefe-deploy.ts`
- Modify: `package.json` (Skript `pruefe:deploy`)

**Interfaces:**
- Consumes: `rufeMcp`, `INITIALIZE_PARAMS` aus `test/hilfen/mcp.ts`; den deployten Worker.
- Produces: `npm run pruefe:deploy [-- <url>]` (Exit 0 = Live-Stand stimmt).

- [ ] **Step 1: Live-Prüfskript schreiben**

`scripts/pruefe-deploy.ts`:

```ts
// Prüft den deployten Server über HTTP wie ein MCP-Client. Exit 0 nur, wenn alle Prüfungen stimmen.
import { INITIALIZE_PARAMS, rufeMcp } from "../test/hilfen/mcp";

const url = process.argv[2] ?? "https://wohngeld-rechner.nyko-a85.workers.dev/mcp";
const fetchFn = (r: Request) => fetch(new Request(url, r));
let fehler = 0;
const pruefe = (name: string, ok: boolean, ist: unknown) => {
  console.log(`${ok ? "ok    " : "FEHLER"} ${name}${ok ? "" : `: ${JSON.stringify(ist)}`}`);
  if (!ok) fehler++;
};

const init = await rufeMcp(fetchFn, "initialize", INITIALIZE_PARAMS);
pruefe("initialize Version 0.2.0", init.body?.result?.serverInfo?.version === "0.2.0", init.body);

const liste = await rufeMcp(fetchFn, "tools/list");
const namen = (liste.body?.result?.tools ?? []).map((t: { name: string }) => t.name).sort();
pruefe("tools/list", JSON.stringify(namen) === JSON.stringify(["mietstufe_finden", "wohngeld_berechnen"]), namen);

const ort = await rufeMcp(fetchFn, "tools/call", { name: "mietstufe_finden", arguments: { gemeinde: "Monheim", land: "NRW" } });
const t = ort.body?.result?.structuredContent;
pruefe("mietstufe_finden Monheim NRW = VI", t?.status === "eindeutig" && t?.treffer?.mietstufe === 6, t);

const rechnung = await rufeMcp(fetchFn, "tools/call", {
  name: "wohngeld_berechnen",
  arguments: {
    stichtag: "2025-07-01",
    mietstufe: 1,
    art: "mietzuschuss",
    miete_monatlich: 335,
    mitglieder: [{ einnahmen: [{ art: "rente", betrag_monatlich: 1300 }], zahlt_steuern: false, zahlt_kv_pv: true, zahlt_rv: false }],
  },
});
const r = rechnung.body?.result?.structuredContent;
pruefe("wohngeld_berechnen BMWSB-Beispiel 1 = 110 €", r?.wohngeld_monatlich === 110, r ?? rechnung.body);

const fremd = await fetch(url.replace(/\/mcp$/, "/anderes"));
pruefe("404 außerhalb von /mcp", fremd.status === 404, fremd.status);

process.exit(fehler > 0 ? 1 : 0);
```

In `package.json` ergänzen: `"pruefe:deploy": "tsx scripts/pruefe-deploy.ts"`.

- [ ] **Step 2: Skript lokal gegen `wrangler dev` prüfen**

Run (Hintergrund): `npx wrangler dev --port 8787`, dann `npm run pruefe:deploy -- http://localhost:8787/mcp; echo "Exit $?"`, danach `wrangler dev` beenden.
Expected: fünf Zeilen `ok`, `Exit 0`.

- [ ] **Step 3: README schreiben**

`README.md` mit diesen Abschnitten, Inhalte aus Spec und Code, keine erfundenen Angaben:

1. Titel „Wohngeld-Rechner (MCP-Server)“, ein englischer Absatz: “An unofficial estimate of German housing benefit (Wohngeld) as an MCP server for ChatGPT and other MCP clients. Calculates § 19 WoGG with the 2025 law and looks up the Mietstufe by municipality.”
2. Was er kann: die beiden Tools mit je einem Satz und einem Beispielaufruf (JSON aus den Tests).
3. Grenzen: unverbindliche Schätzung, Rechtsstand 01.01.2025 (Recht ab 2027 folgt nach Verkündung), keine Speicherung und kein Logging, kein Auftreten als Behörde.
4. Einbinden: MCP-URL `https://wohngeld-rechner.nyko-a85.workers.dev/mcp`, ohne Authentifizierung, Klickfolge für ChatGPT aus dem E0-Handoff (chatgpt.com/plugins → „Add custom MCP server“ → URL → „No authentication“ → „Create as a plugin“).
5. Entwicklung: `npm ci`, `npm test`, `npm run typecheck`, `npm run dev`, `npm run pruefe:rechtsstand`, `npm run pruefe:mietstufen`, `npm run pruefe:bundle`, `npm run gegentest` (Laufzeit über 5 Minuten), `npm run pruefe:deploy`.
6. Aufbau: Verzeichnisbaum aus Spec 3, Satz zur Abhängigkeitsrichtung.
7. Prüfung: Die 11 BMWSB-Rechenbeispiele, Länderfall, Gegentests über Exit-Code, Abgleich der Mietstufen mit der Anlage auf gesetze-im-internet.de und der BMWSB-Liste.
8. Quellen und Lizenz: Code MIT. `data/` nicht MIT: Quellenvermerk Destatis-Gemeindeverzeichnis und Kennzeichnung als verändert, Text wörtlich aus `meta.hinweis` in `data/mietstufen-2023.json` übernehmen; Rechtsquellen WoGG, WoGV mit Link; Verweis auf `docs/quellen/`.

Check nach dem Schreiben: `grep -n -i "kostenlos\|amtlich" README.md` darf nur Treffer liefern, die eine Abgrenzung ausdrücken („nicht amtlich“, „kein Auftreten als Behörde“). Jeder Treffer wird im Bericht genannt.

- [ ] **Step 4: Deploy (nur nach Freigabe des Nutzers)**

Run: `npx wrangler whoami`
Expected: Konto `nyko@patinasouthside.de`. Anderes Konto oder nicht angemeldet: abbrechen und dem Controller melden; der Nutzer meldet sich mit `! npx wrangler login` an.

Run: `npm run deploy`
Expected: Ausgabe mit `https://wohngeld-rechner.nyko-a85.workers.dev`.

- [ ] **Step 5: Live prüfen**

Run: `npm run pruefe:deploy; echo "Exit $?"`
Expected: fünf Zeilen `ok`, `Exit 0`.

- [ ] **Step 6: Commit**

```bash
git add README.md scripts/pruefe-deploy.ts package.json
git commit -m "E4 Task 6: README, Live-Prüfung, Deploy 0.2.0"
```

- [ ] **Step 7: Abnahme durch den Nutzer (nicht durch den Agenten)**

Der Nutzer bindet den Server in ChatGPT ein (oder aktualisiert die bestehende Einbindung) und führt die acht Fälle aus `test/golden-prompts.md` aus. Ergebnis je Fall (Tool aufgerufen ja/nein, Betrag) kommt in den E4-Handoff. Damit sind die E0- und die E4-Abnahme erledigt (Spec 7: „Test 7 grün, Gespräch in ChatGPT“).

---

## Nach dem Plan

- Integration: Merge `bau/e0-e1` → `bau/e2` → `bau/e3` → `bau/e4` nach main erst nach der Abnahme in ChatGPT und nach Freigabe durch den Nutzer.
- Offen aus dem E3-Handoff und hier bewusst nicht gelöst: Der Node-frei-Wächter `test/mietstufen/node-frei.test.ts` hat Restlücken (URL-Importe, `import (` mit Leerzeichen). Die Bundle-Prüfung aus Task 5 deckt den Server-Pfad ab; der Wächter bleibt wie er ist.
