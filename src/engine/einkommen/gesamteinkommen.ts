import { type Rechtsstand, UNTERHALT_ARTEN } from "../../rechtsstand";
import { D, type Dezimal } from "../dezimal";
import type { MitgliedEingabe, UnterhaltZahlung } from "../eingabe";
import { EingabeFehler, type Rechenschritt } from "../rechenweg";
import { berechneJahreseinkommen, type MitgliedEinkommen } from "./jahreseinkommen";

export interface EinkommenEingabe {
  rechtsstand: Rechtsstand;
  // Nur die zu berücksichtigenden Mitglieder; index ist die Position im Haushalt (Feldnamen, Rechenweg).
  mitglieder: { index: number; mitglied: MitgliedEingabe }[];
  alleinerziehend?: boolean;
  unterhaltGezahlt?: UnterhaltZahlung[];
}

export interface EinkommenErgebnis {
  mitglieder: MitgliedEinkommen[];
  summeJahreseinkommen: Dezimal;
  freibetraege: Dezimal;
  unterhaltsabzug: Dezimal;
  gesamteinkommen: Dezimal; // jährlich, nicht negativ
  y: Dezimal; // monatlich, ungerundet
  schritte: Rechenschritt[];
  annahmen: string[];
  hinweise: string[];
}

function pruefeUnterhalt(u: UnterhaltZahlung, feld: string): void {
  if (!UNTERHALT_ARTEN.includes(u.art)) throw new EingabeFehler(`${feld}.art`, `erwartet: ${UNTERHALT_ARTEN.join(", ")}`);
  if (typeof u.betragMonatlich !== "number" || !Number.isFinite(u.betragMonatlich) || u.betragMonatlich < 0)
    throw new EingabeFehler(`${feld}.betragMonatlich`, "muss eine Zahl ab 0 sein");
  if (u.tituliert !== undefined && typeof u.tituliert !== "boolean") throw new EingabeFehler(`${feld}.tituliert`, "muss ja oder nein sein");
}

