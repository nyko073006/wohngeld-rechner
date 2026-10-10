import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type Berechnung, berechneWohngeld, HINWEIS_UNVERBINDLICH } from "../engine/berechnen";
import { AUSSCHLUSS_LEISTUNGEN, EINNAHME_ARTEN, type HaushaltEingabe } from "../engine/eingabe";
import { EingabeFehler } from "../engine/rechenweg";
import { sucheMietstufe } from "../mietstufen/daten";
import type { MietstufenTreffer } from "../mietstufen/typen";
import { type Mietstufe, RechtsstandFehlt, UNTERHALT_ARTEN } from "../rechtsstand";
import { antwort, mietstufeSchema, NUR_LESEND, ortFelder, trefferSchema } from "./gemeinsam";

export const WOHNGELD_BERECHNEN_BESCHREIBUNG =
  "Use this when the user wants an estimate of German housing benefit (Wohngeld, § 19 WoGG) for a rented flat " +
  "(Mietzuschuss) or owner-occupied home (Lastenzuschuss). Needs household members with their monthly income and " +
  "whether each pays taxes, health/care insurance and pension insurance; ask the user for these three, do not assume them. " +
  "Returns the monthly amount, the calculation path with legal references, assumptions and notes. " +
  "Pass the place name exactly as the user wrote it, without adding suffixes or a Bundesland. " +
  "If the place is ambiguous, no amount is calculated; ask for Kreis or Bundesland, or pass mietstufe. " +
  "Stichworte: Wohngeld, Wohngeldrechner, Wohngeld Plus, Mietzuschuss, Lastenzuschuss, Mietstufe. " +
  "Nicht für: Bürgergeld, Kinderzuschlag, Grundsicherung, BAföG, Kosten der Unterkunft nach SGB II. " +
  "Unverbindliche Schätzung.";

const betrag = z.number().nonnegative().max(1_000_000);

const einnahmeSchema = z.object({
  art: z.enum(EINNAHME_ARTEN).describe('Einnahmeart nach § 14 WoGG. Beispiel: "nichtselbstaendig", "rente", "elterngeld"'),
  betrag_monatlich: z
    .number()
    .min(-1_000_000)
    .max(1_000_000)
    .describe("Monatlicher Bruttobetrag in Euro; bei selbstaendig und vermietung Gewinn bzw. Überschuss, darf negativ sein. Beispiel: 2150"),
  werbungskosten_monatlich: betrag
    .optional()
    .describe("Nur nichtselbstaendig und minijob_pauschal: Werbungskosten je Monat, sofern über dem Pauschbetrag. Beispiel: 150"),
  sonderzahlung_jaehrlich: betrag.optional().describe("Nur nichtselbstaendig: Weihnachts- und Urlaubsgeld im Jahr. Beispiel: 1800"),
  elterngeld_plus: z.boolean().optional().describe("Nur elterngeld: true bei ElterngeldPlus. Beispiel: false"),
  nummer: z
    .number()
    .int()
    .optional()
    .describe("Nur sonstige_voll und sonstige_haelfte: Nummer in § 14 Abs. 2 WoGG. Beispiel: 12"),
});

const mitgliedSchema = z.object({
  einnahmen: z.array(einnahmeSchema).max(20).describe(
    "Einnahmen des Mitglieds, leer bei keinem Einkommen. Jede Einnahme bei dem Mitglied, dem sie zusteht: " +
      "Unterhaltsvorschuss und Unterhalt für ein Kind beim Kind eintragen, nicht beim Elternteil. " +
      'Beispiel: [{"art":"rente","betrag_monatlich":1300}]',
  ),
  zahlt_steuern: z.boolean().describe("Zahlt Steuern vom Einkommen (§ 16 WoGG). Pflichtangabe, beim Nutzer erfragen. Beispiel: true"),
  zahlt_kv_pv: z.boolean().describe("Zahlt Kranken- und Pflegeversicherung (§ 16 WoGG). Pflichtangabe, beim Nutzer erfragen. Beispiel: true"),
  zahlt_rv: z.boolean().describe("Zahlt Rentenversicherung (§ 16 WoGG). Pflichtangabe, beim Nutzer erfragen. Beispiel: false"),
  schwerbehindert: z.boolean().optional().describe("Grad der Behinderung 100 oder pflegebedürftig mit häuslicher Pflege (§ 17 Nr. 1). Beispiel: false"),
  ns_verfolgt: z.boolean().optional().describe("Opfer nationalsozialistischer Verfolgung (§ 17 Nr. 2). Beispiel: false"),
  kind_unter_25: z.boolean().optional().describe("Kind eines Haushaltsmitglieds, noch nicht 25, mit eigenem Einkommen (§ 17 Nr. 4). Beispiel: true"),
  grundrentenzeiten_33: z.boolean().optional().describe("Mindestens 33 Jahre Grundrentenzeiten (§ 17a). Beispiel: false"),
  ausschluss: z
    .enum(AUSSCHLUSS_LEISTUNGEN)
    .optional()
    .describe('Bezieht eine Transferleistung, die Wohngeld ausschließt (§ 7). Beispiel: "grundsicherungsgeld_sgb2"'),
});

