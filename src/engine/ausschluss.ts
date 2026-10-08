import type { Rechtsstand } from "../rechtsstand";
import { D, type Dezimal } from "./dezimal";
import { AUSSCHLUSS_LEISTUNGEN, type AusschlussLeistung, type MitgliedEingabe } from "./eingabe";
import { type Ausschlussgrund, EingabeFehler, pruefeObjekt, type Rechenschritt } from "./rechenweg";

const NORM: Record<AusschlussLeistung, string> = {
  grundsicherungsgeld_sgb2: "§ 7 Abs. 1 Satz 1 Nr. 1 WoGG",
  ausbildung_sgb2_zuschuss: "§ 7 Abs. 1 Satz 1 Nr. 2 WoGG",
  verletztengeld: "§ 7 Abs. 1 Satz 1 Nr. 4 und Satz 2 WoGG",
  grundsicherung_alter_em: "§ 7 Abs. 1 Satz 1 Nr. 5 WoGG",
  hilfe_zum_lebensunterhalt: "§ 7 Abs. 1 Satz 1 Nr. 6 WoGG",
  sgb14_lebensunterhalt: "§ 7 Abs. 1 Satz 1 Nr. 7 WoGG",
  asylblg: "§ 7 Abs. 1 Satz 1 Nr. 8 WoGG",
  sgb8_kdu: "§ 7 Abs. 1 Satz 1 Nr. 9 WoGG",
  in_bedarf_beruecksichtigt: "§ 7 Abs. 2 WoGG",
};

const BEZEICHNUNG: Record<AusschlussLeistung, string> = {
  grundsicherungsgeld_sgb2: "Bürgergeld bzw. Grundsicherungsgeld nach SGB II",
  ausbildung_sgb2_zuschuss: "Zuschuss für Auszubildende nach § 27 Abs. 3 SGB II",
  verletztengeld: "Verletztengeld in Höhe des Grundsicherungsgeldes",
  grundsicherung_alter_em: "Grundsicherung im Alter und bei Erwerbsminderung",
  hilfe_zum_lebensunterhalt: "Hilfe zum Lebensunterhalt nach SGB XII",
  sgb14_lebensunterhalt: "Leistungen zum Lebensunterhalt nach SGB XIV",
  asylblg: "Leistungen nach dem Asylbewerberleistungsgesetz",
  sgb8_kdu: "Leistungen nach SGB VIII mit Unterkunftskosten",
  in_bedarf_beruecksichtigt: "bei der Leistung eines anderen Mitglieds berücksichtigt",
};

export interface AusschlussErgebnis {
  zuBeruecksichtigen: number[]; // Positionen im Haushalt
  ausgeschlossen: { index: number; leistung: AusschlussLeistung; norm: string }[];
  vermoegensgrenze: Dezimal | null;
  grund?: Ausschlussgrund;
  schritte: Rechenschritt[];
  annahmen: string[];
  hinweise: string[];
}

