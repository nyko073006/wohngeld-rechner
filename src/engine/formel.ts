import type { Rechtsstand } from "../rechtsstand";
import { koeffizienten, mindestwerte, zaehltAls } from "../rechtsstand/zugriff";
import { aufVolleEuro, D, type Dezimal, zehnStellen } from "./dezimal";
import { EingabeFehler, type Rechenschritt } from "./rechenweg";

export interface FormelEingabe {
  rechtsstand: Rechtsstand;
  zuBeruecksichtigen: number;
  m: Dezimal | string | number;
  y: Dezimal | string | number;
}

export interface FormelErgebnis {
  mEingesetzt: Dezimal;
  yEingesetzt: Dezimal;
  z1: Dezimal;
  z2: Dezimal;
  z3: Dezimal;
  z4: Dezimal;
  grundbetrag: number;
  zuschlag: number;
  wohngeld: number;
  unterBagatellgrenze: boolean;
  schritte: Rechenschritt[];
}

function alsDezimal(feld: string, wert: Dezimal | string | number): Dezimal {
  let d: Dezimal;
  try {
    d = new D(wert);
  } catch {
    throw new EingabeFehler(feld, `keine Zahl: ${String(wert)}`);
  }
  if (!d.isFinite() || d.isNegative()) throw new EingabeFehler(feld, "muss eine Zahl ab 0 sein");
  return d;
}

// § 19 WoGG mit Rechenschritten und Rundung nach Anlage 3.
export function berechneFormel(e: FormelEingabe): FormelErgebnis {
  if (!Number.isInteger(e.zuBeruecksichtigen) || e.zuBeruecksichtigen < 1)
    throw new EingabeFehler("zuBeruecksichtigen", "muss eine ganze Zahl ab 1 sein");
  const mRoh = alsDezimal("m", e.m);
  const yRoh = alsDezimal("y", e.y);
  const rs = e.rechtsstand;
  const n = e.zuBeruecksichtigen;
  const k = zaehltAls(n);

  const { a, b, c } = koeffizienten(rs, k);
  const mindest = mindestwerte(rs, k);
  const M = D.max(mRoh, mindest.m);
  const Y = D.max(yRoh, mindest.y);

  const z1 = zehnStellen(new D(a).plus(zehnStellen(new D(b).times(M))).plus(zehnStellen(new D(c).times(Y))));
  const z2 = zehnStellen(z1.times(Y));
  const z3 = zehnStellen(M.minus(z2));
  const z4 = zehnStellen(new D("1.15").times(z3));
  const grundbetrag = Math.max(0, aufVolleEuro(z4));

  // § 19 Abs. 3: Zuschlag ab dem 13. Mitglied, höchstens bis zur Höhe von M.
  // Annahme: Der Zuschlag erhöht nur ein positives Wohngeld; ergibt die 12er-Rechnung 0 €, gibt es keinen Zuschlag.
  let zuschlag = 0;
  if (n > 12 && grundbetrag > 0) {
    const obergrenze = M.toDecimalPlaces(0, D.ROUND_DOWN).toNumber();
    zuschlag = Math.max(0, Math.min((n - 12) * rs.zuschlagAb13, obergrenze - grundbetrag));
  }
  const vorBagatell = grundbetrag + zuschlag;
  const unterBagatellgrenze = vorBagatell < rs.bagatellgrenze;
  const wohngeld = unterBagatellgrenze ? 0 : vorBagatell;

  const schritte: Rechenschritt[] = [
    {
      schritt: "Eingesetzte Werte",
      norm: "Anlage 3 Nr. 1 WoGG",
      wert: `M = ${M.toFixed(2)}, Y = ${Y.toFixed(2)}`,
      erklaerung: `Mindestwerte für ${k} Mitglieder: M ${mindest.m} €, Y ${mindest.y} €`,
    },
    { schritt: "z1 = a + b·M + c·Y", norm: "Anlage 3 Nr. 2 WoGG", wert: z1.toFixed(10), erklaerung: `a = ${a}, b = ${b}, c = ${c}` },
    { schritt: "z2 = z1·Y", norm: "Anlage 3 Nr. 2 WoGG", wert: z2.toFixed(10), erklaerung: "" },
    { schritt: "z3 = M − z2", norm: "Anlage 3 Nr. 2 WoGG", wert: z3.toFixed(10), erklaerung: "" },
    { schritt: "z4 = 1,15·z3", norm: "§ 19 Abs. 1 WoGG", wert: z4.toFixed(10), erklaerung: "Ungerundetes Wohngeld" },
    { schritt: "Gerundet", norm: "Anlage 3 Nr. 3 WoGG", wert: String(grundbetrag), erklaerung: "Kaufmännisch auf volle Euro, negatives Ergebnis zählt als 0" },
  ];
  if (n > 12) {
    schritte.push({
      schritt: "Zuschlag ab dem 13. Mitglied",
      norm: "§ 19 Abs. 3 WoGG",
      wert: String(zuschlag),
      erklaerung: `${n - 12} × ${rs.zuschlagAb13} €, höchstens bis zur Höhe von M`,
    });
  }
  schritte.push({
    schritt: "Wohngeld",
    norm: "§ 21 Nr. 1 WoGG",
    wert: String(wohngeld),
    erklaerung: unterBagatellgrenze ? `Unter ${rs.bagatellgrenze} € besteht kein Anspruch` : "Monatliches Wohngeld",
  });

  return { mEingesetzt: M, yEingesetzt: Y, z1, z2, z3, z4, grundbetrag, zuschlag, wohngeld, unterBagatellgrenze, schritte };
}
