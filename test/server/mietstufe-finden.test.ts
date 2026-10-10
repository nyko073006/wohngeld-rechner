import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { alsAusgabe } from "../../src/server/mietstufe-finden";
import type { MietstufenTreffer } from "../../src/mietstufen/typen";
import { rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);
const rufe = (args: Record<string, unknown>) => rufeMcp(fetchFn, "tools/call", { name: "mietstufe_finden", arguments: args });

describe("Tool mietstufe_finden", () => {
  it("findet Esslingen am Neckar eindeutig", async () => {
    const { body } = await rufe({ gemeinde: "Esslingen am Neckar" });
    expect(body.result.isError).toBeFalsy();
    expect(body.result.structuredContent.status).toBe("eindeutig");
    expect(body.result.structuredContent.treffer).toMatchObject({ land: "Baden-Württemberg", mietstufe: 5 });
    expect(JSON.parse(body.result.content[0].text)).toEqual(body.result.structuredContent);
  });

  it("„Neustadt“ ist mehrdeutig, ohne gemeinsame Stufe", async () => {
    const { body } = await rufe({ gemeinde: "Neustadt" });
    const a = body.result.structuredContent;
    expect(a.status).toBe("mehrdeutig");
    expect(a.anzahl).toBeGreaterThan(1);
    expect(a.gemeinsame_mietstufe).toBeUndefined();
  });

  it("„Garding“ ist mehrdeutig, beide Kandidaten haben Stufe I", async () => {
    const { body } = await rufe({ gemeinde: "Garding" });
    const a = body.result.structuredContent;
    expect(a.status).toBe("mehrdeutig");
    expect(a.gemeinsame_mietstufe).toBe(1);
  });

  it("unbekannter Ort liefert nicht_gefunden mit Liste", async () => {
    const { body } = await rufe({ gemeinde: "Xqzwvbnm" });
    expect(body.result.structuredContent).toEqual({ status: "nicht_gefunden", aehnlich: [] });
  });

  it.each([
    [{ gemeinde: "" }, "gemeinde"],
    [{ gemeinde: "   " }, "gemeinde"],
    [{ gemeinde: "a".repeat(101) }, "gemeinde"],
    [{ gemeinde: "Aachen", kreis: "k".repeat(101) }, "kreis"],
    [{ gemeinde: "Aachen", land: "l".repeat(61) }, "land"],
    [{}, "gemeinde"],
  ])("Schemafehler bei %j nennt das Feld", async (args, feld) => {
    const { body } = await rufe(args);
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain(feld);
  });
});

describe("gemeinsame Stufe nur bei vollständiger Liste", () => {
  const k = (stufe: 1 | 2): MietstufenTreffer => ({ gemeinde: "G", kreis: "K", land: "L", mietstufe: stufe, quelle: "Q" });

  it("vollständige Liste mit gleicher Stufe", () => {
    expect(alsAusgabe({ status: "mehrdeutig", anzahl: 2, kandidaten: [k(1), k(1)] }).gemeinsame_mietstufe).toBe(1);
  });

  it("gekürzte Liste: keine Aussage, auch wenn alle gezeigten gleich sind", () => {
    const kandidaten = Array.from({ length: 25 }, () => k(1));
    expect(alsAusgabe({ status: "mehrdeutig", anzahl: 30, kandidaten }).gemeinsame_mietstufe).toBeUndefined();
  });

  it("verschiedene Stufen: keine Aussage", () => {
    expect(alsAusgabe({ status: "mehrdeutig", anzahl: 2, kandidaten: [k(1), k(2)] }).gemeinsame_mietstufe).toBeUndefined();
  });
});
