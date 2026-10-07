import Decimal from "decimal.js";
import type { Koeffizienten, Mietstufe, Rechtsstand, StaffelBis5 } from "./typen";

// Über 12 Mitglieder wird mit den Werten für 12 gerechnet; die Mehrbeträge für Mitglied 13 ff.
// kommen über § 19 Abs. 3 dazu (Länderhinweis zu WoGVwV Nr. 19.31, Stand 12/2024).
export function zaehltAls(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`Haushaltsgröße muss eine ganze Zahl ab 1 sein, ist ${n}.`);
  return Math.min(n, 12);
}

function staffel<T>(tabelle: StaffelBis5<T>, n: number, wert: (t: T) => number): number {
  const k = zaehltAls(n);
  if (k <= 5) return wert(tabelle.bis5[k as 1 | 2 | 3 | 4 | 5]);
  return new Decimal(wert(tabelle.bis5[5])).plus(new Decimal(wert(tabelle.mehrbetrag)).times(k - 5)).toNumber();
}

export function hoechstbetrag(rs: Rechtsstand, n: number, stufe: Mietstufe): number {
  return staffel(rs.hoechstbetraege, n, (zeile) => zeile[stufe]);
}

export function klimakomponente(rs: Rechtsstand, n: number): number {
  return staffel(rs.klimakomponente, n, (x) => x);
}

export function heizkostenentlastung(rs: Rechtsstand, n: number): number {
  return staffel(rs.heizkostenentlastung, n, (x) => x);
}

export function koeffizienten(rs: Rechtsstand, n: number): Koeffizienten {
  const werte = rs.koeffizienten[zaehltAls(n)];
  if (!werte) throw new RangeError(`Keine Koeffizienten für ${n} Mitglieder.`);
  return werte;
}

export function mindestwerte(rs: Rechtsstand, n: number): { m: number; y: number } {
  const werte = rs.mindestwerte[zaehltAls(n)];
  if (!werte) throw new RangeError(`Keine Mindestwerte für ${n} Mitglieder.`);
  return werte;
}
