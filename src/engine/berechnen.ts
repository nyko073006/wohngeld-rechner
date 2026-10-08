import { type Mietstufe, rechtsstandFuer } from "../rechtsstand";
import { pruefeAusschluss } from "./ausschluss";
import type { HaushaltEingabe } from "./eingabe";
import { berechneGesamteinkommen } from "./einkommen/gesamteinkommen";
import { berechneFormel } from "./formel";
import { berechneMiete } from "./miete";
import { type Ausschlussgrund, EingabeFehler, type Rechenschritt } from "./rechenweg";

export const HINWEIS_UNVERBINDLICH = "Unverbindliche Schätzung. Über den Anspruch entscheidet die Wohngeldbehörde.";

export interface Berechnung {
  wohngeldMonatlich: number;
  rechtsstand: string;
  mietstufe: Mietstufe;
  art: HaushaltEingabe["art"];
  y: string | null; // Anzeige mit zwei Stellen; null, wenn nicht gerechnet wurde
  m: string | null;
  rechenweg: Rechenschritt[];
  annahmen: string[];
  hinweise: string[];
  ausschlussgrund?: Ausschlussgrund;
}

const eindeutig = (liste: string[]): string[] => [...new Set(liste)];

// Gesamtablauf: Rechtsstand → Ausschluss (§§ 7, 21) → Einkommen (§§ 13 bis 18) → Miete (§§ 11, 12) → Formel (§ 19).
export function berechneWohngeld(e: HaushaltEingabe): Berechnung {
  const rs = rechtsstandFuer(e.stichtag);
  if (e.art !== "mietzuschuss" && e.art !== "lastenzuschuss") throw new EingabeFehler("art", "mietzuschuss oder lastenzuschuss");
  const rechenweg: Rechenschritt[] = [
    { schritt: "Rechtsstand", norm: rs.fundstelle, wert: rs.id, erklaerung: `Stichtag ${e.stichtag}, gültig ${rs.gueltigAb} bis ${rs.gueltigBis}` },
  ];
  const basis = { rechtsstand: rs.id, mietstufe: e.mietstufe, art: e.art };

  const ausschluss = pruefeAusschluss(rs, e.mitglieder, e.vermoegen);
  rechenweg.push(...ausschluss.schritte);
  const annahmen = [...ausschluss.annahmen];
  const hinweise = [HINWEIS_UNVERBINDLICH, ...ausschluss.hinweise];
  if (ausschluss.grund)
    return {
      ...basis,
      wohngeldMonatlich: 0,
      y: null,
      m: null,
      rechenweg,
      annahmen: eindeutig(annahmen),
      hinweise: eindeutig(hinweise),
      ausschlussgrund: ausschluss.grund,
    };

  const n = ausschluss.zuBeruecksichtigen.length;
  const einkommen = berechneGesamteinkommen({
    rechtsstand: rs,
    // "!": index stammt aus pruefeAusschluss und liegt in e.mitglieder (noUncheckedIndexedAccess)
    mitglieder: ausschluss.zuBeruecksichtigen.map((index) => ({ index, mitglied: e.mitglieder[index]! })),
    alleinerziehend: e.alleinerziehend,
    unterhaltGezahlt: e.unterhaltGezahlt,
  });
  const miete = berechneMiete({
    rechtsstand: rs,
    mietstufe: e.mietstufe,
    haushaltsmitglieder: e.mitglieder.length,
    zuBeruecksichtigen: n,
    mieteMonatlich: e.mieteMonatlich,
  });
  const formel = berechneFormel({ rechtsstand: rs, zuBeruecksichtigen: n, m: miete.m, y: einkommen.y });

  rechenweg.push(...einkommen.schritte, ...miete.schritte, ...formel.schritte);
  annahmen.push(...einkommen.annahmen, ...formel.annahmen);
  hinweise.push(...einkommen.hinweise);

  return {
    ...basis,
    wohngeldMonatlich: formel.wohngeld,
    y: einkommen.y.toFixed(2),
    m: miete.m.toFixed(2),
    rechenweg,
    annahmen: eindeutig(annahmen),
    hinweise: eindeutig(hinweise),
    ...(formel.grund ? { ausschlussgrund: formel.grund } : {}),
  };
}
