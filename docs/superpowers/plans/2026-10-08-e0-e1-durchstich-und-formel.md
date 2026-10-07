# E0 und E1: Durchstich und Formel – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein lauffähiger MCP-Server auf Cloudflare Workers (E0) und eine getestete Rechen-Engine für Miete und Formel nach § 19 WoGG mit dem Rechtsstand ab 01.01.2025 (E1).

**Architecture:** Rechtsstand als reine Daten (`src/rechtsstand/`), reine Rechenfunktionen ohne I/O mit `decimal.js` (`src/engine/`), dünne MCP-Hülle mit `createMcpHandler` aus dem MCP-SDK v2 (`src/server/`). Engine und Rechtsstand sind Node-frei und ohne Server testbar.

**Tech Stack:** TypeScript 5.9, Node 22, Vitest 5, decimal.js 10, zod 4, @modelcontextprotocol/server 2.3, wrangler 4, tsx.

**Spec:** `docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md`

**Folgepläne:** E2 (Einkommen), E3 (Mietstufen), E4 (Tools und Metadaten) bekommen je einen eigenen Plan, weil E0 die Server-Bibliothek und E1 die Rechenregeln festlegt.

## Global Constraints

- Nur öffentliche Quellen. Jede Zahl im Rechtsstand trägt ihre Fundstelle als Kommentar.
- Kein Logging und keine Speicherung von Eingaben.
- Kein „amtlich“, kein Bundesadler, kein Auftreten als Behörde.
- Geldbeträge und Koeffizienten werden in der Engine nur mit `decimal.js` verrechnet, nie mit `number`-Arithmetik.
- Zwischenwerte z1 bis z4 werden auf zehn Nachkommastellen kaufmännisch gerundet (ROUND_HALF_UP), das Wohngeld kaufmännisch auf volle Euro (Anlage 3 WoGG).
- Engine-Funktionen sind rein: kein `Date.now()`, kein Netz, kein Dateisystem. Der Stichtag ist Eingabe.
- Alle Tools: `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`.
- Code-Bezeichner und Kommentare auf Deutsch, wie in der Spec (`rechtsstandFuer`, `berechneMiete`).
- Commits enden mit
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01G9peWGoGjXLUNJg2fCx3Mi
  ```
- Gearbeitet wird in einem Worktree unter `~/Developer/worktrees/` (das Haupt-Repo liegt in iCloud; `node_modules` dort machen Vitest langsam). Im Worktree `npm ci` bzw. `npm install`, nie `node_modules` verlinken.

## Review Focus

1. Stichtag genau auf den Grenzen (2025-01-01, 2026-12-31) und davor (2024-12-31): erwartet wird der Rechtsstand 2025 bzw. ein klarer Fehler, keine stille Rückfallstufe. Test in Task 2.
2. Mischhaushalt mit Drittel-Anteil (Miete 333,33 €, 3 Mitglieder, 1 zu berücksichtigen): erwartet werden exakte Dezimalwerte ohne Gleitkomma-Reste. Test in Task 4.
3. Unmögliche Haushalte (0 zu berücksichtigende Mitglieder, mehr zu berücksichtigende als Mitglieder, Mietstufe 8, halbe Personen): erwartet wird ein Fehler mit Feldname, keine Rechnung. Test in Task 4.
4. Negatives Einkommen oder negative Miete in der Formel: erwartet wird ein Fehler. Test in Task 5.
5. Haushalt über 12 Mitglieder mit so hohem Einkommen, dass die Grundrechnung negativ wird: erwartet wird 0 € ohne 65-€-Zuschläge (Annahme, siehe Task 5, in der README vermerkt). Test in Task 5.

---

### Task 1: Projektgerüst und Durchstich-Server (E0)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `wrangler.jsonc`
- Create: `src/server/server.ts`, `src/server/index.ts`
- Test: `test/server/server.test.ts`, `test/hilfen/mcp.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `erzeugeServer(): McpServer` in `src/server/server.ts`; `default export { fetch(request: Request): Promise<Response> }` in `src/server/index.ts`; Testhilfe `rufeMcp(fetchFn, method, params?, id?)` in `test/hilfen/mcp.ts`

- [ ] **Step 1: Pakete anlegen**

`package.json`:

```json
{
  "name": "wohngeld-rechner",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "license": "MIT",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "pruefe:rechtsstand": "tsx scripts/pruefe-rechtsstand.ts",
    "gegentest": "node scripts/gegentest.mjs"
  }
}
```

Dann:

```bash
npm install decimal.js@10 zod@4 @modelcontextprotocol/server@2.3
npm install -D typescript@5.9 vitest@5 wrangler@4 tsx @types/node@22
```

- [ ] **Step 2: Konfiguration**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "test", "scripts", "vitest.config.ts"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
```

`wrangler.jsonc`:

```jsonc
{
  "name": "wohngeld-rechner",
  "main": "src/server/index.ts",
  "compatibility_date": "2026-10-01",
  "observability": { "enabled": false }
}
```

`observability` bleibt aus, damit keine Eingaben in Logs landen.

- [ ] **Step 3: Testhilfe für MCP über HTTP schreiben**

`test/hilfen/mcp.ts`:

```ts
// Ruft einen MCP-Endpunkt über HTTP auf, wie es ein Client des Protokolls 2025-06-18 tut.
// Antworten können JSON oder Server-Sent Events sein; bei SSE zählt die letzte data-Zeile.
export type FetchFn = (request: Request) => Promise<Response>;

