import type { Rechtsstand } from "../../rechtsstand";
import { D, type Dezimal } from "../dezimal";
import { EINNAHME_ARTEN, type Einnahme, type EinnahmeArt, type MitgliedEingabe, NUMMERN_HAELFTE, NUMMERN_VOLL } from "../eingabe";
import { EingabeFehler, type Rechenschritt } from "../rechenweg";

export interface MitgliedEinkommen {
  summe: Dezimal; // Betrag nach §§ 14, 15, jährlich, vor § 16
  abzugProzent: number; // 0, 10, 20 oder 30
  jahreseinkommen: Dezimal; // nach § 16
  erwerbseinkommen: Dezimal; // eigene Einnahmen aus Erwerbstätigkeit nach § 16 (für § 17 Nr. 4)
  renteJaehrlich: Dezimal; // angegebene Renten brutto (für § 17a)
  schritt: Rechenschritt;
  annahmen: string[];
  hinweise: string[];
}

const MIT_WERBUNGSKOSTEN: readonly EinnahmeArt[] = ["nichtselbstaendig", "minijob_pauschal"];
const DARF_NEGATIV: readonly EinnahmeArt[] = ["selbstaendig", "vermietung"];

function pruefeBetrag(wert: unknown, feld: string, negativErlaubt = false): void {
  if (typeof wert !== "number" || !Number.isFinite(wert) || (!negativErlaubt && wert < 0))
    throw new EingabeFehler(feld, negativErlaubt ? "muss eine Zahl sein" : "muss eine Zahl ab 0 sein");
}

function pruefeEinnahme(e: Einnahme, feld: string): void {
  if (!EINNAHME_ARTEN.includes(e.art)) throw new EingabeFehler(`${feld}.art`, `unbekannte Einnahmeart: ${String(e.art)}`);
  pruefeBetrag(e.betragMonatlich, `${feld}.betragMonatlich`, DARF_NEGATIV.includes(e.art));
  if (e.werbungskostenMonatlich !== undefined) {
    if (!MIT_WERBUNGSKOSTEN.includes(e.art))
      throw new EingabeFehler(`${feld}.werbungskostenMonatlich`, "nur bei nichtselbstaendig und minijob_pauschal");
    pruefeBetrag(e.werbungskostenMonatlich, `${feld}.werbungskostenMonatlich`);
  }
  if (e.sonderzahlungJaehrlich !== undefined) {
    if (e.art !== "nichtselbstaendig") throw new EingabeFehler(`${feld}.sonderzahlungJaehrlich`, "nur bei nichtselbstaendig");
    pruefeBetrag(e.sonderzahlungJaehrlich, `${feld}.sonderzahlungJaehrlich`);
  }
  if (e.elterngeldPlus !== undefined && e.art !== "elterngeld")
    throw new EingabeFehler(`${feld}.elterngeldPlus`, "nur bei elterngeld");
  const liste = e.art === "sonstige_voll" ? NUMMERN_VOLL : e.art === "sonstige_haelfte" ? NUMMERN_HAELFTE : null;
  if (liste && (e.nummer === undefined || !liste.includes(e.nummer)))
    throw new EingabeFehler(`${feld}.nummer`, `Nummer aus § 14 Abs. 2 WoGG erwartet: ${liste.join(", ")}`);
  if (!liste && e.nummer !== undefined) throw new EingabeFehler(`${feld}.nummer`, "nur bei sonstige_voll und sonstige_haelfte");
}

function pruefeMitglied(m: MitgliedEingabe, feld: string): void {
  if (!Array.isArray(m.einnahmen)) throw new EingabeFehler(`${feld}.einnahmen`, "muss eine Liste sein");
  for (const k of ["zahltSteuern", "zahltKvPv", "zahltRv"] as const)
    if (typeof m[k] !== "boolean") throw new EingabeFehler(`${feld}.${k}`, "muss angegeben sein (ja oder nein), jede Angabe macht 10 % aus");
  m.einnahmen.forEach((e, i) => pruefeEinnahme(e, `${feld}.einnahmen[${i}]`));
}

