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

export class EingabeFehler extends Error {
  constructor(
    public readonly feld: string,
    meldung: string,
  ) {
    super(`${feld}: ${meldung}`);
    this.name = "EingabeFehler";
  }
}
