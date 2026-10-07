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
