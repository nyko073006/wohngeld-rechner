import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { sucheMietstufe } from "../mietstufen/daten";
import type { SuchErgebnis } from "../mietstufen/typen";
import type { Mietstufe } from "../rechtsstand";
import { antwort, mietstufeSchema, NUR_LESEND, ortFelder, trefferSchema } from "./gemeinsam";

export const MIETSTUFE_FINDEN_BESCHREIBUNG =
  "Use this when the user asks for the Mietstufe (rent level I to VII) of a German municipality, " +
  "or when a place must be resolved before estimating housing benefit with wohngeld_berechnen. " +
  "Looks the place up in the annex to § 1 Abs. 3 WoGV. If the result is ambiguous, ask for Kreis or Bundesland. " +
  "Stichworte: Wohngeld, Wohngeldrechner, Wohngeld Plus, Mietstufe, Mietenstufe, Mietzuschuss, Lastenzuschuss. " +
  "Nicht für: Bürgergeld, Mietspiegel, ortsübliche Vergleichsmiete, Kosten der Unterkunft nach SGB II.";

export const mietstufeFindenEingabe = z.object(ortFelder);

export const mietstufeFindenAusgabe = z.object({
  status: z.enum(["eindeutig", "mehrdeutig", "nicht_gefunden"]),
  treffer: trefferSchema.optional(),
  anzahl: z.number().int().optional(),
  kandidaten: z.array(trefferSchema).optional(),
  gemeinsame_mietstufe: mietstufeSchema.optional(),
  aehnlich: z.array(trefferSchema).optional(),
});
export type MietstufeFindenAusgabe = z.infer<typeof mietstufeFindenAusgabe>;

type Mehrdeutig = Extract<SuchErgebnis, { status: "mehrdeutig" }>;

// Nur bei vollständiger Liste: Bei gekürzter Liste (anzahl > kandidaten) ist die Stufe der übrigen unbekannt.
export function gemeinsameMietstufe(e: Mehrdeutig): Mietstufe | undefined {
  if (e.kandidaten.length !== e.anzahl) return undefined;
  const stufen = new Set(e.kandidaten.map((k) => k.mietstufe));
  return stufen.size === 1 ? e.kandidaten[0]?.mietstufe : undefined;
}

export function alsAusgabe(e: SuchErgebnis): MietstufeFindenAusgabe {
  switch (e.status) {
    case "eindeutig":
      return { status: e.status, treffer: e.treffer };
    case "mehrdeutig": {
      const gemeinsam = gemeinsameMietstufe(e);
      return { status: e.status, anzahl: e.anzahl, kandidaten: e.kandidaten, ...(gemeinsam ? { gemeinsame_mietstufe: gemeinsam } : {}) };
    }
    case "nicht_gefunden":
      return { status: e.status, aehnlich: e.aehnlich };
  }
}

export function registriereMietstufeFinden(server: McpServer): void {
  server.registerTool(
    "mietstufe_finden",
    {
      title: "Mietstufe nach Ort finden",
      description: MIETSTUFE_FINDEN_BESCHREIBUNG,
      inputSchema: mietstufeFindenEingabe,
      outputSchema: mietstufeFindenAusgabe,
      annotations: NUR_LESEND,
    },
    async (eingabe) => antwort(alsAusgabe(sucheMietstufe(eingabe))),
  );
}
