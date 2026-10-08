import type { GemeindeZeile, Herkunft, MietstufenDaten, QuellenNachweis } from "../../src/mietstufen/typen";
import type { Mietstufe } from "../../src/rechtsstand/typen";
import type { AnlageZeile } from "./anlage";
import type { Gv } from "./gv";
import { findeKandidaten, LAENDER, LAND_ZU_KUERZEL, verknuepfe, type Handzuordnung, type Verknuepfung } from "./verknuepfen";

// Die 28 Gemeinden auf Inseln ohne Festlandanschluss, § 12 Abs. 4a WoGG (Abruf 08.10.2026).
// Das Gesetz schreibt „Borkum (Stadt)“, das Verzeichnis „Borkum, Stadt“; deshalb von Hand auf AGS
// gebracht. Der Test vergleicht jede Zeile mit dem Gesetzestext und dem Verzeichnis.
export const INSEL_GEMEINDEN: readonly { gesetz: string; ags: string }[] = [
  { gesetz: "Baltrum", ags: "03452002" },
  { gesetz: "Borkum (Stadt)", ags: "03457002" },
  { gesetz: "Juist", ags: "03452013" },
  { gesetz: "Langeoog", ags: "03462007" },
  { gesetz: "Norderney (Stadt)", ags: "03452020" },
  { gesetz: "Spiekeroog", ags: "03462014" },
  { gesetz: "Wangerooge (Nordseebad)", ags: "03455021" },
  { gesetz: "Nebel", ags: "01054085" },
  { gesetz: "Norddorf auf Amrum", ags: "01054089" },
  { gesetz: "Wittdün auf Amrum", ags: "01054160" },
  { gesetz: "Alkersum", ags: "01054005" },
  { gesetz: "Borgsum", ags: "01054015" },
  { gesetz: "Dunsum", ags: "01054025" },
  { gesetz: "Midlum", ags: "01054083" },
  { gesetz: "Nieblum", ags: "01054087" },
  { gesetz: "Oevenum", ags: "01054094" },
  { gesetz: "Oldsum", ags: "01054098" },
  { gesetz: "Süderende", ags: "01054129" },
  { gesetz: "Utersum", ags: "01054143" },
  { gesetz: "Witsum", ags: "01054158" },
  { gesetz: "Wrixum", ags: "01054163" },
  { gesetz: "Wyk auf Föhr (Stadt)", ags: "01054164" },
  { gesetz: "Helgoland", ags: "01056025" },
  { gesetz: "Gröde", ags: "01054039" },
  { gesetz: "Hallig Hooge", ags: "01054050" },
  { gesetz: "Langeneß", ags: "01054074" },
  { gesetz: "Pellworm", ags: "01054103" },
  { gesetz: "Insel Hiddensee", ags: "13073040" },
];

export interface ErzeugenEingabe {
  anlage: readonly AnlageZeile[];
  basis: Gv; // Gebietsstand für die Zuordnung der Anlage
  aktuell: Gv; // Namen und Kreise, die Nutzer heute eintippen
  nachweise: { anlage: QuellenNachweis; basis: QuellenNachweis; aktuell: QuellenNachweis };
  // Nur Tests setzen die beiden folgenden Felder; sonst gelten INSEL_GEMEINDEN und HANDZUORDNUNG.
  inseln?: readonly { gesetz: string; ags: string }[];
  handzuordnung?: readonly Handzuordnung[];
}

export interface Alias {
  von: string; // AGS im Basisverzeichnis
  nach: string; // AGS im aktuellen Verzeichnis
  name: string; // Name in der Anlage
}

export interface ErzeugenErgebnis {
  daten: MietstufenDaten;
  verknuepfung: Verknuepfung;
  aliase: Alias[]; // Anlage-Gemeinden, deren AGS sich seit dem Basisverzeichnis geändert hat
}

const HINWEIS = (basis: string, aktuell: string): string =>
  `Gemeindeverzeichnis: © Statistisches Bundesamt (Destatis) im Auftrag der Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder, GV-ISys, Gebietsstand ${aktuell} und ${basis}. Vervielfältigung und Verbreitung mit Quellenangabe gestattet. In dieser Datei nur als Berechnungsgrundlage verwendet und verändert dargestellt (Zuordnung Gemeinde, Kreis, Mietenstufe). Mietenstufen: Anlage zu § 1 Abs. 3 WoGV, amtliches Werk (§ 5 UrhG). Die MIT-Lizenz des Repositoriums gilt nicht für diese Datei.`;

