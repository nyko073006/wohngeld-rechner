import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { type Env, type KvSpeicher, meldeVortag, toolNamenAusBody } from "../../src/server/nutzung";
import { INITIALIZE_PARAMS, rufeMcp } from "../hilfen/mcp";

class FakeKv implements KvSpeicher {
  daten = new Map<string, string>();
  ttl = new Map<string, number | undefined>();
  async get(k: string) {
    return this.daten.get(k) ?? null;
  }
  async put(k: string, v: string, o?: { expirationTtl?: number }) {
    this.daten.set(k, v);
    this.ttl.set(k, o?.expirationTtl);
  }
  async list({ prefix }: { prefix: string }) {
    return { keys: [...this.daten.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
  }
}

function mitKontext() {
  const kv = new FakeKv();
  const wartend: Promise<unknown>[] = [];
  const env: Env = { NUTZUNG: kv };
  const ctx = { waitUntil: (p: Promise<unknown>) => void wartend.push(p) };
  const fetchFn = (r: Request) => worker.fetch(r, env, ctx);
  return { kv, fetchFn, fertig: () => Promise.all(wartend) };
}

const heute = () => new Date().toISOString().slice(0, 10);
const AUFRUF = { name: "mietstufe_finden", arguments: { gemeinde: "Monheim", land: "NRW" } };

describe("Nutzungszähler beim Aufruf", () => {
  it("zählt einen einzelnen tools/call unter Tag und Tool-Name", async () => {
    const { kv, fetchFn, fertig } = mitKontext();
    await rufeMcp(fetchFn, "tools/call", AUFRUF);
    await fertig();
    expect([...kv.daten]).toEqual([[`n:${heute()}:mietstufe_finden`, "1"]]);
    expect(kv.ttl.get(`n:${heute()}:mietstufe_finden`)).toBe(90 * 24 * 60 * 60);
  });

  it("zählt wiederholt hoch und speichert keine Eingaben", async () => {
    const { kv, fetchFn, fertig } = mitKontext();
    await rufeMcp(fetchFn, "tools/call", AUFRUF);
    await rufeMcp(fetchFn, "tools/call", AUFRUF);
    await fertig();
    expect(kv.daten.get(`n:${heute()}:mietstufe_finden`)).toBe("2");
    expect(JSON.stringify([...kv.daten])).not.toContain("Monheim");
  });

  it("zählt Batch-Aufrufe einzeln und fasst unbekannte Namen zusammen", () => {
    const body = [
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "wohngeld_berechnen" } },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "mietstufe_finden" } },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "geheim­er" } },
      { jsonrpc: "2.0", id: 4, method: "tools/list" },
    ];
    expect(toolNamenAusBody(body)).toEqual(["wohngeld_berechnen", "mietstufe_finden", "unbekannt"]);
  });

  it("Batch über den Worker wird gezählt", async () => {
    const { kv, fetchFn, fertig } = mitKontext();
    const r = await fetchFn(
      new Request("https://test.local/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
        body: JSON.stringify([
          { jsonrpc: "2.0", id: 1, method: "tools/call", params: AUFRUF },
          { jsonrpc: "2.0", id: 2, method: "tools/call", params: AUFRUF },
        ]),
      }),
    );
    await r.text();
    await fertig();
    expect(kv.daten.get(`n:${heute()}:mietstufe_finden`)).toBe("2");
  });

  it("initialize und tools/list werden nicht gezählt", async () => {
    const { kv, fetchFn, fertig } = mitKontext();
    await rufeMcp(fetchFn, "initialize", INITIALIZE_PARAMS);
    await rufeMcp(fetchFn, "tools/list");
    await fertig();
    expect(kv.daten.size).toBe(0);
  });

  it("der Prüfheader verhindert die Zählung", async () => {
    const { kv, fetchFn, fertig } = mitKontext();
    await rufeMcp((r) => {
      r.headers.set("x-wohngeld-pruefung", "1");
      return fetchFn(r);
    }, "tools/call", AUFRUF);
    await fertig();
    expect(kv.daten.size).toBe(0);
  });

  it("kaputtes JSON: Antwort normal, nichts gezählt", async () => {
    const { kv, fetchFn, fertig } = mitKontext();
    const ohne = await worker.fetch(new Request("https://test.local/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: "{kaputt" }));
    const mit = await fetchFn(new Request("https://test.local/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: "{kaputt" }));
    await fertig();
    expect(mit.status).toBe(ohne.status);
    expect(await mit.text()).toBe(await ohne.text());
    expect(kv.daten.size).toBe(0);
  });

  it("KV-Fehler beeinflusst die Antwort nicht", async () => {
    const kaputt: KvSpeicher = { ...new FakeKv(), get: async () => { throw new Error("kv"); }, put: async () => { throw new Error("kv"); }, list: async () => ({ keys: [], list_complete: true }) };
    const wartend: Promise<unknown>[] = [];
    const r = await rufeMcp((q) => worker.fetch(q, { NUTZUNG: kaputt }, { waitUntil: (p) => void wartend.push(p) }), "tools/call", AUFRUF);
    await expect(Promise.all(wartend)).resolves.toBeDefined();
    expect(r.status).toBe(200);
    expect(r.body.result.structuredContent.status).toBe("eindeutig");
  });

  it("ohne env und ctx läuft alles, nichts wird gezählt", async () => {
    const r = await rufeMcp((q) => worker.fetch(q), "tools/call", AUFRUF);
    expect(r.status).toBe(200);
  });
});

describe("Tagesmeldung (scheduled)", () => {
  const JETZT = new Date("2026-10-10T06:00:00Z");
  function aufbau(daten: Record<string, string>, secrets: boolean | "nurToken" | "nurChat" = true) {
    const kv = new FakeKv();
    for (const [k, v] of Object.entries(daten)) kv.daten.set(k, v);
    const env: Env = { NUTZUNG: kv, ...(secrets === true || secrets === "nurToken" ? { TELEGRAM_BOT_TOKEN: "tok" } : {}), ...(secrets === true || secrets === "nurChat" ? { TELEGRAM_CHAT_ID: "42" } : {}) };
    const gesendet: { url: string; init: RequestInit }[] = [];
    const sende = async (url: string, init: RequestInit) => void gesendet.push({ url, init });
    return { env, gesendet, sende };
  }

  it("Vortag ohne Aufrufe: nichts senden (Heute zählt nicht)", async () => {
    const { env, gesendet, sende } = aufbau({ "n:2026-10-10:mietstufe_finden": "5" });
    await meldeVortag(env, JETZT, sende);
    expect(gesendet).toHaveLength(0);
  });

  it("Vortag mit Aufrufen: genau eine Nachricht mit richtiger Summe", async () => {
    const { env, gesendet, sende } = aufbau({
      "n:2026-10-09:wohngeld_berechnen": "2",
      "n:2026-10-09:mietstufe_finden": "1",
      "n:2026-10-08:mietstufe_finden": "9",
    });
    await meldeVortag(env, JETZT, sende);
    expect(gesendet).toHaveLength(1);
    expect(gesendet[0]!.url).toBe("https://api.telegram.org/bottok/sendMessage");
    const body = JSON.parse(gesendet[0]!.init.body as string);
    expect(body.chat_id).toBe("42");
    expect(body.text).toBe("Wohngeld-Rechner, 09.10.2026: 3 Aufrufe (mietstufe_finden 1, wohngeld_berechnen 2)");
  });

  it("fehlendes Secret: nichts senden, kein Absturz", async () => {
    const { env, gesendet, sende } = aufbau({ "n:2026-10-09:mietstufe_finden": "1" }, false);
    await expect(meldeVortag(env, JETZT, sende)).resolves.toBeUndefined();
    expect(gesendet).toHaveLength(0);
  });

  it("nur ein Secret gesetzt: nichts senden", async () => {
    for (const teil of ["nurToken", "nurChat"] as const) {
      const { env, gesendet, sende } = aufbau({ "n:2026-10-09:mietstufe_finden": "1" }, teil);
      await meldeVortag(env, JETZT, sende);
      expect(gesendet, teil).toHaveLength(0);
    }
  });

  it("scheduled-Handler des Workers sendet über waitUntil", async () => {
    const { env } = aufbau({});
    const wartend: Promise<unknown>[] = [];
    await worker.scheduled({ scheduledTime: JETZT.getTime() }, env, { waitUntil: (p) => void wartend.push(p) });
    await expect(Promise.all(wartend)).resolves.toBeDefined();
  });
});