// § 13 WoGG: Summe der Jahreseinkommen minus Freibeträge (§§ 17, 17a) und Unterhaltsabzüge (§ 18); Y = ein Zwölftel.
export function berechneGesamteinkommen(e: EinkommenEingabe): EinkommenErgebnis {
  const w = e.rechtsstand.einkommen;
  const ergebnisse = e.mitglieder.map(({ index, mitglied }) => berechneJahreseinkommen(e.rechtsstand, mitglied, index));
  const summe = ergebnisse.reduce((s, r) => s.plus(r.jahreseinkommen), new D(0));
  const schritte: Rechenschritt[] = ergebnisse.map((r) => r.schritt);
  const annahmen = ergebnisse.flatMap((r) => r.annahmen);
  const hinweise = ergebnisse.flatMap((r) => r.hinweise);
  schritte.push({
    schritt: "Summe der Jahreseinkommen",
    norm: "§ 13 Abs. 1 WoGG",
    wert: summe.toFixed(2),
    erklaerung: `${ergebnisse.length} zu berücksichtigende Mitglieder`,
  });

  let freibetraege = new D(0);
  const freibetrag = (schritt: string, norm: string, betrag: Dezimal, erklaerung: string): void => {
    if (betrag.isZero()) return;
    freibetraege = freibetraege.plus(betrag);
    schritte.push({ schritt, norm, wert: `-${betrag.toFixed(2)}`, erklaerung });
  };
  e.mitglieder.forEach(({ index, mitglied: m }, i) => {
    const nr = index + 1;
    const r = ergebnisse[i];
    if (!r) return; // nie der Fall: ergebnisse hat genau so viele Einträge wie e.mitglieder (noUncheckedIndexedAccess)
    if (m.schwerbehindert)
      freibetrag(`Freibetrag Schwerbehinderung Mitglied ${nr}`, "§ 17 Nr. 1 WoGG", new D(w.freibetragSchwerbehindert), "GdB 100 oder unter 100 mit häuslicher Pflege");
    if (m.nsVerfolgt) freibetrag(`Freibetrag NS-Verfolgung Mitglied ${nr}`, "§ 17 Nr. 2 WoGG", new D(w.freibetragNsVerfolgt), "Opfer der NS-Verfolgung oder Gleichgestellte");
    if (m.kindUnter25)
      freibetrag(
        `Freibetrag Erwerbseinkommen Kind Mitglied ${nr}`,
        "§ 17 Nr. 4 WoGG",
        D.min(r.erwerbseinkommen, w.freibetragKindErwerbHoechst),
        `Eigene Einnahmen aus Erwerbstätigkeit nach Abzügen, höchstens ${w.freibetragKindErwerbHoechst} €`,
      );
    if (m.grundrentenzeiten33) {
      const rente = r.renteJaehrlich;
      const roh = rente.lte(w.grundrenteSockel) ? rente : new D(w.grundrenteSockel).plus(rente.minus(w.grundrenteSockel).times(w.grundrenteSatz));
      const deckel = new D(w.regelbedarfsstufe1).times("0.5").times(12);
      freibetrag(
        `Grundrentenfreibetrag Mitglied ${nr}`,
        "§ 17a WoGG",
        D.min(roh, deckel),
        `${w.grundrenteSockel} € plus 30 % der übersteigenden Rente, höchstens ${deckel.toFixed(2)} € im Jahr`,
      );
      annahmen.push("Grundrentenfreibetrag aus der gesamten angegebenen Rente berechnet.");
    }
  });
  if (e.alleinerziehend) freibetrag("Freibetrag Alleinerziehende", "§ 17 Nr. 3 WoGG", new D(w.freibetragAlleinerziehend), "Einmal je Haushalt");
  const keinMerkmal = e.mitglieder.every(({ mitglied: m }) => !m.schwerbehindert && !m.nsVerfolgt && !m.kindUnter25 && !m.grundrentenzeiten33);
  if (!e.alleinerziehend && keinMerkmal)
    annahmen.push(
      "Keine Freibeträge nach §§ 17, 17a angegeben (Schwerbehinderung, NS-Verfolgung, alleinerziehend, erwerbstätige Kinder unter 25, Grundrentenzeiten).",
    );

  let unterhaltsabzug = new D(0);
  (e.unterhaltGezahlt ?? []).forEach((u, i) => {
    pruefeUnterhalt(u, `unterhaltGezahlt[${i}]`);
    const jahresbetrag = new D(u.betragMonatlich).times(12);
    const grenze = w.unterhaltHoechst[u.art];
    const abzug = u.tituliert ? jahresbetrag : D.min(jahresbetrag, grenze);
    unterhaltsabzug = unterhaltsabzug.plus(abzug);
    if (!abzug.isZero())
      schritte.push({
        schritt: `Unterhaltsabzug ${i + 1}`,
        norm: "§ 18 WoGG",
        wert: `-${abzug.toFixed(2)}`,
        erklaerung: u.tituliert ? "Betrag laut Titel, Vereinbarung oder Bescheid" : `Höchstens ${grenze} € im Jahr`,
      });
  });

  const gesamteinkommen = D.max(0, summe.minus(freibetraege).minus(unterhaltsabzug));
  const y = gesamteinkommen.dividedBy(12);
  schritte.push(
    { schritt: "Gesamteinkommen", norm: "§ 13 Abs. 1 WoGG", wert: gesamteinkommen.toFixed(2), erklaerung: "Summe minus Freibeträge und Unterhaltsabzüge, nicht unter 0" },
    { schritt: "Monatliches Gesamteinkommen Y", norm: "§ 13 Abs. 2 WoGG", wert: y.toFixed(2), erklaerung: "Ein Zwölftel, ungerundet weitergerechnet" },
  );

  return { mitglieder: ergebnisse, summeJahreseinkommen: summe, freibetraege, unterhaltsabzug, gesamteinkommen, y, schritte, annahmen, hinweise };
}
