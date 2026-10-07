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
