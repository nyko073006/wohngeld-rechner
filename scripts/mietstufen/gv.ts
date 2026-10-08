import { leseXlsx } from "./xlsx";

// Destatis-Gemeindeverzeichnis (GV-ISys), Auszug "Alle politisch selbständigen Gemeinden".
// Blatt 1 "Inhalt" trägt Gebietsstand und Verbreitungsvermerk, Blatt 2 die Daten.
export interface GvGemeinde {
  ags: string; // 8 Stellen: Land (2) + Regierungsbezirk (1) + Kreis (2) + Gemeinde (3)
  name: string;
  textkennzeichen: string; // "61" bis "67" bei Gemeinden (Stadt, Markt, ...)
  einwohner: number | null;
}

export interface GvKreis {
  kkz: string; // 5 Stellen: Land + Regierungsbezirk + Kreis
  name: string;
  textkennzeichen: string; // 41 kreisfreie Stadt, 42 Stadtkreis, 43 Kreis, 44 Landkreis, 45 Regionalverband
  kreisfrei: boolean;
}

export interface Gv {
  gebietsstand: string; // "TT.MM.JJJJ" aus dem Blatt "Inhalt"
  vermerk: string; // Verbreitungsvermerk wörtlich, Zeilen mit " / " verbunden
  gemeinden: GvGemeinde[]; // Satzart 60 ohne gemeindefreie Gebiete (Textkennzeichen 65, 66)
  kreise: GvKreis[]; // Satzart 40
}

export function leseGv(daten: Buffer): Gv {
  const [inhalt, datenblatt] = leseXlsx(daten);
  if (!inhalt || !datenblatt || !datenblatt.name.startsWith("Onlineprodukt_Gemeinden")) {
    throw new Error("Gemeindeverzeichnis: Blattaufbau unbekannt (erwartet Inhalt, Onlineprodukt_Gemeinden*)");
  }
  const texte = inhalt.zeilen.flatMap((z) => z.filter((c): c is string => c !== null));
  const stand = texte.map((t) => /Gebietsstand:\s*(\d{2}\.\d{2}\.\d{4})/.exec(t)?.[1]).find((s) => s !== undefined);
  if (!stand) throw new Error("Gemeindeverzeichnis: Gebietsstand im Blatt Inhalt nicht gefunden");
  const ab = texte.findIndex((t) => t.startsWith("©"));
  const vermerk = ab < 0 ? "" : texte.slice(ab, ab + 3).map((t) => t.trim()).join(" / ");

  const gemeinden: GvGemeinde[] = [];
  const kreise: GvKreis[] = [];
  for (const z of datenblatt.zeilen) {
    const satzart = z[0];
    const tk = z[1];
    const name = z[7];
    if (!name) continue;
    if (satzart === "60" && tk !== "65" && tk !== "66") {
      const ags = `${z[2] ?? ""}${z[3] ?? ""}${z[4] ?? ""}${z[6] ?? ""}`;
      if (!/^\d{8}$/.test(ags)) throw new Error(`Gemeindeverzeichnis: AGS "${ags}" bei ${name}`);
      const ew = z[9];
      gemeinden.push({ ags, name, textkennzeichen: tk ?? "", einwohner: ew === null || ew === undefined ? null : Number(ew) });
    } else if (satzart === "40") {
      const kkz = `${z[2] ?? ""}${z[3] ?? ""}${z[4] ?? ""}`;
      if (!/^\d{5}$/.test(kkz)) throw new Error(`Gemeindeverzeichnis: Kreisschlüssel "${kkz}" bei ${name}`);
      kreise.push({ kkz, name, textkennzeichen: tk ?? "", kreisfrei: tk === "41" || tk === "42" });
    }
  }
  return { gebietsstand: stand, vermerk, gemeinden, kreise };
}
