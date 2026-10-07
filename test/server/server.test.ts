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