export async function rufeMcp(
  fetchFn: FetchFn,
  method: string,
  params: Record<string, unknown> = {},
  id = 1,
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (method !== "initialize") headers["mcp-protocol-version"] = "2025-06-18";
  const response = await fetchFn(
    new Request("https://test.local/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  const text = await response.text();
  const typ = response.headers.get("content-type") ?? "";
  if (typ.includes("text/event-stream")) {
    const zeilen = text.split("\n").filter((z) => z.startsWith("data: "));
    const letzte = zeilen.at(-1);
    return { status: response.status, body: letzte ? JSON.parse(letzte.slice(6)) : null };
  }
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

export const INITIALIZE_PARAMS = {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "test", version: "0.0.0" },
};
```

- [ ] **Step 4: Failing test schreiben**

`test/server/server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { INITIALIZE_PARAMS, rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);

describe("MCP-Server (Durchstich)", () => {
  it("antwortet auf initialize", async () => {
    const { status, body } = await rufeMcp(fetchFn, "initialize", INITIALIZE_PARAMS);
    expect(status).toBe(200);
    expect(body.result.serverInfo.name).toBe("wohngeld-rechner");
  });

  it("listet rechner_status mit Annotationen", async () => {
    const { body } = await rufeMcp(fetchFn, "tools/list");
    const tool = body.result.tools.find((t: any) => t.name === "rechner_status");
    expect(tool).toBeDefined();
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  it("ruft rechner_status auf", async () => {
    const { body } = await rufeMcp(fetchFn, "tools/call", { name: "rechner_status", arguments: {} });
    expect(body.result.structuredContent).toEqual({
      name: "wohngeld-rechner",
      version: "0.1.0",
      hinweis: "Durchstich. Die Wohngeldberechnung folgt.",
    });
  });

  it("liefert 404 außerhalb von /mcp", async () => {
    const response = await worker.fetch(new Request("https://test.local/anderes"));
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 5: Test laufen lassen, er muss scheitern**

Run: `npx vitest run test/server/server.test.ts`
Expected: FAIL, Modul `src/server/index` nicht gefunden.

- [ ] **Step 6: Server schreiben**

`src/server/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export const SERVER_NAME = "wohngeld-rechner";
export const SERVER_VERSION = "0.1.0";

// Alle Tools rechnen nur: nichts wird geschrieben, nichts außerhalb des Servers abgefragt.
export const NUR_LESEND = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

// Pro Request ein frischer Server (zustandslos).
export function erzeugeServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "rechner_status",
    {
      title: "Status des Wohngeld-Rechners",
      description: "Use this when checking whether the Wohngeld-Rechner server is reachable. Liefert Name und Version.",
      inputSchema: z.object({}),
      outputSchema: z.object({ name: z.string(), version: z.string(), hinweis: z.string() }),
      annotations: NUR_LESEND,
    },
    async () => {
      const ausgabe = {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        hinweis: "Durchstich. Die Wohngeldberechnung folgt.",
      };
      return { content: [{ type: "text", text: JSON.stringify(ausgabe) }], structuredContent: ausgabe };
    },
  );

  return server;
}
```

`src/server/index.ts`:

```ts
import { createMcpHandler } from "@modelcontextprotocol/server";
import { erzeugeServer } from "./server";

const handler = createMcpHandler(erzeugeServer);

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname !== "/mcp") return new Response("Not found", { status: 404 });
    return handler.fetch(request);
  },
};
```

Ist die Signatur von `createMcpHandler` oder `handler.fetch` anders als hier angenommen, gilt die Typdefinition im Paket (`node_modules/@modelcontextprotocol/server/dist/*.d.mts`, Suche nach `declare function createMcpHandler`). Abweichungen im Bericht nennen.

- [ ] **Step 7: Tests und Typprüfung laufen lassen**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 4 Tests PASS, `tsc` ohne Fehler.

- [ ] **Step 8: Lokal mit wrangler prüfen**

```bash
npx wrangler dev --port 8787 &
sleep 5
curl -s -X POST http://localhost:8787/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
kill %1
```

Expected: JSON oder SSE mit `"serverInfo":{"name":"wohngeld-rechner"`. Scheitert der Start, weil Node-APIs fehlen, in `wrangler.jsonc` `"compatibility_flags": ["nodejs_compat"]` ergänzen und im Bericht nennen.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts wrangler.jsonc src/server test
git commit -m "E0: Projektgerüst und MCP-Durchstich auf Workers"
```

- [ ] **Step 10: Deploy (Controller-Schritt mit dem Auftraggeber)**

Run: `npx wrangler whoami`
Ist niemand angemeldet: STOP und an den Controller melden. Der Auftraggeber meldet sich selbst an (`! npx wrangler login`).
Sonst: `npx wrangler deploy` und die ausgegebene URL `https://wohngeld-rechner.<konto>.workers.dev` notieren. Dann den curl aus Step 8 gegen `<url>/mcp` wiederholen.

- [ ] **Step 11: Abnahme in ChatGPT (Auftraggeber)**

Der Auftraggeber öffnet chatgpt.com/plugins, wählt „Add custom MCP server“, trägt `<url>/mcp` ein, wählt „No authentication“, legt es mit „Create as a plugin“ an und ruft im Work-Tab `@wohngeld-rechner` mit „Wie ist der Status?“ auf. Abnahme: Das Tool `rechner_status` antwortet.
Scheitert das am Protokoll, entscheidet der Controller über den Rückfall auf das SDK v1 (`createLegacyMcpHandler` aus dem Paket `agents`) und ergänzt diesen Plan. Scheitert es am Tarif oder an der Region des Kontos, wird das im Handoff festgehalten; E1 läuft unabhängig davon weiter.

---

### Task 2: Rechtsstand 2025 als Daten

**Files:**
- Create: `src/rechtsstand/typen.ts`, `src/rechtsstand/wogg-2025.ts`, `src/rechtsstand/index.ts`, `src/rechtsstand/zugriff.ts`
- Test: `test/rechtsstand/rechtsstand.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `type Mietstufe = 1 | 2 | 3 | 4 | 5 | 6 | 7`
  - `interface Rechtsstand` (siehe Code)
  - `rechtsstandFuer(stichtag: string): Rechtsstand` (wirft `RechtsstandFehlt`)
  - `class RechtsstandFehlt extends Error`
  - `WOGG_2025: Rechtsstand`
  - `zaehltAls(n: number): number` (Haushaltsgröße für Tabellen, gedeckelt auf 12)
  - `hoechstbetrag(rs, n, stufe): number`, `klimakomponente(rs, n): number`, `heizkostenentlastung(rs, n): number`, `koeffizienten(rs, n): { a: string; b: string; c: string }`, `mindestwerte(rs, n): { m: number; y: number }`

- [ ] **Step 1: Failing test schreiben**

`test/rechtsstand/rechtsstand.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RechtsstandFehlt, rechtsstandFuer } from "../../src/rechtsstand";
import {
  heizkostenentlastung,
  hoechstbetrag,
  klimakomponente,
  koeffizienten,
  mindestwerte,
  zaehltAls,
} from "../../src/rechtsstand/zugriff";

const rs = rechtsstandFuer("2025-06-01");

describe("rechtsstandFuer", () => {
  it("liefert den Rechtsstand 2025 auf beiden Grenzen", () => {
    expect(rechtsstandFuer("2025-01-01").id).toBe("wogg-2025");
    expect(rechtsstandFuer("2026-12-31").id).toBe("wogg-2025");
  });

  it("wirft für Stichtage ab 2027", () => {
    expect(() => rechtsstandFuer("2027-01-01")).toThrow(RechtsstandFehlt);
  });

  it("wirft für Stichtage vor 2025", () => {
    expect(() => rechtsstandFuer("2024-12-31")).toThrow(RechtsstandFehlt);
  });

  it("wirft bei ungültigem Datum", () => {
    expect(() => rechtsstandFuer("01.01.2025")).toThrow(RechtsstandFehlt);
  });
});

describe("Tabellenzugriff 2025", () => {
  it("Höchstbeträge Anlage 1, bis 5 Mitglieder direkt", () => {
    expect(hoechstbetrag(rs, 1, 1)).toBe(361);
    expect(hoechstbetrag(rs, 4, 7)).toBe(1139);
    expect(hoechstbetrag(rs, 5, 3)).toBe(875);
  });

  it("Höchstbeträge ab 6 Mitgliedern mit Mehrbetrag", () => {
    expect(hoechstbetrag(rs, 6, 2)).toBe(876); // BMWSB-Beispiel 9
    expect(hoechstbetrag(rs, 12, 3)).toBe(1617); // Länderhinweis
  });

  it("über 12 Mitglieder zählen die Werte für 12", () => {
    expect(zaehltAls(14)).toBe(12);
    expect(hoechstbetrag(rs, 14, 3)).toBe(1617);
    expect(klimakomponente(rs, 14)).toBeCloseTo(72.8, 10);
    expect(heizkostenentlastung(rs, 14)).toBeCloseTo(418.6, 10);
  });

  it("Klimakomponente und Heizkosten § 12 Abs. 6, 7", () => {
    expect(klimakomponente(rs, 1)).toBe(19.2);
    expect(klimakomponente(rs, 5)).toBe(39.2);
    expect(heizkostenentlastung(rs, 3)).toBe(170.2);
    expect(heizkostenentlastung(rs, 6)).toBeCloseTo(253, 10); // BMWSB-Beispiel 9
  });

  it("Koeffizienten Anlage 2 als Dezimal-Strings", () => {
    expect(koeffizienten(rs, 1)).toEqual({ a: "0.04", b: "0.0004797", c: "0.0000408" });
    expect(koeffizienten(rs, 12)).toEqual({ a: "-0.12", b: "0.0001107", c: "0.0000221" });
    expect(koeffizienten(rs, 14)).toEqual(koeffizienten(rs, 12));
  });

  it("Mindestwerte Anlage 3", () => {
    expect(mindestwerte(rs, 1)).toEqual({ m: 54, y: 396 });
    expect(mindestwerte(rs, 12)).toEqual({ m: 298, y: 2943 });
  });

  it("wirft bei Haushaltsgröße unter 1", () => {
    expect(() => hoechstbetrag(rs, 0, 1)).toThrow();
  });
});
```

Die Aufrufe von `klimakomponente` und `heizkostenentlastung` liefern `number`, weil die Tabellen Cent-Beträge mit höchstens zwei Stellen enthalten. Für Werte ab 6 Mitgliedern rechnet `zugriff.ts` mit `decimal.js` und gibt das Ergebnis per `toNumber()` zurück.

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run test/rechtsstand`
Expected: FAIL, Module fehlen.

- [ ] **Step 3: Typen schreiben**

`src/rechtsstand/typen.ts`:

```ts
export type Mietstufe = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const MIETSTUFEN: readonly Mietstufe[] = [1, 2, 3, 4, 5, 6, 7];

// Tabelle mit eigenen Werten für 1 bis 5 Mitglieder und einem Mehrbetrag je weiterem Mitglied.
export interface StaffelBis5<T> {
  bis5: Record<1 | 2 | 3 | 4 | 5, T>;
  mehrbetrag: T;
}

export interface Koeffizienten {
  a: string;
  b: string;
  c: string;
}

export interface Rechtsstand {
  id: string;
  gueltigAb: string; // ISO-Datum, einschließlich
  gueltigBis: string; // ISO-Datum, einschließlich
  fundstelle: string;
  hoechstbetraege: StaffelBis5<Record<Mietstufe, number>>; // Anlage 1
  koeffizienten: Record<number, Koeffizienten>; // Anlage 2, Schlüssel 1 bis 12
  mindestwerte: Record<number, { m: number; y: number }>; // Anlage 3 Nr. 1, Schlüssel 1 bis 12
  heizkostenentlastung: StaffelBis5<number>; // § 12 Abs. 6
  klimakomponente: StaffelBis5<number>; // § 12 Abs. 7
  zuschlagAb13: number; // § 19 Abs. 3
  bagatellgrenze: number; // § 21 Nr. 1
}
```

- [ ] **Step 4: Daten 2025 schreiben**

`src/rechtsstand/wogg-2025.ts`:

```ts
import type { Rechtsstand } from "./typen";

// Werte ab 01.01.2025, Zweite Verordnung zur Fortschreibung des Wohngeldes, BGBl. 2024 I Nr. 314.
// Geprüft gegen gesetze-im-internet.de am 07.10.2026, siehe docs/quellen/2026-10-07-recherche-wohngeld-fachlich.md.
export const WOGG_2025: Rechtsstand = {
  id: "wogg-2025",
  gueltigAb: "2025-01-01",
  gueltigBis: "2026-12-31",
  fundstelle: "WoGG in der ab 01.01.2025 geltenden Fassung (BGBl. 2024 I Nr. 314)",

  // Anlage 1 WoGG, https://www.gesetze-im-internet.de/wogg/anlage_1.html
  hoechstbetraege: {
    bis5: {
      1: { 1: 361, 2: 408, 3: 456, 4: 511, 5: 562, 6: 615, 7: 677 },
      2: { 1: 437, 2: 493, 3: 551, 4: 619, 5: 680, 6: 745, 7: 820 },
      3: { 1: 521, 2: 587, 3: 657, 4: 737, 5: 809, 6: 887, 7: 975 },
      4: { 1: 608, 2: 686, 3: 766, 4: 858, 5: 946, 6: 1035, 7: 1139 },
      5: { 1: 694, 2: 782, 3: 875, 4: 982, 5: 1080, 6: 1183, 7: 1302 },
    },
    mehrbetrag: { 1: 82, 2: 94, 3: 106, 4: 119, 5: 129, 6: 149, 7: 163 },
  },

  // Anlage 2 WoGG, https://www.gesetze-im-internet.de/wogg/anlage_2.html
  // Gesetzesnotation E-2 = /100, E-4 = /10 000, E-5 = /100 000, E-1 = /10.
  koeffizienten: {
    1: { a: "0.04", b: "0.0004797", c: "0.0000408" },
    2: { a: "0.03", b: "0.0003571", c: "0.0000304" },
    3: { a: "0.02", b: "0.0002917", c: "0.0000245" },
    4: { a: "0.01", b: "0.0002163", c: "0.0000176" },
    5: { a: "0", b: "0.0001907", c: "0.0000172" },
    6: { a: "-0.01", b: "0.0001722", c: "0.0000166" },
    7: { a: "-0.02", b: "0.0001592", c: "0.0000165" },
    8: { a: "-0.03", b: "0.0001583", c: "0.0000165" },
    9: { a: "-0.04", b: "0.0001376", c: "0.0000166" },
    10: { a: "-0.06", b: "0.0001249", c: "0.0000166" },
    11: { a: "-0.09", b: "0.0001141", c: "0.0000196" },
    12: { a: "-0.12", b: "0.0001107", c: "0.0000221" },
  },

  // Anlage 3 Nr. 1 WoGG, https://www.gesetze-im-internet.de/wogg/anlage_3.html
  mindestwerte: {
    1: { m: 54, y: 396 },
    2: { m: 67, y: 679 },
    3: { m: 79, y: 906 },
    4: { m: 92, y: 1132 },
    5: { m: 103, y: 1358 },
    6: { m: 103, y: 1585 },
    7: { m: 115, y: 1811 },
    8: { m: 128, y: 2037 },
    9: { m: 140, y: 2264 },
    10: { m: 152, y: 2490 },
    11: { m: 187, y: 2717 },
    12: { m: 298, y: 2943 },
  },

  // § 12 Abs. 6 WoGG (CO2-Komponente plus dauerhafte Heizkostenkomponente), https://www.gesetze-im-internet.de/wogg/__12.html
  heizkostenentlastung: {
    bis5: { 1: 110.4, 2: 142.6, 3: 170.2, 4: 197.8, 5: 225.4 },
    mehrbetrag: 27.6,
  },

  // § 12 Abs. 7 WoGG
  klimakomponente: {
    bis5: { 1: 19.2, 2: 24.8, 3: 29.6, 4: 34.4, 5: 39.2 },
    mehrbetrag: 4.8,
  },

  // § 19 Abs. 3 WoGG
  zuschlagAb13: 65,

  // § 21 Nr. 1 WoGG
  bagatellgrenze: 10,
};
```

- [ ] **Step 5: Auswahl und Zugriff schreiben**

`src/rechtsstand/index.ts`:

```ts
import type { Rechtsstand } from "./typen";
import { WOGG_2025 } from "./wogg-2025";

export * from "./typen";
export { WOGG_2025 } from "./wogg-2025";

export const RECHTSSTAENDE: readonly Rechtsstand[] = [WOGG_2025];

export class RechtsstandFehlt extends Error {
  constructor(stichtag: string) {
    super(
      `Für den Stichtag ${stichtag} ist kein Rechtsstand eingebaut. ` +
        `Verfügbar: ${RECHTSSTAENDE.map((r) => `${r.gueltigAb} bis ${r.gueltigBis}`).join(", ")}.`,
    );
    this.name = "RechtsstandFehlt";
  }
}

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

// ISO-Daten lassen sich als Zeichenketten vergleichen.
export function rechtsstandFuer(stichtag: string): Rechtsstand {
  if (!ISO_DATUM.test(stichtag)) throw new RechtsstandFehlt(stichtag);
  const treffer = RECHTSSTAENDE.find((r) => r.gueltigAb <= stichtag && stichtag <= r.gueltigBis);
  if (!treffer) throw new RechtsstandFehlt(stichtag);
  return treffer;
}
```

`src/rechtsstand/zugriff.ts`:

```ts
import Decimal from "decimal.js";
import type { Koeffizienten, Mietstufe, Rechtsstand, StaffelBis5 } from "./typen";

// Über 12 Mitglieder wird mit den Werten für 12 gerechnet; die Mehrbeträge für Mitglied 13 ff.
// kommen über § 19 Abs. 3 dazu (Länderhinweis zu WoGVwV Nr. 19.31, Stand 12/2024).
export function zaehltAls(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`Haushaltsgröße muss eine ganze Zahl ab 1 sein, ist ${n}.`);
  return Math.min(n, 12);
}

function staffel<T>(tabelle: StaffelBis5<T>, n: number, wert: (t: T) => number): number {
  const k = zaehltAls(n);
  if (k <= 5) return wert(tabelle.bis5[k as 1 | 2 | 3 | 4 | 5]);
  return new Decimal(wert(tabelle.bis5[5])).plus(new Decimal(wert(tabelle.mehrbetrag)).times(k - 5)).toNumber();
}

export function hoechstbetrag(rs: Rechtsstand, n: number, stufe: Mietstufe): number {
  return staffel(rs.hoechstbetraege, n, (zeile) => zeile[stufe]);
}

export function klimakomponente(rs: Rechtsstand, n: number): number {
  return staffel(rs.klimakomponente, n, (x) => x);
}

export function heizkostenentlastung(rs: Rechtsstand, n: number): number {
  return staffel(rs.heizkostenentlastung, n, (x) => x);
}

export function koeffizienten(rs: Rechtsstand, n: number): Koeffizienten {
  const werte = rs.koeffizienten[zaehltAls(n)];
  if (!werte) throw new RangeError(`Keine Koeffizienten für ${n} Mitglieder.`);
  return werte;
}

export function mindestwerte(rs: Rechtsstand, n: number): { m: number; y: number } {
  const werte = rs.mindestwerte[zaehltAls(n)];
  if (!werte) throw new RangeError(`Keine Mindestwerte für ${n} Mitglieder.`);
  return werte;
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run test/rechtsstand && npx tsc --noEmit`
Expected: alle PASS, `tsc` ohne Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/rechtsstand test/rechtsstand
git commit -m "E1: Rechtsstand 2025 als Daten mit Tabellenzugriff"
```

---

### Task 3: Prüfskript Rechtsstand gegen gesetze-im-internet.de

**Files:**
- Create: `scripts/pruefe-rechtsstand.ts`

**Interfaces:**
- Consumes: `WOGG_2025` aus `src/rechtsstand`
- Produces: `npm run pruefe:rechtsstand`, Exit-Code 0 bei voller Übereinstimmung, 1 bei Abweichung, 2 bei unlesbarer Quelle

Das Skript ist bewusst kein Vitest-Test: Es braucht Netz und läuft von Hand vor jedem Rechtsstand-Wechsel.

- [ ] **Step 1: Skript schreiben**

`scripts/pruefe-rechtsstand.ts`:

```ts
// Vergleicht WOGG_2025 mit den Tabellen auf gesetze-im-internet.de.
// Aufruf: npm run pruefe:rechtsstand            (Vergleich)
//         npm run pruefe:rechtsstand -- --zeigen (gelesene Tabellenzeilen ausgeben)
import { WOGG_2025 } from "../src/rechtsstand";

const BASIS = "https://www.gesetze-im-internet.de/wogg/";
const zeigen = process.argv.includes("--zeigen");
let abweichungen = 0;

async function zeilen(seite: string): Promise<string[][]> {
  const antwort = await fetch(BASIS + seite);
  if (!antwort.ok) {
    console.error(`${seite}: HTTP ${antwort.status}`);
    process.exit(2);
  }
  const html = new TextDecoder("iso-8859-1").decode(await antwort.arrayBuffer());
  const ergebnis: string[][] = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const zellen = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      (m[1] ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
    );
    if (zellen.length > 0) ergebnis.push(zellen);
  }
  if (zeigen) {
    console.log(`--- ${seite}`);
    for (const z of ergebnis) console.log(z.join(" | "));
  }
  return ergebnis;
}

// "4,797E-4" → "0.0004797"; "1.139" → "1139"; "110,40" → "110.4"
function zahl(text: string): string {
  const t = text.replace(/\s/g, "");
  const exp = t.match(/^(-?[\d,]+)E(-?\d+)$/i);
  if (exp) return normal(Number(exp[1]!.replace(",", ".")) * 10 ** Number(exp[2]));
  return normal(Number(t.replace(/\./g, "").replace(",", ".")));
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

function zeileMitBeginn(tabelle: string[][], beginn: string): string[] | undefined {
  return tabelle.find((z) => z[0] === beginn);
}

// Anlage 1: Zeilen "1" bis "5" und die Mehrbetragszeile, Spalten I bis VII.
const a1 = await zeilen("anlage_1.html");
for (const n of [1, 2, 3, 4, 5] as const) {
  const z = zeileMitBeginn(a1, String(n));
  for (let s = 1; s <= 7; s++) {
    vergleiche(`Anlage 1, ${n} Mitgl., Stufe ${s}`, WOGG_2025.hoechstbetraege.bis5[n][s as 1], z?.[s]);
  }
}
const mehr = a1.find((z) => /weitere/i.test(z[0] ?? ""));
for (let s = 1; s <= 7; s++) vergleiche(`Anlage 1, Mehrbetrag, Stufe ${s}`, WOGG_2025.hoechstbetraege.mehrbetrag[s as 1], mehr?.[s]);

// Anlage 2: Zeilen "1" bis "12", Spalten a, b, c.
const a2 = await zeilen("anlage_2.html");
for (let n = 1; n <= 12; n++) {
  const z = zeileMitBeginn(a2, String(n));
  const k = WOGG_2025.koeffizienten[n]!;
  vergleiche(`Anlage 2, ${n} Mitgl., a`, k.a, z?.[1]);
  vergleiche(`Anlage 2, ${n} Mitgl., b`, k.b, z?.[2]);
  vergleiche(`Anlage 2, ${n} Mitgl., c`, k.c, z?.[3]);
}

// Anlage 3: Mindestwerte; erwartet eine Zeile je Haushaltsgröße mit M und Y.
const a3 = await zeilen("anlage_3.html");
for (let n = 1; n <= 12; n++) {
  const z = zeileMitBeginn(a3, String(n));
  const w = WOGG_2025.mindestwerte[n]!;
  vergleiche(`Anlage 3, ${n} Mitgl., M`, w.m, z?.[1]);
  vergleiche(`Anlage 3, ${n} Mitgl., Y`, w.y, z?.[2]);
}

// § 12 Abs. 6 und 7 stehen als Fließtext; geprüft wird, dass jeder Betrag im Text vorkommt.
const p12 = new TextDecoder("iso-8859-1").decode(await (await fetch(BASIS + "__12.html")).arrayBuffer()).replace(/<[^>]+>/g, " ");
const betraege = [
  ...Object.values(WOGG_2025.heizkostenentlastung.bis5).map(String),
  ...Object.values(WOGG_2025.klimakomponente.bis5).map(String),
  String(WOGG_2025.heizkostenentlastung.mehrbetrag),
  String(WOGG_2025.klimakomponente.mehrbetrag),
];
for (const b of betraege) {
  const deutsch = Number(b).toFixed(2).replace(".", ",");
  if (!p12.includes(deutsch)) {
    abweichungen++;
    console.error(`ABWEICHUNG § 12: Betrag ${deutsch} nicht im Gesetzestext gefunden`);
  }
}

if (abweichungen === 0) console.log("Rechtsstand 2025 stimmt mit gesetze-im-internet.de überein.");
process.exit(abweichungen === 0 ? 0 : 1);
```

- [ ] **Step 2: Tabellenstruktur ansehen**

Run: `npm run pruefe:rechtsstand -- --zeigen 2>&1 | head -80`
Expected: Tabellenzeilen der drei Anlagen sind lesbar. Weicht die Struktur ab (andere Spaltenreihenfolge, Kopfzeilen mit Haushaltsgröße als Spalte, Zeilenbeginn wie „1 Haushaltsmitglied“), die Zeilenauswahl in `zeileMitBeginn` bzw. die Spaltenindizes anpassen. Die Sollwerte in `WOGG_2025` werden dabei nicht verändert.

Ist die Mehrbetragszeile in Anlage 1 anders beschriftet, das Muster `/weitere/i` an die Beschriftung anpassen. Steht der Mindestwert in § 12 im Text ohne zweite Nachkommastelle (z. B. „96 Euro“), die Prüfung auf diesen Betrag auf die Ganzzahl-Schreibweise erweitern.

- [ ] **Step 3: Gegenprobe, dass das Skript Abweichungen findet**

Vorübergehend in `src/rechtsstand/wogg-2025.ts` den Wert `1: 361` in `1: 362` ändern.
Run: `npm run pruefe:rechtsstand; echo "exit=$?"`
Expected: `ABWEICHUNG Anlage 1, 1 Mitgl., Stufe 1` und `exit=1`.
Dann die Änderung zurücknehmen (`git checkout src/rechtsstand/wogg-2025.ts`).

- [ ] **Step 4: Vergleich laufen lassen**

Run: `npm run pruefe:rechtsstand; echo "exit=$?"`
Expected: `Rechtsstand 2025 stimmt mit gesetze-im-internet.de überein.` und `exit=0`. Jede gemeldete Abweichung an den Controller melden, nicht selbst die Daten ändern.

- [ ] **Step 5: Commit**

```bash
git add scripts/pruefe-rechtsstand.ts
git commit -m "E1: Prüfskript für den Rechtsstand gegen gesetze-im-internet.de"
```

---

### Task 4: Miete und Belastung (M)

**Files:**
- Create: `src/engine/dezimal.ts`, `src/engine/rechenweg.ts`, `src/engine/miete.ts`
- Test: `test/engine/miete.test.ts`, `test/fixtures/bmwsb-2025.ts`

**Interfaces:**
- Consumes: `Rechtsstand`, `Mietstufe`, `hoechstbetrag`, `klimakomponente`, `heizkostenentlastung` aus Task 2
- Produces:
  - `D` (Decimal-Klon mit Präzision 40, ROUND_HALF_UP) in `src/engine/dezimal.ts`
  - `interface Rechenschritt { schritt: string; norm: string; wert: string; erklaerung: string }` in `src/engine/rechenweg.ts`
  - `berechneMiete(e: MieteEingabe): MieteErgebnis` in `src/engine/miete.ts`
  - `class EingabeFehler extends Error { feld: string }` in `src/engine/rechenweg.ts`
  - Fixture `BMWSB_2025: BeispielFall[]` und `LAENDERFALL_14` in `test/fixtures/bmwsb-2025.ts`

- [ ] **Step 1: Fixture der amtlichen Beispiele anlegen**

`test/fixtures/bmwsb-2025.ts`:

```ts
import type { Mietstufe } from "../../src/rechtsstand";

// BMWSB, „Beispiele für die Berechnung des Wohngelds“, Stand 01.01.2025, 11 Fälle.
// https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/wohngeld-2025/rechenbeispiele-2025.pdf
// Alle Beträge monatlich. Nachgerechnet am 08.10.2026 mit Python decimal: alle 11 Ergebnisse exakt.
export interface BeispielFall {
  nr: number;
  ort: string;
  mietstufe: Mietstufe;
  haushaltsmitglieder: number;
  zuBeruecksichtigen: number;
  miete: number;
  y: string;
  m: string;
  wohngeld: number;
}

export const BMWSB_2025: BeispielFall[] = [
  { nr: 1, ort: "Jüterbog", mietstufe: 1, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, miete: 335, y: "1162.35", m: "445.40", wohngeld: 110 },
  { nr: 2, ort: "Ludwigshafen", mietstufe: 4, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, miete: 470, y: "1350.00", m: "580.40", wohngeld: 88 },
  { nr: 3, ort: "Leipzig, Stadt", mietstufe: 2, haushaltsmitglieder: 2, zuBeruecksichtigen: 2, miete: 480, y: "1589.70", m: "622.60", wohngeld: 166 },
  { nr: 4, ort: "Kreis Schleswig-Flensburg", mietstufe: 1, haushaltsmitglieder: 3, zuBeruecksichtigen: 3, miete: 750, y: "1638.00", m: "720.80", wohngeld: 320 },
  { nr: 5, ort: "Wiesbaden", mietstufe: 6, haushaltsmitglieder: 3, zuBeruecksichtigen: 3, miete: 700, y: "1728.00", m: "870.20", wohngeld: 372 },
  { nr: 6, ort: "München", mietstufe: 7, haushaltsmitglieder: 4, zuBeruecksichtigen: 4, miete: 1225, y: "2227.25", m: "1371.20", wohngeld: 691 },
  { nr: 7, ort: "Weimar", mietstufe: 3, haushaltsmitglieder: 4, zuBeruecksichtigen: 4, miete: 580, y: "1710.00", m: "777.80", wohngeld: 485 },
  { nr: 8, ort: "Friedrichshafen", mietstufe: 5, haushaltsmitglieder: 5, zuBeruecksichtigen: 5, miete: 870, y: "1853.25", m: "1095.40", wohngeld: 747 },
  { nr: 9, ort: "Attendorn", mietstufe: 2, haushaltsmitglieder: 6, zuBeruecksichtigen: 6, miete: 780, y: "3301.10", m: "1033.00", wohngeld: 343 },
  { nr: 10, ort: "Lübeck", mietstufe: 4, haushaltsmitglieder: 2, zuBeruecksichtigen: 1, miete: 570, y: "784.35", m: "356.30", wohngeld: 191 },
  { nr: 11, ort: "Neubrandenburg", mietstufe: 2, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, miete: 345, y: "561.35", m: "455.40", wohngeld: 342 },
];

// Länderhinweis zu WoGVwV Nr. 19.31, Stand 12/2024 (Herausgeber im PDF nicht lesbar, Belegstärke mittel).
// https://www.tacheles-sozialhilfe.de/files/Weisungen/WoGG/241202-hinweise-wogmehrals12hmer_geschwaerzt.pdf
// Veröffentlichte Zwischenwerte: z1 = 0,207069345; z2 = 970,7928566963; z3 = 1047,8071433038; z4 = 1204,9782147994.
// z3 und z4 sind mit keiner einheitlichen Rundungsregel nachbildbar (mit ROUND_HALF_UP: ...037 und ...993);
// das Endergebnis 1.205 € bzw. 1.335 € stimmt mit jeder Regel.
export const LAENDERFALL_14 = {
  mietstufe: 3 as Mietstufe,
  haushaltsmitglieder: 14,
  zuBeruecksichtigen: 14,
  miete: 1600,
  y: "4688.25",
  m: "2018.60",
  z1: "0.2070693450",
  z2: "970.7928566963",
  wohngeldFuer12: 1205,
  wohngeld: 1335,
};
```

- [ ] **Step 2: Failing test schreiben**

`test/engine/miete.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { berechneMiete } from "../../src/engine/miete";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { rechtsstandFuer } from "../../src/rechtsstand";
import { BMWSB_2025, LAENDERFALL_14 } from "../fixtures/bmwsb-2025";

const rechtsstand = rechtsstandFuer("2025-06-01");

describe("berechneMiete: amtliche Beispiele", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt M = ${fall.m}`, () => {
      const e = berechneMiete({
        rechtsstand,
        mietstufe: fall.mietstufe,
        haushaltsmitglieder: fall.haushaltsmitglieder,
        zuBeruecksichtigen: fall.zuBeruecksichtigen,
        mieteMonatlich: fall.miete,
      });
      expect(e.m.toFixed(2)).toBe(fall.m);
    });
  }

  it("Länderfall mit 14 Mitgliedern ergibt M = 2018.60", () => {
    const e = berechneMiete({
      rechtsstand,
      mietstufe: LAENDERFALL_14.mietstufe,
      haushaltsmitglieder: LAENDERFALL_14.haushaltsmitglieder,
      zuBeruecksichtigen: LAENDERFALL_14.zuBeruecksichtigen,
      mieteMonatlich: LAENDERFALL_14.miete,
    });
    expect(e.m.toFixed(2)).toBe("2018.60");
  });
});

describe("berechneMiete: Einzelregeln", () => {
  it("kappt auf Höchstbetrag plus Klimakomponente (§ 11 Abs. 1, Beispiel 6)", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 7, haushaltsmitglieder: 4, zuBeruecksichtigen: 4, mieteMonatlich: 1225 });
    expect(e.grenze.toFixed(2)).toBe("1173.40");
    expect(e.mieteBeruecksichtigt.toFixed(2)).toBe("1173.40");
    expect(e.heizkosten.toFixed(2)).toBe("197.80");
  });

  it("Mischhaushalt rechnet anteilig (§ 11 Abs. 3, Beispiel 10)", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 4, haushaltsmitglieder: 2, zuBeruecksichtigen: 1, mieteMonatlich: 570 });
    expect(e.anteil.toString()).toBe("0.5");
    expect(e.grenze.toFixed(2)).toBe("321.90");
    expect(e.mieteBeruecksichtigt.toFixed(2)).toBe("285.00");
    expect(e.heizkosten.toFixed(2)).toBe("71.30");
  });

  it("Mischhaushalt mit Drittel-Anteil bleibt exakt", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 3, haushaltsmitglieder: 3, zuBeruecksichtigen: 1, mieteMonatlich: 333.33 });
    // Miete 333,33 / 3 = 111,11; Heizkosten 170,20 / 3 = 56,7333…
    expect(e.mieteBeruecksichtigt.toFixed(10)).toBe("111.1100000000");
    expect(e.m.toFixed(10)).toBe("167.8433333333");
  });

  it("schreibt einen Rechenweg mit Normen", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 1, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, mieteMonatlich: 335 });
    const normen = e.schritte.map((s) => s.norm);
    expect(normen).toContain("§ 12 Abs. 1 WoGG, Anlage 1");
    expect(normen).toContain("§ 12 Abs. 7 WoGG");
    expect(normen).toContain("§ 12 Abs. 6 WoGG");
    expect(normen).toContain("§ 11 Abs. 1 WoGG");
  });
});

describe("berechneMiete: unmögliche Eingaben", () => {
  const basis = { rechtsstand, mietstufe: 1 as const, haushaltsmitglieder: 2, zuBeruecksichtigen: 2, mieteMonatlich: 400 };

  it.each([
    ["zuBeruecksichtigen", { zuBeruecksichtigen: 0 }],
    ["zuBeruecksichtigen", { zuBeruecksichtigen: 3 }],
    ["haushaltsmitglieder", { haushaltsmitglieder: 1.5 }],
    ["mietstufe", { mietstufe: 8 as any }],
    ["mieteMonatlich", { mieteMonatlich: -1 }],
    ["mieteMonatlich", { mieteMonatlich: Number.NaN }],
  ])("wirft EingabeFehler für Feld %s", (feld, aenderung) => {
    try {
      berechneMiete({ ...basis, ...aenderung });
      expect.unreachable("kein Fehler geworfen");
    } catch (fehler) {
      expect(fehler).toBeInstanceOf(EingabeFehler);
      expect((fehler as EingabeFehler).feld).toBe(feld);
    }
  });
});
```

- [ ] **Step 3: Test laufen lassen, er muss scheitern**

Run: `npx vitest run test/engine/miete.test.ts`
Expected: FAIL, Module fehlen.

- [ ] **Step 4: Gemeinsame Bausteine schreiben**

`src/engine/dezimal.ts`:

```ts
import Decimal from "decimal.js";

// Eigener Klon, damit keine globale Decimal-Einstellung verändert wird.
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dezimal = InstanceType<typeof D>;

// Anlage 3 Nr. 2 WoGG: Festkommazahlen mit zehn Nachkommastellen.
export function zehnStellen(x: Dezimal): Dezimal {
  return x.toDecimalPlaces(10, D.ROUND_HALF_UP);
}

// Anlage 3 Nr. 3 WoGG: unter 0,50 € abrunden, ab 0,50 € aufrunden.
export function aufVolleEuro(x: Dezimal): number {
  return x.toDecimalPlaces(0, D.ROUND_HALF_UP).toNumber();
}
```

`src/engine/rechenweg.ts`:

```ts
export interface Rechenschritt {
  schritt: string;
  norm: string;
  wert: string;
  erklaerung: string;
}

export class EingabeFehler extends Error {
  constructor(
    public readonly feld: string,
    meldung: string,
  ) {
    super(`${feld}: ${meldung}`);
    this.name = "EingabeFehler";
  }
}
```

- [ ] **Step 5: Miete schreiben**

`src/engine/miete.ts`:

```ts
import type { Mietstufe, Rechtsstand } from "../rechtsstand";
import { MIETSTUFEN } from "../rechtsstand";
import { heizkostenentlastung, hoechstbetrag, klimakomponente } from "../rechtsstand/zugriff";
import { D, type Dezimal } from "./dezimal";
import { EingabeFehler, type Rechenschritt } from "./rechenweg";

export interface MieteEingabe {
  rechtsstand: Rechtsstand;
  mietstufe: Mietstufe;
  haushaltsmitglieder: number; // alle Mitglieder, auch ausgeschlossene
  zuBeruecksichtigen: number; // Mitglieder ohne Ausschluss nach §§ 7, 8
  mieteMonatlich: number; // Bruttokaltmiete bzw. Belastung
}

export interface MieteErgebnis {
  anteil: Dezimal;
  hoechstbetrag: Dezimal;
  klimakomponente: Dezimal;
  heizkosten: Dezimal;
  grenze: Dezimal;
  mieteAnteilig: Dezimal;
  mieteBeruecksichtigt: Dezimal;
  m: Dezimal;
  schritte: Rechenschritt[];
}

function pruefe(e: MieteEingabe): void {
  if (!MIETSTUFEN.includes(e.mietstufe)) throw new EingabeFehler("mietstufe", "muss 1 bis 7 sein");
  if (!Number.isInteger(e.haushaltsmitglieder) || e.haushaltsmitglieder < 1)
    throw new EingabeFehler("haushaltsmitglieder", "muss eine ganze Zahl ab 1 sein");
  if (!Number.isInteger(e.zuBeruecksichtigen) || e.zuBeruecksichtigen < 1 || e.zuBeruecksichtigen > e.haushaltsmitglieder)
    throw new EingabeFehler("zuBeruecksichtigen", "muss zwischen 1 und der Zahl der Haushaltsmitglieder liegen");
  if (!Number.isFinite(e.mieteMonatlich) || e.mieteMonatlich < 0)
    throw new EingabeFehler("mieteMonatlich", "muss eine Zahl ab 0 sein");
}

// § 11 WoGG: zu berücksichtigende Miete oder Belastung.
// Die Beträge richten sich nach allen Haushaltsmitgliedern (§ 11 Abs. 3), angesetzt wird der Anteil
// der zu berücksichtigenden Mitglieder.
export function berechneMiete(e: MieteEingabe): MieteErgebnis {
  pruefe(e);
  const rs = e.rechtsstand;
  const n = e.haushaltsmitglieder;
  const anteil = new D(e.zuBeruecksichtigen).dividedBy(n);

  const hoechst = new D(hoechstbetrag(rs, n, e.mietstufe)).times(anteil);
  const klima = new D(klimakomponente(rs, n)).times(anteil);
  const heiz = new D(heizkostenentlastung(rs, n)).times(anteil);
  const grenze = hoechst.plus(klima);
  const mieteAnteilig = new D(e.mieteMonatlich).times(anteil);
  const beruecksichtigt = D.min(mieteAnteilig, grenze);
  const m = beruecksichtigt.plus(heiz);

  const anteilText = anteil.equals(1) ? "" : ` (Anteil ${e.zuBeruecksichtigen} von ${n})`;
  const schritte: Rechenschritt[] = [
    {
      schritt: "Höchstbetrag",
      norm: "§ 12 Abs. 1 WoGG, Anlage 1",
      wert: hoechst.toFixed(2),
      erklaerung: `Mietstufe ${e.mietstufe}, ${n} Haushaltsmitglieder${anteilText}`,
    },
    { schritt: "Klimakomponente", norm: "§ 12 Abs. 7 WoGG", wert: klima.toFixed(2), erklaerung: `Zuschlag zum Höchstbetrag${anteilText}` },
    {
      schritt: "Berücksichtigte Miete",
      norm: "§ 11 Abs. 1 WoGG",
      wert: beruecksichtigt.toFixed(2),
      erklaerung: mieteAnteilig.greaterThan(grenze)
        ? `Miete ${mieteAnteilig.toFixed(2)} € auf Höchstbetrag plus Klimakomponente begrenzt`
        : `Miete ${mieteAnteilig.toFixed(2)} € liegt unter der Grenze von ${grenze.toFixed(2)} €`,
    },
    { schritt: "Entlastung Heizkosten", norm: "§ 12 Abs. 6 WoGG", wert: heiz.toFixed(2), erklaerung: `Pauschaler Zuschlag${anteilText}` },
    { schritt: "M", norm: "§ 11 Abs. 1 WoGG", wert: m.toFixed(2), erklaerung: "Berücksichtigte Miete plus Entlastung bei den Heizkosten" },
  ];

  return {
    anteil,
    hoechstbetrag: hoechst,
    klimakomponente: klima,
    heizkosten: heiz,
    grenze,
    mieteAnteilig,
    mieteBeruecksichtigt: beruecksichtigt,
    m,
    schritte,
  };
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run test/engine/miete.test.ts && npx tsc --noEmit`
Expected: alle PASS (11 Beispiele, Länderfall, 4 Einzelregeln, 6 Fehlerfälle), `tsc` ohne Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/engine test/engine/miete.test.ts test/fixtures
git commit -m "E1: Miete und Belastung nach § 11 WoGG mit Mischhaushalt"
```

---

### Task 5: Formel nach § 19 WoGG

**Files:**
- Create: `src/engine/formel.ts`
- Modify: `README.md` (Abschnitt „Rechenregeln“)
- Test: `test/engine/formel.test.ts`

**Interfaces:**
- Consumes: `D`, `Dezimal`, `zehnStellen`, `aufVolleEuro` aus `src/engine/dezimal.ts`; `Rechenschritt`, `EingabeFehler` aus `src/engine/rechenweg.ts`; `koeffizienten`, `mindestwerte`, `zaehltAls` aus Task 2; Fixtures aus Task 4
- Produces: `berechneFormel(e: FormelEingabe): FormelErgebnis` mit

```ts
interface FormelEingabe { rechtsstand: Rechtsstand; zuBeruecksichtigen: number; m: Dezimal | string | number; y: Dezimal | string | number }
interface FormelErgebnis {
  mEingesetzt: Dezimal; yEingesetzt: Dezimal;
  z1: Dezimal; z2: Dezimal; z3: Dezimal; z4: Dezimal;
  grundbetrag: number;      // z4 auf volle Euro, nie negativ
  zuschlag: number;         // § 19 Abs. 3
  wohngeld: number;         // nach Bagatellgrenze, ganze Euro
  unterBagatellgrenze: boolean;
  schritte: Rechenschritt[];
}
```

- [ ] **Step 1: Failing test schreiben**

`test/engine/formel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aufVolleEuro, D } from "../../src/engine/dezimal";
import { berechneFormel } from "../../src/engine/formel";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { rechtsstandFuer } from "../../src/rechtsstand";
import { BMWSB_2025, LAENDERFALL_14 } from "../fixtures/bmwsb-2025";

const rechtsstand = rechtsstandFuer("2025-06-01");

describe("berechneFormel: amtliche Beispiele", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt ${fall.wohngeld} €`, () => {
      const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: fall.zuBeruecksichtigen, m: fall.m, y: fall.y });
      expect(e.wohngeld).toBe(fall.wohngeld);
    });
  }

  it("Länderfall: 12er-Rechnung, dann 2 × 65 € Zuschlag", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: LAENDERFALL_14.m, y: LAENDERFALL_14.y });
    expect(e.z1.toFixed(10)).toBe(LAENDERFALL_14.z1);
    expect(e.z2.toFixed(10)).toBe(LAENDERFALL_14.z2);
    expect(e.grundbetrag).toBe(LAENDERFALL_14.wohngeldFuer12);
    expect(e.zuschlag).toBe(130);
    expect(e.wohngeld).toBe(LAENDERFALL_14.wohngeld);
  });

  it("Zwischenwerte Beispiel 1 auf zehn Stellen", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1162.35" });
    expect(e.z1.toFixed(10)).toBe("0.3010822600");
    expect(e.z2.toFixed(10)).toBe("349.9629649110");
    expect(e.z3.toFixed(10)).toBe("95.4370350890");
    expect(e.z4.toFixed(10)).toBe("109.7525903524");
  });
});

describe("berechneFormel: Mindestwerte (Anlage 3 Nr. 1)", () => {
  it("Y unter dem Mindestwert wird durch ihn ersetzt", () => {
    const klein = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "100" });
    const mindest = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "396" });
    expect(klein.yEingesetzt.toString()).toBe("396");
    expect(klein.wohngeld).toBe(mindest.wohngeld);
    expect(klein.wohngeld).toBe(389);
  });

  it("M unter dem Mindestwert wird durch ihn ersetzt", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "40", y: "396" });
    expect(e.mEingesetzt.toString()).toBe("54");
    expect(e.wohngeld).toBe(25);
  });
});

describe("berechneFormel: Bagatellgrenze (§ 21 Nr. 1)", () => {
  it("genau 10 € werden gezahlt (z4 = 9,5284… gerundet 10)", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1405.50" });
    expect(e.grundbetrag).toBe(10);
    expect(e.wohngeld).toBe(10);
    expect(e.unterBagatellgrenze).toBe(false);
  });

  it("9 € werden nicht gezahlt", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1405.75" });
    expect(e.grundbetrag).toBe(9);
    expect(e.wohngeld).toBe(0);
    expect(e.unterBagatellgrenze).toBe(true);
  });

  it("negatives z4 ergibt 0 €", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "2500" });
    expect(e.z4.toFixed(10)).toBe("-510.3078425000");
    expect(e.grundbetrag).toBe(0);
    expect(e.wohngeld).toBe(0);
  });
});

describe("berechneFormel: über 12 Mitglieder (§ 19 Abs. 3)", () => {
  it("keine Zuschläge, wenn die 12er-Rechnung nichts ergibt", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "2018.60", y: "20000" });
    expect(e.grundbetrag).toBe(0);
    expect(e.zuschlag).toBe(0);
    expect(e.wohngeld).toBe(0);
  });

  it("Zuschläge höchstens bis zur Höhe von M", () => {
    // 12er-Rechnung mit M = 298 und Y = 5000: z4 = 207,6405500000, Grundbetrag 208 €.
    // 2 Zuschläge à 65 € ergäben 338 € > M, also nur 90 € Zuschlag.
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "298", y: "5000" });
    expect(e.grundbetrag).toBe(208);
    expect(e.zuschlag).toBe(90);
    expect(e.wohngeld).toBe(298);
  });

  it("Grundbetrag über M bleibt, aber ohne Zuschlag (Recht 2025 kennt keine Kappung auf M)", () => {
    // Negatives a für 12 Mitglieder: z4 = 417,0600893950 > M = 298.
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "298", y: "2943" });
    expect(e.grundbetrag).toBe(417);
    expect(e.zuschlag).toBe(0);
    expect(e.wohngeld).toBe(417);
  });
});

describe("Rundung auf volle Euro (Anlage 3 Nr. 3)", () => {
  it("unter 0,50 ab, ab 0,50 auf", () => {
    expect(aufVolleEuro(new D("109.4999999999"))).toBe(109);
    expect(aufVolleEuro(new D("109.5"))).toBe(110);
  });
});

describe("berechneFormel: unmögliche Eingaben", () => {
  it.each([
    ["y", { y: "-1" }],
    ["m", { m: "-1" }],
    ["y", { y: "abc" }],
    ["zuBeruecksichtigen", { zuBeruecksichtigen: 0 }],
  ])("wirft EingabeFehler für Feld %s", (feld, aenderung) => {
    try {
      berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1162.35", ...aenderung });
      expect.unreachable("kein Fehler geworfen");
    } catch (fehler) {
      expect(fehler).toBeInstanceOf(EingabeFehler);
      expect((fehler as EingabeFehler).feld).toBe(feld);
    }
  });
});
```

Alle Sollwerte dieser Datei sind am 08.10.2026 mit Python `decimal` (ROUND_HALF_UP je Schritt) nachgerechnet. Weicht die Implementierung ab, den Fall an den Controller melden, nicht den Test anpassen.

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run test/engine/formel.test.ts`
Expected: FAIL, `src/engine/formel` fehlt.

- [ ] **Step 3: Formel schreiben**

`src/engine/formel.ts`:

```ts
import type { Rechtsstand } from "../rechtsstand";
import { koeffizienten, mindestwerte, zaehltAls } from "../rechtsstand/zugriff";
import { aufVolleEuro, D, type Dezimal, zehnStellen } from "./dezimal";
import { EingabeFehler, type Rechenschritt } from "./rechenweg";

export interface FormelEingabe {
  rechtsstand: Rechtsstand;
  zuBeruecksichtigen: number;
  m: Dezimal | string | number;
  y: Dezimal | string | number;
}

export interface FormelErgebnis {
  mEingesetzt: Dezimal;
  yEingesetzt: Dezimal;
  z1: Dezimal;
  z2: Dezimal;
  z3: Dezimal;
  z4: Dezimal;
  grundbetrag: number;
  zuschlag: number;
  wohngeld: number;
  unterBagatellgrenze: boolean;
  schritte: Rechenschritt[];
}

function alsDezimal(feld: string, wert: Dezimal | string | number): Dezimal {
  let d: Dezimal;
  try {
    d = new D(wert);
  } catch {
    throw new EingabeFehler(feld, `keine Zahl: ${String(wert)}`);
  }
  if (!d.isFinite() || d.isNegative()) throw new EingabeFehler(feld, "muss eine Zahl ab 0 sein");
  return d;
}

// § 19 WoGG mit Rechenschritten und Rundung nach Anlage 3.
export function berechneFormel(e: FormelEingabe): FormelErgebnis {
  if (!Number.isInteger(e.zuBeruecksichtigen) || e.zuBeruecksichtigen < 1)
    throw new EingabeFehler("zuBeruecksichtigen", "muss eine ganze Zahl ab 1 sein");
  const mRoh = alsDezimal("m", e.m);
  const yRoh = alsDezimal("y", e.y);
  const rs = e.rechtsstand;
  const n = e.zuBeruecksichtigen;
  const k = zaehltAls(n);

  const { a, b, c } = koeffizienten(rs, k);
  const mindest = mindestwerte(rs, k);
  const M = D.max(mRoh, mindest.m);
  const Y = D.max(yRoh, mindest.y);

  const z1 = zehnStellen(new D(a).plus(zehnStellen(new D(b).times(M))).plus(zehnStellen(new D(c).times(Y))));
  const z2 = zehnStellen(z1.times(Y));
  const z3 = zehnStellen(M.minus(z2));
  const z4 = zehnStellen(new D("1.15").times(z3));
  const grundbetrag = Math.max(0, aufVolleEuro(z4));

  // § 19 Abs. 3: Zuschlag ab dem 13. Mitglied, höchstens bis zur Höhe von M.
  // Annahme: Der Zuschlag erhöht nur ein positives Wohngeld; ergibt die 12er-Rechnung 0 €, gibt es keinen Zuschlag.
  let zuschlag = 0;
  if (n > 12 && grundbetrag > 0) {
    const obergrenze = M.toDecimalPlaces(0, D.ROUND_DOWN).toNumber();
    zuschlag = Math.max(0, Math.min((n - 12) * rs.zuschlagAb13, obergrenze - grundbetrag));
  }
  const vorBagatell = grundbetrag + zuschlag;
  const unterBagatellgrenze = vorBagatell < rs.bagatellgrenze;
  const wohngeld = unterBagatellgrenze ? 0 : vorBagatell;

  const schritte: Rechenschritt[] = [
    {
      schritt: "Eingesetzte Werte",
      norm: "Anlage 3 Nr. 1 WoGG",
      wert: `M = ${M.toFixed(2)}, Y = ${Y.toFixed(2)}`,
      erklaerung: `Mindestwerte für ${k} Mitglieder: M ${mindest.m} €, Y ${mindest.y} €`,
    },
    { schritt: "z1 = a + b·M + c·Y", norm: "Anlage 3 Nr. 2 WoGG", wert: z1.toFixed(10), erklaerung: `a = ${a}, b = ${b}, c = ${c}` },
    { schritt: "z2 = z1·Y", norm: "Anlage 3 Nr. 2 WoGG", wert: z2.toFixed(10), erklaerung: "" },
    { schritt: "z3 = M − z2", norm: "Anlage 3 Nr. 2 WoGG", wert: z3.toFixed(10), erklaerung: "" },
    { schritt: "z4 = 1,15·z3", norm: "§ 19 Abs. 1 WoGG", wert: z4.toFixed(10), erklaerung: "Ungerundetes Wohngeld" },
    { schritt: "Gerundet", norm: "Anlage 3 Nr. 3 WoGG", wert: String(grundbetrag), erklaerung: "Kaufmännisch auf volle Euro, negatives Ergebnis zählt als 0" },
  ];
  if (n > 12) {
    schritte.push({
      schritt: "Zuschlag ab dem 13. Mitglied",
      norm: "§ 19 Abs. 3 WoGG",
      wert: String(zuschlag),
      erklaerung: `${n - 12} × ${rs.zuschlagAb13} €, höchstens bis zur Höhe von M`,
    });
  }
  schritte.push({
    schritt: "Wohngeld",
    norm: "§ 21 Nr. 1 WoGG",
    wert: String(wohngeld),
    erklaerung: unterBagatellgrenze ? `Unter ${rs.bagatellgrenze} € besteht kein Anspruch` : "Monatliches Wohngeld",
  });

  return { mEingesetzt: M, yEingesetzt: Y, z1, z2, z3, z4, grundbetrag, zuschlag, wohngeld, unterBagatellgrenze, schritte };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle Tests aller Dateien PASS, `tsc` ohne Fehler.

- [ ] **Step 5: README um Rechenregeln ergänzen**

In `README.md` nach dem Abschnitt „Rechtsstand“ einfügen:

```markdown
## Rechenregeln

- Gerechnet wird nach § 19 WoGG in den Schritten der Anlage 3. Die Zwischenwerte z1 bis z4 rundet der Rechner kaufmännisch auf zehn Nachkommastellen. Ob die zehnte Stelle gerundet oder abgeschnitten wird, regelt das Gesetz nicht. Alle elf Rechenbeispiele des BMWSB (Stand 01.01.2025) ergeben mit beiden Regeln denselben Betrag.
- Über 12 Haushaltsmitglieder rechnet der Rechner mit den Werten für 12 und schlägt je weiterem Mitglied 65 € zu, höchstens bis zur Höhe der berücksichtigten Miete. Ergibt die Rechnung für 12 Mitglieder kein Wohngeld, gibt es auch keine Zuschläge. Das ist eine Annahme, das Gesetz regelt diesen Fall nicht ausdrücklich.
```

- [ ] **Step 6: Commit**

```bash
git add src/engine/formel.ts test/engine/formel.test.ts README.md
git commit -m "E1: Formel nach § 19 WoGG mit Mindestwerten, Zuschlag und Bagatellgrenze"
```

---

### Task 6: Gegentests (Mutationen müssen rot werden)

**Files:**
- Create: `scripts/gegentest.mjs`

**Interfaces:**
- Consumes: die Dateien aus Task 2, 4 und 5
- Produces: `npm run gegentest`, Exit-Code 0, wenn jede Mutation mindestens einen Test rot macht

- [ ] **Step 1: Skript schreiben**

`scripts/gegentest.mjs`:

```js
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
```

- [ ] **Step 2: Skript laufen lassen**

Run: `npm run gegentest; echo "exit=$?"`
Expected: `12 rot, 0 grün von 12 Mutationen.` und `exit=0`.
Bleibt eine Mutation grün, fehlt ein Test für diese Stelle: Test in der zuständigen Testdatei ergänzen (nicht die Mutation streichen), dann erneut laufen lassen.

- [ ] **Step 3: Nachweis, dass das Skript Grün erkennt**

Vorübergehend eine wirkungslose Mutation an den Anfang von `MUTATIONEN` setzen:
`{ name: "Kommentar", datei: "src/engine/formel.ts", alt: "// § 19 WoGG mit", neu: "// §19 WoGG mit" },`
Run: `npm run gegentest; echo "exit=$?"`
Expected: `GRÜN (schlecht): Kommentar` und `exit=1`. Danach den Eintrag wieder entfernen und `git diff scripts/gegentest.mjs` prüfen: nur die beabsichtigte Datei.

- [ ] **Step 4: Gesamtlauf und Commit**

Run: `npx vitest run && npx tsc --noEmit && npm run gegentest; echo "exit=$?"`
Expected: alle Tests PASS, `exit=0`.

```bash
git add scripts/gegentest.mjs
git commit -m "E1: Gegentests, jede Mutation muss die Suite rot machen"
```
