import type { QuellenNachweis } from "../../src/mietstufen/typen";
import { parseAnlage, type AnlageZeile } from "./anlage";
import type { ErzeugenEingabe } from "./erzeugen";
import { leseGv, type Gv } from "./gv";
import { leseQuellen, leseRohdatei, type RohQuelle } from "./quellen";

// Die Anlage ist ASCII mit numerischen Entitäten; latin1 liest jedes Byte unverändert.
export function leseAnlageRoh(q: RohQuelle): AnlageZeile[] {
  return parseAnlage(leseRohdatei(q).toString("latin1"));
}

export function leseGvRoh(q: RohQuelle): Gv {
  return leseGv(leseRohdatei(q));
}

// Alle Eingaben des Erzeugers aus data/roh/.
export function ladeEingabe(): ErzeugenEingabe {
  const q = leseQuellen();
  const nachweis = ({ datei: _datei, ...rest }: RohQuelle): QuellenNachweis => rest;
  return {
    anlage: leseAnlageRoh(q.anlage),
    basis: leseGvRoh(q.gv_basis),
    aktuell: leseGvRoh(q.gv_aktuell),
    nachweise: { anlage: nachweis(q.anlage), basis: nachweis(q.gv_basis), aktuell: nachweis(q.gv_aktuell) },
  };
}
