import { describe, expect, it } from "vitest";
import { HINWEIS_UNVERBINDLICH } from "../../src/engine/berechnen";
import worker from "../../src/server/index";
import { feldImTool, heuteInBerlin } from "../../src/server/wohngeld-berechnen";
import { rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);
const rufe = (args: Record<string, unknown>) => rufeMcp(fetchFn, "tools/call", { name: "wohngeld_berechnen", arguments: args });
const ohne = { zahlt_steuern: false, zahlt_kv_pv: false, zahlt_rv: false };

// BMWSB-Rechenbeispiel 1 (Stand 01.01.2025), wie test/fixtures/bmwsb-2025-eingaben.ts Nr. 1
const BEISPIEL_1 = {
  stichtag: "2025-07-01",
  mietstufe: 1,
  art: "mietzuschuss",
  miete_monatlich: 335,
  mitglieder: [{ einnahmen: [{ art: "rente", betrag_monatlich: 1300 }], ...ohne, zahlt_kv_pv: true }],
};

// BMWSB-Rechenbeispiel 5 (Wiesbaden), Wohnort statt Mietstufe
const BEISPIEL_5 = {
  stichtag: "2025-07-01",
  wohnort: { gemeinde: "Wiesbaden" },
  art: "mietzuschuss",
  miete_monatlich: 700,
  alleinerziehend: true,
  mitglieder: [
    { einnahmen: [{ art: "nichtselbstaendig", betrag_monatlich: 1530 }], ...ohne, zahlt_kv_pv: true, zahlt_rv: true },
    { einnahmen: [{ art: "unterhaltsvorschuss", betrag_monatlich: 696 }], ...ohne },
    { einnahmen: [], ...ohne },
  ],
};

describe("Tool wohngeld_berechnen", () => {
  it("rechnet Beispiel 1 mit direkter Mietstufe", async () => {
    const { body } = await rufe(BEISPIEL_1);
    expect(body.result.isError).toBeFalsy();
    const a = body.result.structuredContent;
    expect(a).toMatchObject({ status: "berechnet", wohngeld_monatlich: 110, mietstufe: 1, y: "1162.35", m: "445.40", stichtag: "2025-07-01" });
    expect(a.hinweise).toContain(HINWEIS_UNVERBINDLICH);
    expect(a.wohnort).toBeUndefined();
  });

  it("rechnet Beispiel 5 über den Wohnort Wiesbaden", async () => {
    const { body } = await rufe(BEISPIEL_5);
    const a = body.result.structuredContent;
    expect(a).toMatchObject({ status: "berechnet", wohngeld_monatlich: 372, mietstufe: 6, y: "1728.00", m: "870.20" });
    expect(a.wohnort.gemeinde).toContain("Wiesbaden");
    expect(a.rechenweg.length).toBeGreaterThan(3);
  });

  it("mehrdeutiger Wohnort: keine Rechnung, Kandidaten und Hinweis", async () => {
    const { body } = await rufe({ ...BEISPIEL_5, wohnort: { gemeinde: "Neustadt" } });
    const a = body.result.structuredContent;
    expect(a.status).toBe("wohnort_mehrdeutig");
    expect(a.wohngeld_monatlich).toBeUndefined();
    expect(a.kandidaten.length).toBeGreaterThan(1);
    expect(a.hinweise).toContain(HINWEIS_UNVERBINDLICH);
  });

  it("unbekannter Wohnort: keine Rechnung, Hinweis", async () => {
    const { body } = await rufe({ ...BEISPIEL_5, wohnort: { gemeinde: "Xqzwvbnm" } });
    const a = body.result.structuredContent;
    expect(a.status).toBe("wohnort_nicht_gefunden");
    expect(a.wohngeld_monatlich).toBeUndefined();
    expect(a.hinweise).toContain(HINWEIS_UNVERBINDLICH);
  });

  it("Stichtag ohne Rechtsstand: Fehler „Rechtsstand noch nicht verfügbar“", async () => {
    const { body } = await rufe({ ...BEISPIEL_1, stichtag: "2027-01-01" });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toMatch(/^Rechtsstand noch nicht verfügbar\./);
  });

  it.each(["2025-13-45", "2025-02-30"])("ungültiges Kalenderdatum %s: Schemafehler am Feld stichtag", async (stichtag) => {
    const { body } = await rufe({ ...BEISPIEL_1, stichtag });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("stichtag");
    expect(body.result.content[0].text).toContain("gültiges Datum");
  });

  it("Schalttag 2024-02-29 passiert das Schema (danach fehlt nur der Rechtsstand)", async () => {
    const { body } = await rufe({ ...BEISPIEL_1, stichtag: "2024-02-29" });
    expect(body.result.content[0].text).not.toContain("gültiges Datum");
    expect(body.result.content[0].text).toMatch(/^Rechtsstand noch nicht verfügbar\./);
  });

  it("ohne Stichtag gilt heute in Berlin", async () => {
    const { stichtag: _, ...ohneStichtag } = BEISPIEL_1;
    const { body } = await rufe(ohneStichtag);
    expect(body.result.structuredContent.stichtag).toBe(heuteInBerlin(new Date()));
  });

  it.each([
    [{ ...BEISPIEL_1, wohnort: { gemeinde: "Jüterbog" } }, "wohnort"],
    [{ ...BEISPIEL_1, mietstufe: undefined }, "wohnort"],
    [{ ...BEISPIEL_1, mitglieder: [] }, "mitglieder"],
    [{ ...BEISPIEL_1, miete_monatlich: -1 }, "miete_monatlich"],
    [{ ...BEISPIEL_1, stichtag: "09.10.2026" }, "stichtag"],
    [{ ...BEISPIEL_1, mietstufe: 8 }, "mietstufe"],
    [{ ...BEISPIEL_1, mitglieder: [{ einnahmen: [], zahlt_steuern: false, zahlt_kv_pv: false }] }, "zahlt_rv"],
    [{ ...BEISPIEL_1, art: "mietzuschuß" }, "art"],
  ])("Fehler nennt das Feld (%#)", async (args, feld) => {
    const { body } = await rufe(args as Record<string, unknown>);
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain(feld);
  });

  it("Fehler aus der Engine nennt das Feld im snake_case des Tools", async () => {
    const { body } = await rufe({
      ...BEISPIEL_1,
      mitglieder: [{ einnahmen: [{ art: "rente", betrag_monatlich: 1300, werbungskosten_monatlich: 10 }], ...ohne }],
    });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("werbungskosten_monatlich");
    expect(body.result.content[0].text).not.toContain("werbungskostenMonatlich");
  });
});

describe("Hilfsfunktionen", () => {
  it("heute in Berlin: Silvester 23:30 UTC ist schon Neujahr", () => {
    expect(heuteInBerlin(new Date("2025-12-31T23:30:00Z"))).toBe("2026-01-01");
  });

  it("heute in Berlin: Sommerzeit, 21:59 UTC ist noch derselbe Tag", () => {
    expect(heuteInBerlin(new Date("2026-06-30T21:59:00Z"))).toBe("2026-06-30");
  });

  it("übersetzt Feldpfade der Engine", () => {
    expect(feldImTool("mitglieder[0].einnahmen[1].werbungskostenMonatlich")).toBe("mitglieder[0].einnahmen[1].werbungskosten_monatlich");
    expect(feldImTool("mitglieder[2].kindUnter25")).toBe("mitglieder[2].kind_unter_25");
    expect(feldImTool("mieteMonatlich")).toBe("miete_monatlich");
  });
});
