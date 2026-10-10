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
