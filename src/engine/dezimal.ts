import Decimal from "decimal.js";

// Eigener Klon, damit keine globale Decimal-Einstellung verändert wird.
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dezimal = InstanceType<typeof D>;

// Anlage 3 Nr. 2 WoGG: Festkommazahlen mit zehn Nachkommastellen.
export function zehnStellen(x: Dezimal): Dezimal {
  return x.toDecimalPlaces(10, D.ROUND_HALF_UP);
}

// Anlage 3 Nr. 3 WoGG: unter 0,50 € abrunden, ab 0,50 € aufrunden.
export function aufVolleEuro(x: Dezimal): number {
  return x.toDecimalPlaces(0, D.ROUND_HALF_UP).toNumber();
}