// § 7 WoGG (Ausschluss einzelner Mitglieder), § 21 Nr. 2 (alle ausgeschlossen) und Nr. 3 (erhebliches Vermögen).
export function pruefeAusschluss(rs: Rechtsstand, mitglieder: MitgliedEingabe[], vermoegen?: number): AusschlussErgebnis {
  if (!Array.isArray(mitglieder) || mitglieder.length === 0) throw new EingabeFehler("mitglieder", "mindestens ein Haushaltsmitglied angeben");
  mitglieder.forEach((m, i) => {
    pruefeObjekt(m, `mitglieder[${i}]`);
    if (m.ausschluss !== undefined && !AUSSCHLUSS_LEISTUNGEN.includes(m.ausschluss))
      throw new EingabeFehler(`mitglieder[${i}].ausschluss`, `unbekannte Leistung: ${String(m.ausschluss)}`);
  });
  if (vermoegen !== undefined && (typeof vermoegen !== "number" || !Number.isFinite(vermoegen) || vermoegen < 0))
    throw new EingabeFehler("vermoegen", "muss eine Zahl ab 0 sein");

  // § 7 Abs. 1 Satz 1 Nr. 9 WoGG: SGB VIII nur in Haushalten, zu denen ausschließlich Personen gehören, die diese Leistungen empfangen.
  const sgb8Wirkt = mitglieder.every((m) => m.ausschluss === "sgb8_kdu");
  const schliesstAus = (m: MitgliedEingabe): boolean => m.ausschluss !== undefined && (m.ausschluss !== "sgb8_kdu" || sgb8Wirkt);
  const ausgeschlossen = mitglieder.flatMap((m, index) => (schliesstAus(m) && m.ausschluss ? [{ index, leistung: m.ausschluss, norm: NORM[m.ausschluss] }] : []));
  const zuBeruecksichtigen = mitglieder.flatMap((m, index) => (schliesstAus(m) ? [] : [index]));
  const schritte: Rechenschritt[] = [
    {
      schritt: "Zu berücksichtigende Haushaltsmitglieder",
      norm: "§§ 5 bis 7 WoGG",
      wert: `${zuBeruecksichtigen.length} von ${mitglieder.length}`,
      erklaerung:
        ausgeschlossen.length > 0
          ? ausgeschlossen.map((a) => `Mitglied ${a.index + 1} ausgeschlossen (${BEZEICHNUNG[a.leistung]}, ${a.norm})`).join("; ")
          : "Kein Mitglied ausgeschlossen",
    },
  ];
  const annahmen: string[] = [];
  const hinweise: string[] = [];
  if (ausgeschlossen.length > 0)
    hinweise.push(
      "Ausgeschlossen ist ein Mitglied nur, wenn bei der Leistung Kosten der Unterkunft berücksichtigt wurden (§ 7 Abs. 1 Satz 1 und 2 WoGG). Kein Ausschluss auch, wenn die Leistung nur als Darlehen gezahlt wird oder Wohngeld die Hilfebedürftigkeit vermeidet oder beseitigt (§ 7 Abs. 1 Satz 3 WoGG). Dann das Mitglied ohne Ausschluss angeben.",
    );
  if (!sgb8Wirkt && mitglieder.some((m) => m.ausschluss === "sgb8_kdu"))
    hinweise.push(
      "Leistungen nach SGB VIII schließen nur aus, wenn alle Haushaltsmitglieder sie beziehen (§ 7 Abs. 1 Satz 1 Nr. 9 WoGG). Die halbe Pauschale zählt dann als Einkommen: als sonstige_haelfte mit Nummer 24 (Kind) bzw. 25 (Pflegeperson) eintragen.",
    );

  if (zuBeruecksichtigen.length === 0)
    return {
      zuBeruecksichtigen,
      ausgeschlossen,
      vermoegensgrenze: null,
      grund: { code: "alle_ausgeschlossen", norm: "§ 21 Nr. 2 WoGG", text: "Alle Haushaltsmitglieder sind vom Wohngeld ausgeschlossen." },
      schritte,
      annahmen,
      hinweise,
    };

  const w = rs.einkommen;
  const vermoegensgrenze = new D(w.vermoegenErstes).plus(new D(w.vermoegenWeiteres).times(zuBeruecksichtigen.length - 1));
  let grund: Ausschlussgrund | undefined;
  if (vermoegen === undefined) {
    annahmen.push("Kein erhebliches Vermögen angegeben (§ 21 Nr. 3 WoGG).");
  } else {
    const erheblich = new D(vermoegen).greaterThan(vermoegensgrenze);
    schritte.push({
      schritt: "Vermögen",
      norm: "§ 21 Nr. 3 WoGG, Nr. 21.37 WoGVwV",
      wert: new D(vermoegen).toFixed(2),
      erklaerung: `Regelgrenze ${vermoegensgrenze.toFixed(2)} € für ${zuBeruecksichtigen.length} zu berücksichtigende Mitglieder${erheblich ? ", überschritten" : ""}`,
    });
    hinweise.push("Die Vermögensgrenze ist ein Regelwert der Verwaltungsvorschrift; die Wohngeldbehörde prüft den Einzelfall.");
    if (erheblich)
      grund = {
        code: "vermoegen",
        norm: "§ 21 Nr. 3 WoGG",
        text: `Das Vermögen übersteigt die Regelgrenze von ${vermoegensgrenze.toFixed(2)} € (erhebliches Vermögen).`,
      };
  }

  return { zuBeruecksichtigen, ausgeschlossen, vermoegensgrenze, ...(grund ? { grund } : {}), schritte, annahmen, hinweise };
}
