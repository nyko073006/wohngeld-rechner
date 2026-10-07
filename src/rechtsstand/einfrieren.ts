// Rechtsstände sind Modulkonstanten. Ein Worker-Isolate teilt sie über Anfragen hinweg;
// eingefroren kann keine Anfrage die Werte für die nächste verändern.
export function tiefEinfrieren<T>(wert: T): T {
  if (wert !== null && typeof wert === "object" && !Object.isFrozen(wert)) {
    for (const kind of Object.values(wert)) tiefEinfrieren(kind);
    Object.freeze(wert);
  }
  return wert;
}
