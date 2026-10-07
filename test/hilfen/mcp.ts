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
