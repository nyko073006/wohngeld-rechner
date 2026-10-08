import type { Herkunft, MietstufenDaten, MietstufenTreffer, SuchEingabe, SuchErgebnis } from "./typen";
import { abstand, gemeindeSchluessel, kreisSchluessel, lockerSchluessel, normalisiere, ohneTitel } from "./normalisieren";
import type { Mietstufe } from "../rechtsstand/typen";

// Ergebnislisten sind begrenzt, damit eine Antwort kurz bleibt. Die Gesamtzahl steht in `anzahl`.
export const MAX_KANDIDATEN = 25;
export const MAX_AEHNLICH = 5;
// „Meinten Sie“: erlaubter Levenshtein-Abstand 2 ab 5 Zeichen, 1 bei genau 4, darunter keine Vorschläge.
export const ABSTAND_LANG = 2;
export const ABSTAND_KURZ = 1;

// Postalische Kürzel der Länder gegen den amtlichen Länderschlüssel.
const KUERZEL: Readonly<Record<string, string>> = {
  sh: "01", hh: "02", ni: "03", hb: "04", nw: "05", he: "06", rp: "07", bw: "08",
  by: "09", sl: "10", be: "11", bb: "12", mv: "13", sn: "14", st: "15", th: "16",
};

interface Eintrag {
  ags: string;
  name: string;
  stufe: Mietstufe;
  herkunft: Herkunft;
  land: string;
  kreis: string;
  kreisSchluessel: string;
  stark: string[];
  schwach: string[];
}

