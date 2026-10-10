// Nutzungszähler: zählt nur Tool-Name und Tag, nie Eingaben. Reine Funktionen plus dünne KV-/fetch-Anbindung.
export const BEKANNTE_TOOLS = ["wohngeld_berechnen", "mietstufe_finden"] as const;
export const PRUEFHEADER = "x-wohngeld-pruefung";
const TTL_SEKUNDEN = 90 * 24 * 60 * 60;

// Schlanke Schnittstellen statt @cloudflare/workers-types.
export interface KvSpeicher {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}
export interface Env {
  NUTZUNG?: KvSpeicher;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  OPENAI_APPS_CHALLENGE?: string;
}
export interface AusfuehrungsKontext {
  waitUntil(promise: Promise<unknown>): void;
}

/** Zieht aus einem JSON-RPC-Body (einzeln oder Batch) die Namen aller tools/call-Aufrufe. Unbekannte Namen werden `unbekannt`. */
export function toolNamenAusBody(body: unknown): string[] {
  const nachrichten = Array.isArray(body) ? body : [body];
  const namen: string[] = [];
  for (const n of nachrichten) {
    if (typeof n !== "object" || n === null) continue;
    const { method, params } = n as { method?: unknown; params?: unknown };
    if (method !== "tools/call") continue;
    const name = typeof params === "object" && params !== null ? (params as { name?: unknown }).name : undefined;
    namen.push(typeof name === "string" && (BEKANNTE_TOOLS as readonly string[]).includes(name) ? name : "unbekannt");
  }
  return namen;
}

export function tagUtc(zeit: Date): string {
  return zeit.toISOString().slice(0, 10);
}

export const praefix = (tag: string) => `n:${tag}:`;
export const schluessel = (tag: string, tool: string) => `${praefix(tag)}${tool}`;

/**
 * Zählt jeden Namen um eins hoch. Lesen und Schreiben sind nicht atomar: bei gleichzeitigen Aufrufen
 * können einzelne Zählungen verloren gehen. Für eine Tagesstatistik ist das hinnehmbar.
 */
export async function zaehle(kv: KvSpeicher, namen: string[], zeit: Date): Promise<void> {
  const tag = tagUtc(zeit);
  for (const name of namen) {
    const key = schluessel(tag, name);
    const alt = Number((await kv.get(key)) ?? "0");
    await kv.put(key, String((Number.isFinite(alt) ? alt : 0) + 1), { expirationTtl: TTL_SEKUNDEN });
  }
}

/** Liest den Body einer POST-Anfrage an /mcp und zählt die tools/call darin. Wirft nie. */
export async function zaehleAnfrage(kopie: Request, kv: KvSpeicher, zeit: Date): Promise<void> {
  try {
    if (kopie.headers.get(PRUEFHEADER) === "1") return;
    const namen = toolNamenAusBody(await kopie.json());
    if (namen.length > 0) await zaehle(kv, namen, zeit);
  } catch {
    // Zählfehler dürfen die Antwort nie beeinflussen.
  }
}

export function formatiereMeldung(tag: string, summen: Record<string, number>): string {
  const [j, m, t] = tag.split("-");
  const gesamt = Object.values(summen).reduce((a, b) => a + b, 0);
  const teile = Object.entries(summen)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, n]) => `${name} ${n}`)
    .join(", ");
  return `Wohngeld-Rechner, ${t}.${m}.${j}: ${gesamt} Aufrufe (${teile})`;
}

/** Liest die Zähler eines Tages (UTC). */
export async function liesTag(kv: KvSpeicher, tag: string): Promise<Record<string, number>> {
  const summen: Record<string, number> = {};
  const p = praefix(tag);
  let cursor: string | undefined;
  do {
    const seite = await kv.list(cursor === undefined ? { prefix: p } : { prefix: p, cursor });
    for (const { name } of seite.keys) {
      const n = Number((await kv.get(name)) ?? "0");
      if (Number.isFinite(n) && n > 0) summen[name.slice(p.length)] = n;
    }
    cursor = seite.list_complete ? undefined : seite.cursor;
  } while (cursor !== undefined);
  return summen;
}

/** Cron-Handler: meldet den Vortag per Telegram, aber nur, wenn es Aufrufe gab und beide Secrets gesetzt sind. */
export async function meldeVortag(
  env: Env,
  jetzt: Date,
  sende: (url: string, init: RequestInit) => Promise<unknown> = fetch,
): Promise<void> {
  if (!env.NUTZUNG || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const gestern = tagUtc(new Date(jetzt.getTime() - 24 * 60 * 60 * 1000));
  const summen = await liesTag(env.NUTZUNG, gestern);
  if (Object.values(summen).reduce((a, b) => a + b, 0) === 0) return;
  await sende(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: formatiereMeldung(gestern, summen) }),
  });
}
