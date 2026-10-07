import type { Mietstufe, Rechtsstand } from "../rechtsstand";
import { MIETSTUFEN } from "../rechtsstand";
import { heizkostenentlastung, hoechstbetrag, klimakomponente } from "../rechtsstand/zugriff";
import { D, type Dezimal } from "./dezimal";
import { EingabeFehler, type Rechenschritt } from "./rechenweg";

export interface MieteEingabe {
  rechtsstand: Rechtsstand;
  mietstufe: Mietstufe;
  haushaltsmitglieder: number; // alle Mitglieder, auch ausgeschlossene
  zuBeruecksichtigen: number; // Mitglieder ohne Ausschluss nach §§ 7, 8
  mieteMonatlich: number; // Bruttokaltmiete bzw. Belastung
}

export interface MieteErgebnis {
  anteil: Dezimal;
  hoechstbetrag: Dezimal;
  klimakomponente: Dezimal;
  heizkosten: Dezimal;
  grenze: Dezimal;
  mieteAnteilig: Dezimal;
  mieteBeruecksichtigt: Dezimal;
  m: Dezimal;
  schritte: Rechenschritt[];
}

function pruefe(e: MieteEingabe): void {
  if (!MIETSTUFEN.includes(e.mietstufe)) throw new EingabeFehler("mietstufe", "muss 1 bis 7 sein");
  if (!Number.isInteger(e.haushaltsmitglieder) || e.haushaltsmitglieder < 1)
    throw new EingabeFehler("haushaltsmitglieder", "muss eine ganze Zahl ab 1 sein");
  if (!Number.isInteger(e.zuBeruecksichtigen) || e.zuBeruecksichtigen < 1 || e.zuBeruecksichtigen > e.haushaltsmitglieder)
    throw new EingabeFehler("zuBeruecksichtigen", "muss zwischen 1 und der Zahl der Haushaltsmitglieder liegen");
  if (!Number.isFinite(e.mieteMonatlich) || e.mieteMonatlich < 0)
    throw new EingabeFehler("mieteMonatlich", "muss eine Zahl ab 0 sein");
}

// § 11 WoGG: zu berücksichtigende Miete oder Belastung.
// Die Beträge richten sich nach allen Haushaltsmitgliedern (§ 11 Abs. 3), angesetzt wird der Anteil
// der zu berücksichtigenden Mitglieder.
export function berechneMiete(e: MieteEingabe): MieteErgebnis {
  pruefe(e);
  const rs = e.rechtsstand;
  const n = e.haushaltsmitglieder;
  const anteil = new D(e.zuBeruecksichtigen).dividedBy(n);

  const hoechst = new D(hoechstbetrag(rs, n, e.mietstufe)).times(anteil);
  const klima = new D(klimakomponente(rs, n)).times(anteil);
  const heiz = new D(heizkostenentlastung(rs, n)).times(anteil);
  const grenze = hoechst.plus(klima);
  const mieteAnteilig = new D(e.mieteMonatlich).times(anteil);
  const beruecksichtigt = D.min(mieteAnteilig, grenze);
  const m = beruecksichtigt.plus(heiz);

  const anteilText = anteil.equals(1) ? "" : ` (Anteil ${e.zuBeruecksichtigen} von ${n})`;
  const schritte: Rechenschritt[] = [
    {
      schritt: "Höchstbetrag",
      norm: "§ 12 Abs. 1 WoGG, Anlage 1",
      wert: hoechst.toFixed(2),
      erklaerung: `Mietstufe ${e.mietstufe}, ${n} Haushaltsmitglieder${anteilText}`,
    },
    { schritt: "Klimakomponente", norm: "§ 12 Abs. 7 WoGG", wert: klima.toFixed(2), erklaerung: `Zuschlag zum Höchstbetrag${anteilText}` },
    {
      schritt: "Berücksichtigte Miete",
      norm: "§ 11 Abs. 1 WoGG",
      wert: beruecksichtigt.toFixed(2),
      erklaerung: mieteAnteilig.greaterThan(grenze)
        ? `Miete ${mieteAnteilig.toFixed(2)} € auf Höchstbetrag plus Klimakomponente begrenzt`
        : `Miete ${mieteAnteilig.toFixed(2)} € liegt unter der Grenze von ${grenze.toFixed(2)} €`,
    },
    { schritt: "Entlastung Heizkosten", norm: "§ 12 Abs. 6 WoGG", wert: heiz.toFixed(2), erklaerung: `Pauschaler Zuschlag${anteilText}` },
    { schritt: "M", norm: "§ 11 Abs. 1 WoGG", wert: m.toFixed(2), erklaerung: "Berücksichtigte Miete plus Entlastung bei den Heizkosten" },
  ];

  return {
    anteil,
    hoechstbetrag: hoechst,
    klimakomponente: klima,
    heizkosten: heiz,
    grenze,
    mieteAnteilig,
    mieteBeruecksichtigt: beruecksichtigt,
    m,
    schritte,
  };
}
