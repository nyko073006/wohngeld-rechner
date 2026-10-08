import { parseAnlage, type AnlageZeile } from "./anlage";
import { leseGv, type Gv } from "./gv";
import { leseRohdatei, type RohQuelle } from "./quellen";

// Die Anlage ist ASCII mit numerischen Entitäten; latin1 liest jedes Byte unverändert.
export function leseAnlageRoh(q: RohQuelle): AnlageZeile[] {
  return parseAnlage(leseRohdatei(q).toString("latin1"));
}

export function leseGvRoh(q: RohQuelle): Gv {
  return leseGv(leseRohdatei(q));
}
