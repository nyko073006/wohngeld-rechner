export interface Rechenschritt {
  schritt: string;
  norm: string;
  wert: string;
  erklaerung: string;
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
