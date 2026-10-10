import { describe, expect, it } from "vitest";
import worker from "../../src/server/index";
import { rufeMcp } from "../hilfen/mcp";

const hole = (pfad: string) => worker.fetch(new Request(`https://test.local${pfad}`));

describe("Rechtsseiten", () => {
  for (const pfad of ["/", "/datenschutz", "/impressum", "/support"]) {
    it(`${pfad} liefert 200 als HTML`, async () => {
      const r = await hole(pfad);
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toBe("text/html; charset=utf-8");
      const text = await r.text();
      expect(text).toContain('lang="de"');
      expect(text).toContain("English summary");
    });
  }

  it("Startseite verlinkt die drei Seiten und trägt den Haftungshinweis", async () => {
    const text = await (await hole("/")).text();
    for (const p of ["/datenschutz", "/impressum", "/support"]) expect(text).toContain(`href="${p}"`);
    expect(text).toContain("Unverbindliche Schätzung");
    expect(text).toContain("keine Rechtsberatung");
    expect(text).toContain("Bescheid der Wohngeldbehörde");
  });

  it("Impressum nennt Name, Anschrift und Mail", async () => {
    const text = await (await hole("/impressum")).text();
    expect(text).toContain("Niklas J. Thaler");
    expect(text).toContain("Hermann-Löns-Straße 10");
    expect(text).toContain("89537 Giengen");
    expect(text).toContain("wohngeld@patinasouthside.de");
  });

  it("Datenschutz nennt Hosting, Nichtspeicherung und Rechtsgrundlage", async () => {
    const text = await (await hole("/datenschutz")).text();
    expect(text).toContain("Cloudflare");
    expect(text).toContain("nicht gespeichert");
    expect(text).toContain("Art. 6");
    expect(text).toContain("90 Tage");
    expect(text).toContain("https://openai.com/policies/privacy-policy");
  });

  it("Support nennt Mail und Repo", async () => {
    const text = await (await hole("/support")).text();
    expect(text).toContain("wohngeld@patinasouthside.de");
    expect(text).toContain("https://github.com/nyko073006/wohngeld-rechner");
  });

  it("unbekannter Pfad bleibt 404, POST auf Seiten ebenfalls", async () => {
    expect((await hole("/anderes")).status).toBe(404);
    const r = await worker.fetch(new Request("https://test.local/impressum", { method: "POST" }));
    expect(r.status).toBe(404);
  });

  it("/mcp funktioniert weiter", async () => {
    const r = await rufeMcp((q) => worker.fetch(q), "tools/list");
    expect(r.status).toBe(200);
  });
});