const vergleiche = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function erzeugeSuche(daten: MietstufenDaten): (eingabe: SuchEingabe) => SuchErgebnis {
  const stand = daten.meta.gemeindeverzeichnis_basis.gebietsstand ?? "";
  const eintraege: Eintrag[] = daten.gemeinden.map(([ags, name, stufe, herkunft]) => {
    const kreis = daten.kreise[ags.slice(0, 5)] ?? "";
    return { ags, name, stufe, herkunft, land: daten.laender[ags.slice(0, 2)] ?? "", kreis, kreisSchluessel: kreisSchluessel(kreis), ...gemeindeSchluessel(name) };
  });

  const quelle = (e: Eintrag): string => {
    switch (e.herkunft) {
      case "g":
        return `WoGV-Anlage, Gemeindetabelle ${e.land}`;
      case "k":
        return `WoGV-Anlage, Kreistabelle ${e.land}: ${e.kreis} (Gemeinde nicht gesondert aufgeführt, Vorbemerkung der Anlage)`;
      case "i":
        return "WoGV-Anlage, Inseln ohne Festlandanschluss (§ 12 Abs. 4a WoGG)";
      case "n":
        return `WoGV-Anlage, Kreistabelle ${e.land}: ${e.kreis}. Annahme: Gemeinde fehlt im Gemeindeverzeichnis ${stand} (neu gebildet oder neu geschlüsselt), es gilt die Stufe des Kreises`;
    }
  };
  const treffer = (e: Eintrag): MietstufenTreffer => ({ gemeinde: e.name, kreis: e.kreis, land: e.land, mietstufe: e.stufe, quelle: quelle(e) });

  const stark = new Map<string, Eintrag[]>();
  const schwach = new Map<string, Eintrag[]>();
  const locker = new Map<string, Set<Eintrag>>();
  const eintragen = <K>(m: Map<string, K[]>, k: string, e: K): void => {
    const liste = m.get(k);
    if (liste) liste.push(e);
    else m.set(k, [e]);
  };
  for (const e of eintraege) {
    for (const k of e.stark) eintragen(stark, k, e);
    for (const k of e.schwach) eintragen(schwach, k, e);
    for (const k of [...e.stark, ...e.schwach]) {
      const l = lockerSchluessel(k);
      const menge = locker.get(l);
      if (menge) menge.add(e);
      else locker.set(l, new Set([e]));
    }
  }

  const filtere = (liste: readonly Eintrag[], eingabe: SuchEingabe): Eintrag[] => {
    let r = [...liste];
    if (eingabe.land) {
      const l = normalisiere(eingabe.land).replace(/^freistaat /, "");
      const code = KUERZEL[l];
      r = r.filter((e) => normalisiere(e.land) === l || e.ags.slice(0, 2) === code);
    }
    if (eingabe.kreis) {
      const k = kreisSchluessel(eingabe.kreis);
      r = r.filter((e) => e.kreisSchluessel === k || e.kreisSchluessel.startsWith(`${k} `));
    }
    return r;
  };
  const geordnet = (liste: Eintrag[]): Eintrag[] => liste.sort((a, b) => vergleiche(a.land, b.land) || vergleiche(a.name, b.name));
  const mehrdeutig = (liste: Eintrag[]): SuchErgebnis => ({
    status: "mehrdeutig",
    anzahl: liste.length,
    kandidaten: geordnet(liste).slice(0, MAX_KANDIDATEN).map(treffer),
  });

  return (eingabe) => {
    const q0 = normalisiere(eingabe.gemeinde);
    const q1 = ohneTitel(q0);
    const anfragen = [...new Set([q0, q1])].filter((q) => q !== "");

    const gefunden = new Set<Eintrag>();
    for (const q of anfragen) {
      for (const e of stark.get(q) ?? []) gefunden.add(e);
      for (const e of schwach.get(q) ?? []) gefunden.add(e);
    }
    let liste = filtere([...gefunden], eingabe);
    // Nur über den Klammerzusatz oder Schrägstrich gefunden („Frankfurt“ -> Frankfurt (Oder)):
    // Gemeinden, deren Name mit der Eingabe beginnt, gehören dazu („Frankfurt am Main“).
    const hatStarkenTreffer = liste.some((e) => e.stark.some((k) => anfragen.includes(k)));
    const wortAnfang = (e: Eintrag): boolean => e.stark.some((k) => k.startsWith(`${q1} `));
    if (liste.length === 1 && !hatStarkenTreffer) {
      const einziger = liste[0];
      liste = [...liste, ...filtere(eintraege.filter((e) => e !== einziger && wortAnfang(e)), eingabe)];
    }
    if (liste.length === 1 && liste[0]) return { status: "eindeutig", treffer: treffer(liste[0]) };
    if (liste.length > 1) return mehrdeutig(liste);

    // Teilnamen sind nie ein eindeutiger Treffer: „Bad Homburg“ liefert „Bad Homburg v. d. Höhe“ nur als Vorschlag.
    if (anfragen.length === 0) return { status: "nicht_gefunden", aehnlich: [] };
    const teilname = filtere(
      eintraege.filter((e) => e.stark.some((k) => k.startsWith(`${q1} `) || ` ${k} `.includes(` ${q1} `))),
      eingabe,
    );

    // Lockere Umlautsuche („Munchen“ findet „München“). Der Index ist gelockert, die Eingabe nicht:
    // „aue“ darf nicht zu „au“ werden. Ein lockerer Treffer ist nur eindeutig, wenn kein Teilname
    // dagegen spricht („Hochheim“ ist nicht Höchheim, solange es Hochheim am Main gibt).
    const lose = filtere([...(locker.get(q0) ?? locker.get(q1) ?? [])], eingabe);
    if (lose.length === 1 && lose[0] && teilname.length === 0) return { status: "eindeutig", treffer: treffer(lose[0]) };
    if (lose.length > 0) {
      const zusammen = [...new Set([...lose, ...teilname])];
      if (lose.length > 1) return mehrdeutig(zusammen);
      return { status: "nicht_gefunden", aehnlich: geordnet(zusammen).slice(0, MAX_AEHNLICH).map(treffer) };
    }

    if (teilname.length > 0) return { status: "nicht_gefunden", aehnlich: geordnet(teilname).slice(0, MAX_AEHNLICH).map(treffer) };
    const grenze = q1.length >= 5 ? ABSTAND_LANG : q1.length === 4 ? ABSTAND_KURZ : -1;
    if (grenze < 0) return { status: "nicht_gefunden", aehnlich: [] };
    const nah = filtere(eintraege, eingabe)
      .map((e): [number, Eintrag] => [Math.min(...e.stark.map((k) => abstand(q1, k))), e])
      .filter(([d]) => d <= grenze)
      .sort((x, y) => x[0] - y[0] || vergleiche(x[1].name, y[1].name));
    return { status: "nicht_gefunden", aehnlich: nah.slice(0, MAX_AEHNLICH).map(([, e]) => treffer(e)) };
  };
}
