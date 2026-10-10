// Prüft das Einreichungspaket gegen die Feldregeln aus docs/quellen/openai-plugin-submission-2026-10-11.md.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { SERVER_VERSION } from "../../src/server/server";
import { rufeMcp } from "../hilfen/mcp";

const WURZEL = join(__dirname, "../../plugin");
const plugin = JSON.parse(readFileSync(join(WURZEL, "plugin.json"), "utf8"));
const mcp = JSON.parse(readFileSync(join(WURZEL, "mcp.json"), "utf8"));
const openai = plugin.extensions?.["com.openai"] ?? {};
const ui = openai.interface ?? {};
const faelle = openai.review?.test_cases ?? {};
const HOST = "https://wohngeld-rechner.nyko-a85.workers.dev";

function luminanz(hex: string): number {
  const kanal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(1) + 0.7152 * kanal(3) + 0.0722 * kanal(5);
}
function kontrast(a: string, b: string): number {
  const hell = Math.max(luminanz(a), luminanz(b));
  const dunkel = Math.min(luminanz(a), luminanz(b));
  return (hell + 0.05) / (dunkel + 0.05);
}
function goldenPrompts(): Record<string, string> {
  const text = readFileSync(join(__dirname, "../golden-prompts.md"), "utf8");
  const ergebnis: Record<string, string> = {};
  for (const m of text.matchAll(/^### ([PN]\d) [\s\S]*?\*\*Prompt:\*\* „(.+?)“/gm)) if (m[1] && m[2]) ergebnis[m[1]] = m[2];
  return ergebnis;
}

describe("plugin.json", () => {
  it("Paketidentität nach Agent-Plugins-Format", () => {
    expect(plugin.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(plugin.name.length).toBeLessThanOrEqual(64);
    expect(plugin.version).toBe(SERVER_VERSION);
    expect(plugin.author.name.length).toBeLessThanOrEqual(120);
  });

  it("Pflichtfelder der Listung mit Längengrenzen", () => {
    expect(ui.displayName.length).toBeLessThanOrEqual(30);
    expect(ui.shortDescription.length).toBeLessThanOrEqual(30);
    expect(ui.longDescription.length).toBeLessThanOrEqual(4000);
    expect(ui.developerName.length).toBeLessThanOrEqual(80);
    expect(typeof ui.category).toBe("string");
    expect(ui.capabilities.length).toBeLessThanOrEqual(20);
    for (const c of ui.capabilities) expect(c.length).toBeLessThanOrEqual(120);
  });

  it("vier Rechts-URLs zeigen auf ausgelieferte Seiten desselben Hosts", async () => {
    for (const feld of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
      const url = new URL(ui[feld]);
      expect(url.origin, feld).toBe(HOST);
      const r = await worker.fetch(new Request(`https://test.local${url.pathname}`));
      expect(r.status, feld).toBe(200);
    }
  });

  it("Startprompts: höchstens drei, je höchstens 128 Zeichen, verschieden", () => {
    expect(ui.defaultPrompt.length).toBeLessThanOrEqual(3);
    for (const p of ui.defaultPrompt) expect(p.length).toBeLessThanOrEqual(128);
    expect(new Set(ui.defaultPrompt).size).toBe(ui.defaultPrompt.length);
  });

  it("Markenfarben erfüllen den Mindestkontrast 2:1", () => {
    expect(kontrast(ui.brandColor, "#FFFFFF")).toBeGreaterThanOrEqual(2);
    expect(kontrast(ui.brandColorDark, "#212121")).toBeGreaterThanOrEqual(2);
  });

  it("Icons liegen im Paket, quadratisch und mindestens 48 groß", () => {
    for (const feld of ["logo", "composerIcon"]) {
      expect(ui[feld], feld).toMatch(/^\.\//);
      const pfad = join(WURZEL, ui[feld]);
      expect(existsSync(pfad), feld).toBe(true);
      const box = readFileSync(pfad, "utf8").match(/viewBox="0 0 (\d+) (\d+)"/);
      expect(box?.[1]).toBe(box?.[2]);
      expect(Number(box?.[1])).toBeGreaterThanOrEqual(48);
    }
  });

  it("Übersetzte Untertitel höchstens 30 Zeichen", () => {
    for (const t of Object.values<any>(openai.publication?.translations ?? {})) {
      expect(t.subtitle.length).toBeLessThanOrEqual(30);
    }
  });

  it("keine Zugangsdaten oder Prüferanweisungen im Paket", () => {
    const roh = readFileSync(join(WURZEL, "plugin.json"), "utf8") + readFileSync(join(WURZEL, "mcp.json"), "utf8");
    expect(roh).not.toMatch(/test_credentials|reviewer_instructions|clientSecret/);
  });
});

describe("Testfälle", () => {
  const golden = goldenPrompts();

  it("genau fünf positive und drei negative", () => {
    expect(faelle.positive).toHaveLength(5);
    expect(faelle.negative).toHaveLength(3);
  });

  it("Prompts sind wörtlich die aus golden-prompts.md", () => {
    expect(faelle.positive.map((f: any) => f.prompt)).toEqual(["P1", "P2", "P3", "P4", "P5"].map((k) => golden[k]));
    expect(faelle.negative.map((f: any) => f.prompt)).toEqual(["N1", "N2", "N3"].map((k) => golden[k]));
  });

  it("positive Fälle nennen nur Tools, die der Server anbietet", async () => {
    const r = await rufeMcp((q) => worker.fetch(q), "tools/list");
    const namen = new Set(r.body.result.tools.map((t: any) => t.name));
    for (const f of faelle.positive) {
      expect(f.description.length).toBeGreaterThan(0);
      expect(f.expected_behavior.length).toBeGreaterThan(0);
      for (const t of f.tools_triggered.split(",").map((s: string) => s.trim())) expect(namen.has(t), t).toBe(true);
    }
  });
});

describe("mcp.json", () => {
  it("genau ein Remote-Server ohne Anmeldung und ohne Header", () => {
    expect(mcp.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
    const server = Object.values<any>(mcp.mcpServers);
    expect(server).toHaveLength(1);
    expect(server[0].type).toBe("streamable-http");
    expect(server[0].url).toBe(`${HOST}/mcp`);
    expect(server[0].extensions["com.openai"].auth.type).toBe("none");
    expect(server[0].headers).toBeUndefined();
  });
});
