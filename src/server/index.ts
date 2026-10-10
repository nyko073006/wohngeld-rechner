import { createMcpHandler } from "@modelcontextprotocol/server";
import { type AusfuehrungsKontext, type Env, meldeVortag, zaehleAnfrage } from "./nutzung";
import { challengeFuer, seiteFuer } from "./seiten";
import { erzeugeServer } from "./server";

const handler = createMcpHandler(erzeugeServer);

export default {
  async fetch(request: Request, env?: Env, ctx?: AusfuehrungsKontext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === "GET") {
      const seite = seiteFuer(pathname);
      if (seite) return seite;
      if (pathname === "/.well-known/openai-apps-challenge") {
        const antwort = challengeFuer(env?.OPENAI_APPS_CHALLENGE);
        if (antwort) return antwort;
      }
    }
    if (pathname !== "/mcp") return new Response("Not found", { status: 404 });
    if (request.method === "POST" && env?.NUTZUNG && ctx) {
      try {
        // Kopie vor dem Handler ziehen, sonst ist der Body verbraucht.
        ctx.waitUntil(zaehleAnfrage(request.clone(), env.NUTZUNG, new Date()));
      } catch {
        // Zählen darf die Antwort nie beeinflussen.
      }
    }
    return handler.fetch(request);
  },

  async scheduled(event: { scheduledTime: number }, env: Env, ctx: AusfuehrungsKontext): Promise<void> {
    ctx.waitUntil(meldeVortag(env, new Date(event.scheduledTime)).catch(() => undefined));
  },
};
