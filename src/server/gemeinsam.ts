import { z } from "zod";

// Alle Tools rechnen nur: nichts wird geschrieben, nichts außerhalb des Servers abgefragt.
export const NUR_LESEND = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export const mietstufeSchema = z.number().int().min(1).max(7);

// Längen begrenzt: Die Ähnlichkeitssuche ist quadratisch in der Länge, Workers Free hat 10 ms CPU.
export const ortFelder = {
  gemeinde: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe('Name der Gemeinde oder Stadt, ohne Postleitzahl. Beispiel: "Esslingen am Neckar", "Leipzig"'),
  kreis: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe('Kreis oder kreisfreie Stadt, nur zur Unterscheidung gleichnamiger Orte. Beispiel: "Esslingen", "Leipzig"'),
  land: z
    .string()
    .trim()
    .max(60)
    .optional()
    .describe('Bundesland als Name oder Kürzel. Beispiel: "Baden-Württemberg", "BW", "NRW"'),
};

export const trefferSchema = z.object({
  gemeinde: z.string(),
  kreis: z.string(),
  land: z.string(),
  mietstufe: mietstufeSchema,
  quelle: z.string(),
});

// Text und strukturierter Inhalt tragen dieselben Daten (Clients ohne structuredContent lesen den Text).
export function antwort<T extends Record<string, unknown>>(daten: T) {
  return { content: [{ type: "text" as const, text: JSON.stringify(daten) }], structuredContent: daten };
}