const unterhaltSchema = z.object({
  art: z.enum(UNTERHALT_ARTEN).describe('Empfänger des gezahlten Unterhalts (§ 18). Beispiel: "ehegatte"'),
  betrag_monatlich: betrag.describe("Gezahlter Unterhalt je Monat in Euro. Beispiel: 300"),
  tituliert: z.boolean().optional().describe("Durch Titel, notarielle Vereinbarung oder Bescheid festgelegt. Beispiel: true"),
});

function istKalenderdatum(text: string): boolean {
  const [j = 0, m = 0, t = 0] = text.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t;
}

export const wohngeldBerechnenEingabe = z.object({
  stichtag: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "erwartet JJJJ-MM-TT")
    .refine(istKalenderdatum, "erwartet ein gültiges Datum JJJJ-MM-TT")
    .optional()
    .describe('Datum, für das gerechnet wird, Standard heute. Beispiel: "2026-07-01"'),
  wohnort: z
    .object(ortFelder)
    .optional()
    .describe('Wohnort zum Nachschlagen der Mietstufe; entweder wohnort oder mietstufe. Beispiel: {"gemeinde":"Leipzig","land":"Sachsen"}'),
  mietstufe: mietstufeSchema.optional().describe("Mietstufe I bis VII als Zahl, wenn bekannt; entweder wohnort oder mietstufe. Beispiel: 4"),
  art: z.enum(["mietzuschuss", "lastenzuschuss"]).describe('Mietzuschuss für Mieter, Lastenzuschuss für Eigentümer. Beispiel: "mietzuschuss"'),
  miete_monatlich: betrag.describe("Bruttokaltmiete (Miete mit kalten Nebenkosten, ohne Heizung) bzw. Belastung je Monat in Euro. Beispiel: 650"),
  mitglieder: z.array(mitgliedSchema).min(1).max(30).describe("Alle Haushaltsmitglieder einschließlich der antragstellenden Person. Beispiel: [{\"einnahmen\":[{\"art\":\"rente\",\"betrag_monatlich\":1300}],\"zahlt_steuern\":false,\"zahlt_kv_pv\":true,\"zahlt_rv\":false}]"),
  alleinerziehend: z.boolean().optional().describe("Alleinerziehend mit Kind unter 18 im Haushalt (§ 17 Nr. 3). Beispiel: true"),
  unterhalt_gezahlt: z.array(unterhaltSchema).max(30).optional().describe('Gezahlter Unterhalt (§ 18). Beispiel: [{"art":"ehegatte","betrag_monatlich":300}]'),
  vermoegen: betrag.optional().describe("Vermögen aller zu berücksichtigenden Mitglieder in Euro (§ 21 Nr. 3). Beispiel: 15000"),
});
export type BerechnenEingabe = z.infer<typeof wohngeldBerechnenEingabe>;

const schrittSchema = z.object({ schritt: z.string(), norm: z.string(), wert: z.string(), erklaerung: z.string() });
const grundSchema = z.object({
  code: z.enum(["alle_ausgeschlossen", "vermoegen", "rechnerisch_kein_wohngeld", "bagatellgrenze"]),
  norm: z.string(),
  text: z.string(),
});

export const wohngeldBerechnenAusgabe = z.object({
  status: z.enum(["berechnet", "wohnort_mehrdeutig", "wohnort_nicht_gefunden"]),
  wohngeld_monatlich: z.number().optional(),
  stichtag: z.string().optional(),
  rechtsstand: z.string().optional(),
  mietstufe: mietstufeSchema.optional(),
  art: z.enum(["mietzuschuss", "lastenzuschuss"]).optional(),
  y: z.string().nullable().optional(),
  m: z.string().nullable().optional(),
  rechenweg: z.array(schrittSchema).optional(),
  annahmen: z.array(z.string()).optional(),
  ausschlussgrund: grundSchema.optional(),
  wohnort: trefferSchema.optional(),
  anzahl: z.number().int().optional(),
  kandidaten: z.array(trefferSchema).optional(),
  aehnlich: z.array(trefferSchema).optional(),
  hinweise: z.array(z.string()),
});
export type BerechnenAusgabe = z.infer<typeof wohngeldBerechnenAusgabe>;

const HINWEIS_MEHRDEUTIG = "Der Wohnort ist mehrdeutig. Bitte Kreis oder Bundesland angeben oder einen der Kandidaten wählen.";
const HINWEIS_NICHT_GEFUNDEN = "Der Wohnort wurde nicht gefunden. Bitte die Schreibweise prüfen oder einen der ähnlichen Namen wählen.";

// Kalendertag in Deutschland; "sv-SE" formatiert als JJJJ-MM-TT.
export function heuteInBerlin(jetzt: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(jetzt);
}

