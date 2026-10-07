import type { Rechtsstand } from "./typen";
import { WOGG_2025 } from "./wogg-2025";

export * from "./typen";
export { WOGG_2025 } from "./wogg-2025";

export const RECHTSSTAENDE: readonly Rechtsstand[] = [WOGG_2025];

export class RechtsstandFehlt extends Error {
  constructor(stichtag: string) {
    super(
      `Für den Stichtag ${stichtag} ist kein Rechtsstand eingebaut. ` +
        `Verfügbar: ${RECHTSSTAENDE.map((r) => `${r.gueltigAb} bis ${r.gueltigBis}`).join(", ")}.`,
    );
    this.name = "RechtsstandFehlt";
  }
}

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

// ISO-Daten lassen sich als Zeichenketten vergleichen.
export function rechtsstandFuer(stichtag: string): Rechtsstand {
  if (!ISO_DATUM.test(stichtag)) throw new RechtsstandFehlt(stichtag);
  const treffer = RECHTSSTAENDE.find((r) => r.gueltigAb <= stichtag && stichtag <= r.gueltigBis);
  if (!treffer) throw new RechtsstandFehlt(stichtag);
  return treffer;
}
