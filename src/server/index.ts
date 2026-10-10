import { createMcpHandler } from "@modelcontextprotocol/server";
import { seiteFuer } from "./seiten";
import { erzeugeServer } from "./server";

const handler = createMcpHandler(erzeugeServer);

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === "GET") {
      const seite = seiteFuer(pathname);
      if (seite) return seite;
    }
    if (pathname !== "/mcp") return new Response("Not found", { status: 404 });
    return handler.fetch(request);
  },
};