export function erzeugeMietstufen(e: ErzeugenEingabe): ErzeugenErgebnis {
  const verknuepfung = verknuepfe(e.anlage, e.basis, e.handzuordnung);
  if (verknuepfung.offen.length > 0) {
    const liste = verknuepfung.offen.map((o) => `${o.zeile.land}, ${o.zeile.name}: ${o.kandidaten.join(" ; ") || "kein Kandidat"}`);
    throw new Error(`Anlage-Zeilen ohne eindeutige Zuordnung (in HANDZUORDNUNG eintragen):\n${liste.join("\n")}`);
  }

  const inselZeilen = e.anlage.filter((z) => z.art === "insel");
  if (inselZeilen.length !== 1 || !inselZeilen[0]) throw new Error(`Anlage: erwartet genau eine Inselzeile, gefunden ${inselZeilen.length}`);
  const inselStufe: Mietstufe = inselZeilen[0].stufe;

  const aktuellAgs = new Set(e.aktuell.gemeinden.map((g) => g.ags));
  const aktuellKreise = new Map(e.aktuell.kreise.map((k) => [k.kkz, k.name]));
  const basisAgs = new Set(e.basis.gemeinden.map((g) => g.ags));

  const kreisStufe = new Map<string, Mietstufe>();
  for (const k of verknuepfung.kreise) {
    if (!aktuellKreise.has(k.kkz)) throw new Error(`Kreis ${k.kkz} (${k.zeile.name}) fehlt im aktuellen Verzeichnis`);
    kreisStufe.set(k.kkz, k.zeile.stufe);
  }

  const gemeindeStufe = new Map<string, Mietstufe>();
  const aliase: Alias[] = [];
  for (const g of verknuepfung.gemeinden) {
    if (aktuellAgs.has(g.ags)) {
      gemeindeStufe.set(g.ags, g.zeile.stufe);
      continue;
    }
    // AGS seit dem Basisverzeichnis geändert (Langelsheim, Eisenach): über den Namen im selben Land.
    const lc = LAND_ZU_KUERZEL.get(g.zeile.land ?? "") ?? "";
    const { verfahren, treffer } = findeKandidaten(g.zeile.name, e.aktuell.gemeinden.filter((x) => x.ags.startsWith(lc)));
    const neu = treffer[0];
    if (treffer.length > 1) {
      const liste = treffer.map((t) => `${t.name} (${t.ags})`).join(" ; ");
      throw new Error(`Anlage-Gemeinde ${g.zeile.name} (${g.ags}) fehlt im aktuellen Verzeichnis, der Name ist im Land nicht eindeutig: ${liste}`);
    }
    if (!verfahren || !neu) throw new Error(`Anlage-Gemeinde ${g.zeile.name} (${g.ags}) fehlt im aktuellen Verzeichnis und ist nicht über den Namen zu finden`);
    aliase.push({ von: g.ags, nach: neu.ags, name: g.zeile.name });
    gemeindeStufe.set(neu.ags, g.zeile.stufe);
  }

  const inseln = e.inseln ?? INSEL_GEMEINDEN;
  for (const i of inseln) {
    if (!aktuellAgs.has(i.ags)) throw new Error(`Insel ${i.gesetz}: AGS ${i.ags} fehlt im aktuellen Verzeichnis`);
  }
  const inselAgs = new Set(inseln.map((i) => i.ags));

  const gemeinden: GemeindeZeile[] = [];
  const jeHerkunft: Record<Herkunft, number> = { g: 0, k: 0, i: 0, n: 0 };
  for (const g of [...e.aktuell.gemeinden].sort((a, b) => (a.ags < b.ags ? -1 : 1))) {
    let stufe: Mietstufe | undefined;
    let herkunft: Herkunft;
    if (inselAgs.has(g.ags)) {
      stufe = inselStufe;
      herkunft = "i";
    } else if (gemeindeStufe.has(g.ags)) {
      stufe = gemeindeStufe.get(g.ags);
      herkunft = "g";
    } else {
      stufe = kreisStufe.get(g.ags.slice(0, 5));
      herkunft = basisAgs.has(g.ags) ? "k" : "n";
    }
    if (stufe === undefined) throw new Error(`Gemeinde ${g.ags} ${g.name}: Kreis ${g.ags.slice(0, 5)} hat keine Stufe in der Anlage`);
    jeHerkunft[herkunft]++;
    gemeinden.push([g.ags, g.name, stufe, herkunft]);
  }

  const nachweis = (n: QuellenNachweis, gebietsstand?: string): QuellenNachweis => ({
    titel: n.titel,
    url: n.url,
    abruf: n.abruf,
    sha256: n.sha256,
    ...(gebietsstand ? { gebietsstand } : {}),
  });

  const daten: MietstufenDaten = {
    meta: {
      rechtsgrundlage: "Anlage zu § 1 Abs. 3 WoGV (Mietenstufen ab 1. Januar 2023); Inseln nach § 12 Abs. 4a WoGG",
      anlage: nachweis(e.nachweise.anlage),
      gemeindeverzeichnis_basis: nachweis(e.nachweise.basis, e.basis.gebietsstand),
      gemeindeverzeichnis_aktuell: nachweis(e.nachweise.aktuell, e.aktuell.gebietsstand),
      hinweis: HINWEIS(e.basis.gebietsstand, e.aktuell.gebietsstand),
      anzahl: { anlage_zeilen: e.anlage.length, gemeinden: gemeinden.length, kreise: aktuellKreise.size, je_herkunft: jeHerkunft },
    },
    laender: { ...LAENDER },
    kreise: Object.fromEntries([...aktuellKreise].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    gemeinden,
  };
  return { daten, verknuepfung, aliase };
}

// Feste Ausgabe, eine Gemeinde je Zeile: gut lesbare Diffs, und die Gegentests finden jede Zeile wörtlich.
export function serialisiere(d: MietstufenDaten): string {
  const zeilen = d.gemeinden.map((g) => JSON.stringify(g));
  return `{\n"meta":${JSON.stringify(d.meta)},\n"laender":${JSON.stringify(d.laender)},\n"kreise":${JSON.stringify(d.kreise)},\n"gemeinden":[\n${zeilen.join(",\n")}\n]\n}\n`;
}