// Feldnamen der Engine (camelCase) → Feldnamen des Tool-Schemas (snake_case).
const FELDNAMEN: Readonly<Record<string, string>> = {
  mieteMonatlich: "miete_monatlich",
  betragMonatlich: "betrag_monatlich",
  werbungskostenMonatlich: "werbungskosten_monatlich",
  sonderzahlungJaehrlich: "sonderzahlung_jaehrlich",
  elterngeldPlus: "elterngeld_plus",
  zahltSteuern: "zahlt_steuern",
  zahltKvPv: "zahlt_kv_pv",
  zahltRv: "zahlt_rv",
  nsVerfolgt: "ns_verfolgt",
  kindUnter25: "kind_unter_25",
  grundrentenzeiten33: "grundrentenzeiten_33",
  unterhaltGezahlt: "unterhalt_gezahlt",
  zuBeruecksichtigen: "zu_beruecksichtigen",
};

export function feldImTool(feld: string): string {
  return feld.replace(/[A-Za-z0-9]+/g, (w) => FELDNAMEN[w] ?? w);
}

function zuHaushalt(a: BerechnenEingabe, mietstufe: Mietstufe, stichtag: string): HaushaltEingabe {
  return {
    stichtag,
    mietstufe,
    art: a.art,
    mieteMonatlich: a.miete_monatlich,
    alleinerziehend: a.alleinerziehend,
    vermoegen: a.vermoegen,
    unterhaltGezahlt: a.unterhalt_gezahlt?.map((u) => ({ art: u.art, betragMonatlich: u.betrag_monatlich, tituliert: u.tituliert })),
    mitglieder: a.mitglieder.map((m) => ({
      einnahmen: m.einnahmen.map((e) => ({
        art: e.art,
        betragMonatlich: e.betrag_monatlich,
        werbungskostenMonatlich: e.werbungskosten_monatlich,
        sonderzahlungJaehrlich: e.sonderzahlung_jaehrlich,
        elterngeldPlus: e.elterngeld_plus,
        nummer: e.nummer,
      })),
      zahltSteuern: m.zahlt_steuern,
      zahltKvPv: m.zahlt_kv_pv,
      zahltRv: m.zahlt_rv,
      schwerbehindert: m.schwerbehindert,
      nsVerfolgt: m.ns_verfolgt,
      kindUnter25: m.kind_unter_25,
      grundrentenzeiten33: m.grundrentenzeiten_33,
      ausschluss: m.ausschluss,
    })),
  };
}

function rechne(e: HaushaltEingabe): Berechnung {
  try {
    return berechneWohngeld(e);
  } catch (f) {
    if (f instanceof RechtsstandFehlt) throw new Error(`Rechtsstand noch nicht verfügbar. ${f.message}`);
    if (f instanceof EingabeFehler) throw new Error(`${feldImTool(f.feld)}: ${f.message.slice(f.feld.length + 2)}`);
    throw f;
  }
}

export function berechne(a: BerechnenEingabe, jetzt: Date = new Date()): BerechnenAusgabe {
  if (a.wohnort && a.mietstufe !== undefined) throw new Error("wohnort: entweder wohnort oder mietstufe angeben, nicht beides");
  if (!a.wohnort && a.mietstufe === undefined) throw new Error("wohnort: wohnort oder mietstufe fehlt");

  let mietstufe: Mietstufe;
  let wohnort: MietstufenTreffer | undefined;
  if (a.wohnort) {
    const s = sucheMietstufe(a.wohnort);
    if (s.status === "mehrdeutig")
      return { status: "wohnort_mehrdeutig", anzahl: s.anzahl, kandidaten: s.kandidaten, hinweise: [HINWEIS_UNVERBINDLICH, HINWEIS_MEHRDEUTIG] };
    if (s.status === "nicht_gefunden")
      return { status: "wohnort_nicht_gefunden", aehnlich: s.aehnlich, hinweise: [HINWEIS_UNVERBINDLICH, HINWEIS_NICHT_GEFUNDEN] };
    mietstufe = s.treffer.mietstufe;
    wohnort = s.treffer;
  } else {
    mietstufe = a.mietstufe as Mietstufe; // Schema: ganze Zahl 1 bis 7
  }

  const stichtag = a.stichtag ?? heuteInBerlin(jetzt);
  const b = rechne(zuHaushalt(a, mietstufe, stichtag));
  return {
    status: "berechnet",
    wohngeld_monatlich: b.wohngeldMonatlich,
    stichtag,
    rechtsstand: b.rechtsstand,
    mietstufe: b.mietstufe,
    art: b.art,
    y: b.y,
    m: b.m,
    rechenweg: b.rechenweg,
    annahmen: b.annahmen,
    hinweise: b.hinweise,
    ...(b.ausschlussgrund ? { ausschlussgrund: b.ausschlussgrund } : {}),
    ...(wohnort ? { wohnort } : {}),
  };
}

export function registriereWohngeldBerechnen(server: McpServer): void {
  server.registerTool(
    "wohngeld_berechnen",
    {
      title: "Wohngeld berechnen",
      description: WOHNGELD_BERECHNEN_BESCHREIBUNG,
      inputSchema: wohngeldBerechnenEingabe,
      outputSchema: wohngeldBerechnenAusgabe,
      annotations: NUR_LESEND,
    },
    async (eingabe) => antwort(berechne(eingabe)),
  );
}
