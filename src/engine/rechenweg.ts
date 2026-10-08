export interface Rechenschritt {
  schritt: string;
  norm: string;
  wert: string;
  erklaerung: string;
}

// Warum das Ergebnis 0 € ist. Der Code ist maschinenlesbar, Norm und Text erklären ihn.
export interface Ausschlussgrund {
  code: "alle_ausgeschlossen" | "vermoegen" | "rechnerisch_kein_wohngeld" | "bagatellgrenze";
  norm: string;
  text: string;
}

export function pruefeOptionalBool(wert: unknown, feld: string): void {
  if (wert !== undefined && typeof wert !== "boolean") throw new EingabeFehler(feld, "muss ja oder nein sein (true oder false)");
}

export function pruefeObjekt(wert: unknown, feld: string): void {
  if (wert === null || typeof wert !== "object" || Array.isArray(wert)) throw new EingabeFehler(feld, "muss ein Objekt sein");
}

export class EingabeFehler extends Error {
  constructor(
    public readonly feld: string,
    meldung: string,
  ) {
    super(`${feld}: ${meldung}`);
    this.name = "EingabeFehler";
  }
}