// Jahreseinkommen eines zu berücksichtigenden Mitglieds nach §§ 14 bis 16 WoGG.
export function berechneJahreseinkommen(rs: Rechtsstand, m: MitgliedEingabe, index: number): MitgliedEinkommen {
  pruefeMitglied(m, `mitglieder[${index}]`);
  const w = rs.einkommen;
  const summeArt = (art: EinnahmeArt, feld: (e: Einnahme) => number | undefined = (e) => e.betragMonatlich): Dezimal =>
    m.einnahmen.filter((e) => e.art === art).reduce((s, e) => s.plus(new D(feld(e) ?? 0)), new D(0));
  const jahr = (x: Dezimal): Dezimal => x.times(12);
  const teile: string[] = [];
  const annahmen: string[] = [];
  const hinweise: string[] = [];
  const posten = (text: string, wert: Dezimal): Dezimal => {
    if (!wert.isZero()) teile.push(`${text} ${wert.toFixed(2)}`);
    return wert;
  };

  // § 19 EStG mit § 15 Abs. 3 WoGG; Werbungskosten mindestens Pauschbetrag (§ 9a Satz 1 Nr. 1a EStG),
  // höchstens bis zur Höhe der Einnahmen (§ 9a Satz 2 EStG).
  const arbeitBrutto = jahr(summeArt("nichtselbstaendig")).plus(summeArt("nichtselbstaendig", (e) => e.sonderzahlungJaehrlich));
  const arbeitWk = D.min(arbeitBrutto, D.max(jahr(summeArt("nichtselbstaendig", (e) => e.werbungskostenMonatlich)), w.arbeitnehmerPauschbetrag));
  const arbeit = posten("Arbeit", arbeitBrutto.minus(arbeitWk));

  // § 14 Abs. 1 Satz 3 Nr. 2 WoGG: tatsächliche Aufwendungen, kein Pauschbetrag.
  const minijobBrutto = jahr(summeArt("minijob_pauschal"));
  const minijob = posten(
    "Minijob",
    minijobBrutto.minus(D.min(minijobBrutto, jahr(summeArt("minijob_pauschal", (e) => e.werbungskostenMonatlich)))),
  );

  // § 22 EStG mit § 14 Abs. 2 Nr. 3 WoGG und § 19 EStG mit § 14 Abs. 2 Nr. 1 WoGG: voller Betrag,
  // je Art eigener Pauschbetrag (§ 9a Satz 1 Nr. 3 und Nr. 1b EStG).
  const renteBrutto = jahr(summeArt("rente"));
  const rente = posten("Rente", renteBrutto.minus(D.min(renteBrutto, w.rentenPauschbetrag)));
  const versorgungBrutto = jahr(summeArt("versorgungsbezug"));
  const versorgung = posten("Versorgung", versorgungBrutto.minus(D.min(versorgungBrutto, w.versorgungsPauschbetrag)));

  // § 14 Abs. 1 Satz 1 und 4 WoGG: nur positive Einkünfte, kein Ausgleich mit negativen.
  const positiv = (art: EinnahmeArt, text: string): Dezimal => {
    const x = jahr(summeArt(art));
    if (x.isNegative()) {
      hinweise.push(`${text}: negative Einkünfte werden nicht verrechnet (§ 14 Abs. 1 Satz 4 WoGG).`);
      return new D(0);
    }
    return posten(text, x);
  };
  const selbst = positiv("selbstaendig", "Selbständig");
  const vermietung = positiv("vermietung", "Vermietung");

  // § 20 EStG nach Sparer-Pauschbetrag, plus § 14 Abs. 2 Nr. 15 WoGG: der steuerfreie Betrag zählt,
  // soweit er die Schwelle von 100 € übersteigt. Ergebnis: Erträge minus 100 € (WoGVwV Nr. 17.03.5 Beispiel 2).
  const kapitalErtrag = jahr(summeArt("kapital"));
  let kapital = new D(0);
  if (!kapitalErtrag.isZero()) {
    const steuerfrei = D.min(kapitalErtrag, w.sparerPauschbetrag);
    const nr15 = D.max(0, steuerfrei.minus(w.kapitalSchwelle));
    kapital = posten("Kapital", kapitalErtrag.minus(steuerfrei).plus(nr15));
    annahmen.push(
      `Kapitalerträge: ${w.kapitalSchwelle} € im Jahr bleiben frei (§ 14 Abs. 2 Nr. 15 WoGG, Rechenweg wie WoGVwV Nr. 17.03.5 Beispiel 2).`,
    );
  }

  // § 14 Abs. 2 Nr. 6 WoGG mit § 10 Abs. 1 und 3 BEEG.
  const elterngeldMonat = summeArt("elterngeld");
  let elterngeld = new D(0);
  if (!elterngeldMonat.isZero()) {
    const plus = m.einnahmen.some((e) => e.art === "elterngeld" && e.elterngeldPlus === true);
    const frei = new D(w.elterngeldFreiMonatlich).dividedBy(plus ? 2 : 1);
    elterngeld = posten("Elterngeld", jahr(D.max(0, elterngeldMonat.minus(frei))));
    annahmen.push(`Elterngeld: ${frei.toFixed(2)} € im Monat anrechnungsfrei (§ 10 BEEG), ohne Mehrlingszuschlag.`);
  }

  // § 14 Abs. 2 Nr. 19 Buchst. b WoGG.
  const zuwendung = posten("Zuwendungen Dritter", D.max(0, jahr(summeArt("zuwendung_dritter")).minus(w.zuwendungDritterFrei)));

  // § 14 Abs. 2 Nr. 6, 11, 19, 20, 21 und Nummern aus NUMMERN_VOLL: voll.
  const zuschlaege = jahr(summeArt("zuschlaege_3b"));
  const voll = posten(
    "Einnahmen § 14 Abs. 2",
    jahr(summeArt("lohnersatz").plus(summeArt("unterhalt")).plus(summeArt("unterhaltsvorschuss")).plus(summeArt("sonstige_voll"))).plus(zuschlaege),
  );

  // § 14 Abs. 2 Nr. 27 und Nummern aus NUMMERN_HAELFTE: zur Hälfte.
  const haelfte = posten("Hälfte nach § 14 Abs. 2", jahr(summeArt("ausbildungsfoerderung").plus(summeArt("sonstige_haelfte"))).dividedBy(2));

  const summe = [arbeit, minijob, rente, versorgung, selbst, vermietung, kapital, elterngeld, zuwendung, voll, haelfte].reduce(
    (s, x) => s.plus(x),
    new D(0),
  );

  // § 16 WoGG: jeweils 10 Prozent je zutreffender Kategorie.
  const kategorien = [m.zahltSteuern, m.zahltKvPv, m.zahltRv].filter(Boolean).length;
  const faktor = new D(1).minus(new D(w.abzugsSatz).times(kategorien));
  const jahreseinkommen = summe.times(faktor);
  // WoGVwV Nr. 17.03.5: eigene Einnahmen aus Erwerbstätigkeit nach Werbungskosten und § 16.
  const erwerbseinkommen = arbeit.plus(minijob).plus(selbst).plus(zuschlaege).times(faktor);

  const schritt: Rechenschritt = {
    schritt: `Jahreseinkommen Mitglied ${index + 1}`,
    norm: "§§ 14 bis 16 WoGG",
    wert: jahreseinkommen.toFixed(2),
    erklaerung: `${teile.length > 0 ? teile.join(" + ") : "keine Einnahmen"} = ${summe.toFixed(2)} €, Abzug ${kategorien * 10} % nach § 16`,
  };

  return {
    summe,
    abzugProzent: kategorien * 10,
    jahreseinkommen,
    erwerbseinkommen,
    renteJaehrlich: renteBrutto,
    schritt,
    annahmen,
    hinweise,
  };
}
