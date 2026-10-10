import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { rufeMcp } from "../hilfen/mcp";

const fetchFn = (r: Request) => worker.fetch(r);
const tools = async (): Promise<any[]> => (await rufeMcp(fetchFn, "tools/list")).body.result.tools;

// Sammelt alle Eigenschaften eines JSON-Schemas mit Pfad, auch in verschachtelten Objekten und Array-Elementen.
function eigenschaften(schema: any, pfad = ""): [string, any][] {
  const liste: [string, any][] = [];
  for (const [name, p] of Object.entries<any>(schema?.properties ?? {})) {
    liste.push([`${pfad}${name}`, p]);
    liste.push(...eigenschaften(p, `${pfad}${name}.`));
    if (p.items) liste.push(...eigenschaften(p.items, `${pfad}${name}[].`));
  }
  return liste;
}

describe("Metadaten (Spec 4)", () => {
  it("jede Beschreibung beginnt mit „Use this when“ und nennt Ausschlussfälle", async () => {
    for (const t of await tools()) {
      expect(t.description, t.name).toMatch(/^Use this when /);
      expect(t.description, t.name).toContain("Nicht für:");
      expect(t.description, t.name).toContain("Bürgergeld");
    }
  });

  it("deutsche Stichworte", async () => {
    const alle = ["Wohngeld", "Wohngeldrechner", "Wohngeld Plus", "Mietzuschuss", "Lastenzuschuss", "Mietstufe"];
    for (const t of await tools()) for (const w of alle) expect(t.description, `${t.name}: ${w}`).toContain(w);
  });

  it("kein „kostenlos“, kein „amtlich“", async () => {
    for (const t of await tools()) {
      const text = JSON.stringify(t).toLowerCase();
      expect(text, t.name).not.toContain("kostenlos");
      expect(text, t.name).not.toContain("amtlich");
    }
  });

  it("jeder Parameter hat eine Beschreibung mit Beispiel", async () => {
    for (const t of await tools()) {
      const liste = eigenschaften(t.inputSchema);
      expect(liste.length, t.name).toBeGreaterThan(0);
      for (const [pfad, p] of liste) expect(p.description ?? "", `${t.name}.${pfad}`).toMatch(/Beispiel/);
    }
  });
});

describe("Golden-Prompt-Set (Spec 4)", () => {
  const text = readFileSync("test/golden-prompts.md", "utf8");
  it("5 positive und 3 negative Fälle", () => {
    expect(text.match(/^### P\d+ /gm)?.length).toBe(5);
    expect(text.match(/^### N\d+ /gm)?.length).toBe(3);
  });
  it("jeder Fall nennt erwartetes Tool und Verhalten", () => {
    const faelle = text.split(/^### /m).slice(1);
    for (const f of faelle) {
      expect(f).toMatch(/\*\*Erwartetes Tool:\*\*/);
      expect(f).toMatch(/\*\*Erwartetes Verhalten:\*\*/);
    }
  });
});
