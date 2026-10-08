import { describe, expect, it } from "vitest";
import { leseQuellen, leseRohdatei, sha256 } from "../../scripts/mietstufen/quellen";

describe("Rohdaten: Prüfsummen und Herkunft (docs/quellen/2026-10-08-recherche-lizenz-gemeindeverzeichnis.md)", () => {
  const quellen = leseQuellen();
  for (const [schluessel, q] of Object.entries(quellen)) {
    it(`${q.datei} ist byteweise die abgerufene Quelle (${schluessel})`, () => {
      expect(sha256(leseRohdatei(q))).toBe(q.sha256);
      expect(q.url).toMatch(/^https:\/\/(www\.gesetze-im-internet\.de|www\.destatis\.de)\//);
      expect(q.abruf).toBe("2026-10-08");
    });
  }
});
