# E2: Einkommen, Ausschluss, Gesamtablauf – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Engine rechnet aus einer vollständigen Haushaltseingabe (Mitglieder mit Einnahmen, Miete, Mietstufe, Stichtag) das Wohngeld mit Rechenweg, Annahmen und Ausschlussgrund; alle 11 BMWSB-Beispiele stimmen von den Einnahmen bis zum Betrag.

**Architecture:** Neue reine Module unter `src/engine/`: Eingabetypen (`eingabe.ts`), Jahreseinkommen je Mitglied nach §§ 14 bis 16 (`einkommen/jahreseinkommen.ts`), Gesamteinkommen mit Freibeträgen und Unterhalt nach §§ 13, 17, 17a, 18 (`einkommen/gesamteinkommen.ts`), Ausschluss nach §§ 7, 21 (`ausschluss.ts`) und der Gesamtablauf (`berechnen.ts`), der Ausschluss, Einkommen, Miete und Formel verbindet. Die Beträge stehen als Daten im Rechtsstand (`einkommen`-Block), der Rechtsstand wird tief eingefroren.

**Tech Stack:** TypeScript 5.9, Node 22, Vitest 5, decimal.js 10 (über `D` aus `src/engine/dezimal.ts`).

**Spec:** `docs/superpowers/specs/2026-10-07-wohngeld-rechner-design.md` (Abschnitte 3.2, 4 `wohngeld_berechnen`, 5, 6 Nr. 3 und 4, 7 E2).

**Quellen:** `docs/quellen/2026-10-08-recherche-einkommen-wortlaut.md` (Wortlaut §§ 5 bis 7, 13 bis 18, 21 WoGG, gegen gii-XML geprüft) und `docs/quellen/2026-10-08-recherche-einkommen-betraege.md` (Beträge 2025/2026, WoGVwV, BEEG).

**Ausgangsstand:** Branch `bau/e2` im Worktree `~/Developer/worktrees/wohngeld-rechner-e2`, abgezweigt von `bau/e0-e1` (871a19c). Vor dem Start: `npx vitest run` 64/64 grün.

## Global Constraints

- Nur öffentliche Quellen. Jede Zahl im Rechtsstand trägt ihre Fundstelle als Kommentar.
- Kein Logging und keine Speicherung von Eingaben.
- Kein „amtlich“, kein Bundesadler, kein Auftreten als Behörde. Jede Gesamtantwort enthält wörtlich „Unverbindliche Schätzung. Über den Anspruch entscheidet die Wohngeldbehörde.“
- Geldbeträge werden in der Engine nur mit `D` (decimal.js) verrechnet, nie mit `number`-Arithmetik. `number` nur an der Eingabe und für ganze Euro im Ergebnis.
- Y wird nicht gerundet (das Gesetz nennt keine Rundung); Anzeige mit `toFixed(2)`, weitergerechnet wird der ungerundete Wert.
- Engine-Funktionen sind rein: kein `Date.now()`, kein Netz, kein Dateisystem. Der Stichtag ist Eingabe.
- Abhängigkeiten nur `engine → rechtsstand`, nie umgekehrt.
- Code-Bezeichner und Kommentare auf Deutsch, wie im bestehenden Code (`berechneMiete`, `EingabeFehler`).
- Eingabefehler werfen `EingabeFehler(feld, meldung)` mit Feldpfad wie `mitglieder[1].einnahmen[0].betragMonatlich`.
- Jeder Test zu einer Einnahmeart oder einem Freibetrag nennt die Norm im Testnamen.
- Commits enden mit
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01G9peWGoGjXLUNJg2fCx3Mi
  ```
- Gearbeitet wird nur im Worktree `~/Developer/worktrees/wohngeld-rechner-e2` (Haupt-Repo liegt in iCloud). Kein Merge, kein Push.

## Einnahmearten (Festlegung nach Spec 3.2)

Eingabe je Mitglied: Liste `{ art, betragMonatlich, … }`. Jahresbetrag = 12 × Monatsbetrag (§ 15 Abs. 1), Sonderzahlungen kommen jährlich dazu (§ 15 Abs. 3).

| Art (`art`) | Norm | Regel |
|---|---|---|
| `nichtselbstaendig` | § 14 Abs. 1 WoGG, § 19 EStG; auch Aktivrente § 14 Abs. 2 Nr. 12 | Brutto + `sonderzahlungJaehrlich` minus Werbungskosten, mindestens 1.230 € (§ 9a Satz 1 Nr. 1a EStG), höchstens bis zur Höhe der Einnahmen. Aktivrente: Gesamtlohn hier eintragen |
| `minijob_pauschal` | § 14 Abs. 1 Satz 3 Nr. 2 WoGG (§ 40a EStG) | Einnahmen minus tatsächliche Aufwendungen, kein Pauschbetrag, nicht unter 0 (BMWSB-Beispiel 6) |
| `rente` | § 14 Abs. 1 (§ 22 EStG) mit Abs. 2 Nr. 3 | voller Rentenbetrag minus 102 € (§ 9a Satz 1 Nr. 3 EStG), höchstens bis zur Höhe |
| `versorgungsbezug` | § 14 Abs. 1 (§ 19 EStG) mit Abs. 2 Nr. 1 | voller Betrag minus 102 € (§ 9a Satz 1 Nr. 1b EStG), eigener Pauschbetrag neben der Rente |
| `selbstaendig` | § 14 Abs. 1 Satz 1, 4 (§§ 13, 15, 18 EStG) | Gewinn; negative Summe zählt 0, kein Ausgleich mit anderen Arten |
| `vermietung` | § 14 Abs. 1 Satz 1, 4 (§ 21 EStG) | Überschuss; negative Summe zählt 0 |
| `kapital` | § 14 Abs. 1 (§ 20 EStG) mit Abs. 2 Nr. 15 | Einkünfte = Erträge − min(Erträge, 1.000 €); dazu der steuerfreie Teil, soweit er 100 € übersteigt. Ergibt Erträge − 100 € (WoGVwV Nr. 17.03.5 Beispiel 2: 1.301 € → 1.201 €) |
| `lohnersatz` | § 14 Abs. 2 Nr. 6 | voll (ALG I, Krankengeld, Kurzarbeitergeld, Mutterschaftsgeld, Insolvenzgeld …) |
| `elterngeld` | § 14 Abs. 2 Nr. 6 mit § 10 BEEG | Monatsbetrag über 300 € (Elterngeld Plus: 150 €) zählt |
| `zuschlaege_3b` | § 14 Abs. 2 Nr. 11 | voll |
| `unterhalt` | § 14 Abs. 2 Nr. 19, Nr. 20 Buchst. a | voll (Kindes- und Ehegattenunterhalt von Personen außerhalb des Haushalts) |
| `zuwendung_dritter` | § 14 Abs. 2 Nr. 19 Buchst. b | Jahresbetrag über 480 € zählt |
| `unterhaltsvorschuss` | § 14 Abs. 2 Nr. 21 | voll, ohne Pauschbetrag (BMWSB-Beispiel 5) |
| `ausbildungsfoerderung` | § 14 Abs. 2 Nr. 27 | Hälfte (BAföG-Zuschuss, BAB, Stipendien) |
| `sonstige_voll` + `nummer` | § 14 Abs. 2 Nr. 2, 4, 5, 7, 9, 14, 16, 17, 18, 20, 22, 28, 30, 31 | voll |
| `sonstige_haelfte` + `nummer` | § 14 Abs. 2 Nr. 8, 10, 24, 25, 26, 29 | Hälfte |

Damit ist jede Nummer aus § 14 Abs. 2 erfasst (Nr. 13 und 23 sind weggefallen). Kindergeld ist keine Einnahme nach § 14 und hat keine Art.

Danach je Mitglied: Summe × (1 − 0,1 × Zahl der zutreffenden Kategorien Steuern, KV/PV, RV) (§ 16). Freibeträge und Unterhalt (§§ 17, 17a, 18) werden vom Gesamteinkommen abgezogen, Y = Gesamteinkommen / 12 (§ 13).

## Rulings in diesem Plan

- Freibetrag § 17 Nr. 4 bemisst sich nach den eigenen Erwerbseinnahmen nach Werbungskosten und nach § 16 (WoGVwV Nr. 17.03.5): `nichtselbstaendig`, `minijob_pauschal`, `selbstaendig`, `zuschlaege_3b`.
- § 17 Nr. 3 (1.320 €) einmal je Haushalt (Wortlaut „wenn“), als Haushaltsmerkmal `alleinerziehend`.
- Grundrentenfreibetrag (§ 17a) aus der Summe der als `rente` angegebenen Beträge (brutto), Deckel 12 × 50 % × Regelbedarfsstufe 1 (563 € in 2025 und 2026) = 3.378 €.
- Vermögen (§ 21 Nr. 3): Regelgrenze 60.000 € für das erste plus 30.000 € je weiteres zu berücksichtigendes Mitglied (WoGVwV Nr. 21.37 Abs. 1). „Übersteigt“ heißt: genau an der Grenze kein Ausschluss.
- Kapitalerträge: Nr. 15 setzt den steuerfreien Sparer-Pauschbetrag an, soweit er 100 € übersteigt; im Ergebnis zählen die Erträge minus 100 € (WoGVwV Nr. 17.03.5 Beispiel 2, Ruling in SDD-Runde Task 2). Der Sparer-Pauschbetrag kürzt sich heraus; Zusammenveranlagung spielt deshalb keine Rolle.
- Gesamteinkommen wird nicht negativ (Untergrenze 0); die Formel ersetzt Y ohnehin durch den Mindestwert.
- Aus der E1-Gesamt-Review: Zuschlagsdeckel § 19 Abs. 3 ist das M aus § 11 vor dem Mindestwert-Ersatz; negatives Ergebnis hat den Grund „rechnerisch kein Wohngeld“ statt Bagatellgrenze; Annahme „kein Zuschlag bei 0 €“ wird ausgegeben, wenn sie greift; Rechtsstand tief eingefroren; Anteil nach § 11 Abs. 3 als eigener Rechenschritt.

## Review Focus

1. Stichtag im Jahr 2026 (Aktivrente seit 01.01.2026, „Grundsicherungsgeld“ seit 01.07.2026): erwartet wird dasselbe Ergebnis wie 2025, weil sich keine Beträge ändern. Test in Task 6.
2. Ausgeschlossenes Mitglied mit eigenen Einnahmen: Seine Einnahmen dürfen nicht zählen. Test in Task 6 (Beispiel 10 mit Einnahmen beim Sohn).
3. Freibeträge größer als das Einkommen: Y wird 0, nicht negativ, und die Formel rechnet mit dem Mindestwert. Test in Task 3 und Task 6.
4. Unterhalt gezahlt über dem Höchstbetrag ohne Titel: wird gedeckelt; mit Titel voll. Test in Task 3.
5. Kapitalerträge knapp unter und über 100 € im Jahr: 96 € ergeben 0, 108 € ergeben 8 €. Test in Task 2.

---

### Task 1: Rechtsstand um Einkommenswerte erweitern und tief einfrieren

**Files:**
- Create: `src/rechtsstand/einfrieren.ts`
- Modify: `src/rechtsstand/typen.ts` (neuer Typ `EinkommenWerte`, `UNTERHALT_ARTEN`, Feld `einkommen` in `Rechtsstand`)
- Modify: `src/rechtsstand/wogg-2025.ts` (Block `einkommen`, Einfrieren)
- Test: `test/rechtsstand/rechtsstand.test.ts` (anhängen)

**Interfaces:**
- Consumes: `Rechtsstand`, `WOGG_2025` aus E1
- Produces: `rs.einkommen: EinkommenWerte` mit den Feldern unten; `UNTERHALT_ARTEN`, `type UnterhaltArt` (exportiert über `src/rechtsstand/index.ts`, das `export * from "./typen"` schon hat); `tiefEinfrieren<T>(wert: T): T`

- [ ] **Step 1: Failing test anhängen** in `test/rechtsstand/rechtsstand.test.ts` (Import `WOGG_2025` aus `../../src/rechtsstand` ergänzen, falls nicht vorhanden):

Bewusst kein Test, der die Einkommenswerte per `toEqual` festnagelt: Er würde jede Daten-Mutation in Task 7 von selbst rot machen, und die Gegentests sagten nichts mehr darüber, ob die Engine den Wert benutzt. Die Werte prüfen die Verhaltenstests in Task 2 bis 6.

```ts
describe("Rechtsstand 2025: Einkommenswerte vorhanden (§§ 14 bis 18, 21 WoGG)", () => {
  it("jeder Einkommenswert ist eine Zahl oder ein Dezimal-String", () => {
    const { unterhaltHoechst, ...rest } = WOGG_2025.einkommen;
    expect(Object.keys(rest)).toHaveLength(17);
    for (const wert of [...Object.values(rest), ...Object.values(unterhaltHoechst)])
      expect(typeof wert === "number" || /^\d+(\.\d+)?$/.test(String(wert))).toBe(true);
    expect(Object.keys(unterhaltHoechst).sort()).toEqual(["auswaerts_ausbildung", "ehegatte", "kind_wechselmodell", "sonstige"]);
  });
});

describe("Rechtsstand ist tief eingefroren", () => {
  it("verschachtelte Werte lassen sich zur Laufzeit nicht ändern", () => {
    expect(Object.isFrozen(WOGG_2025)).toBe(true);
    expect(Object.isFrozen(WOGG_2025.hoechstbetraege.bis5[1])).toBe(true);
    expect(Object.isFrozen(WOGG_2025.einkommen.unterhaltHoechst)).toBe(true);
    expect(() => {
      (WOGG_2025.koeffizienten[1] as { a: string }).a = "9";
    }).toThrow(TypeError);
    expect(WOGG_2025.koeffizienten[1].a).toBe("0.04");
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss rot sein**

Run: `npx vitest run test/rechtsstand/rechtsstand.test.ts`
Expected: FAIL (`einkommen` ist undefined, Objekt nicht eingefroren). Ein TypeScript-Fehler „Property 'einkommen' does not exist“ zählt nur als rot, wenn vitest ihn als fehlgeschlagenen Test meldet; sonst Step 3 zuerst mit dem Typ beginnen.

- [ ] **Step 3: Typen ergänzen** in `src/rechtsstand/typen.ts` (unter `Koeffizienten`, vor `Rechtsstand`):

```ts
// § 18 WoGG Satz 1 Nr. 1 bis 4.
export const UNTERHALT_ARTEN = ["auswaerts_ausbildung", "kind_wechselmodell", "ehegatte", "sonstige"] as const;
export type UnterhaltArt = (typeof UNTERHALT_ARTEN)[number];

// Beträge der Einkommensermittlung, jährlich, wenn nicht anders vermerkt.
export interface EinkommenWerte {
  arbeitnehmerPauschbetrag: number; // § 9a Satz 1 Nr. 1a EStG
  versorgungsPauschbetrag: number; // § 9a Satz 1 Nr. 1b EStG
  rentenPauschbetrag: number; // § 9a Satz 1 Nr. 3 EStG
  sparerPauschbetrag: number; // § 20 Abs. 9 EStG, je Person
  kapitalSchwelle: number; // § 14 Abs. 2 Nr. 15 WoGG
  abzugsSatz: string; // § 16 WoGG, je Kategorie
  elterngeldFreiMonatlich: number; // § 10 Abs. 1 BEEG, monatlich
  zuwendungDritterFrei: number; // § 14 Abs. 2 Nr. 19 Buchst. b WoGG
  freibetragSchwerbehindert: number; // § 17 Nr. 1 WoGG
  freibetragNsVerfolgt: number; // § 17 Nr. 2 WoGG
  freibetragAlleinerziehend: number; // § 17 Nr. 3 WoGG
  freibetragKindErwerbHoechst: number; // § 17 Nr. 4 WoGG
  grundrenteSockel: number; // § 17a Abs. 1 Satz 2 WoGG
  grundrenteSatz: string; // § 17a Abs. 1 Satz 2 WoGG
  regelbedarfsstufe1: number; // Anlage zu § 28 SGB XII, monatlich
  unterhaltHoechst: Record<UnterhaltArt, number>; // § 18 WoGG
  vermoegenErstes: number; // WoGVwV Nr. 21.37 Abs. 1 Nr. 1
  vermoegenWeiteres: number; // WoGVwV Nr. 21.37 Abs. 1 Nr. 2
}
```

und im Interface `Rechtsstand` als letztes Feld:

```ts
  einkommen: EinkommenWerte; // §§ 13 bis 18, 21 Nr. 3
```

- [ ] **Step 4: `src/rechtsstand/einfrieren.ts` anlegen**

```ts
// Rechtsstände sind Modulkonstanten. Ein Worker-Isolate teilt sie über Anfragen hinweg;
// eingefroren kann keine Anfrage die Werte für die nächste verändern.
export function tiefEinfrieren<T>(wert: T): T {
  if (wert !== null && typeof wert === "object" && !Object.isFrozen(wert)) {
    for (const kind of Object.values(wert)) tiefEinfrieren(kind);
    Object.freeze(wert);
  }
  return wert;
}
```

- [ ] **Step 5: `src/rechtsstand/wogg-2025.ts` ergänzen.** Import `import { tiefEinfrieren } from "./einfrieren";`, die Zuweisung auf `export const WOGG_2025: Rechtsstand = tiefEinfrieren({` … `});` umstellen und nach `bagatellgrenze: 10,` einfügen:

```ts

  // Einkommen. Belege: docs/quellen/2026-10-08-recherche-einkommen-betraege.md (Abruf 08.10.2026).
  // Alle Werte gelten unverändert 2025 und 2026.
  einkommen: {
    // § 9a Satz 1 Nr. 1a, 1b und 3 EStG, https://www.gesetze-im-internet.de/estg/__9a.html
    arbeitnehmerPauschbetrag: 1230,
    versorgungsPauschbetrag: 102,
    rentenPauschbetrag: 102,
    // § 20 Abs. 9 EStG; § 14 Abs. 2 Nr. 15 WoGG (Schwelle 100 €)
    sparerPauschbetrag: 1000,
    kapitalSchwelle: 100,
    // § 16 Satz 1 WoGG: jeweils 10 Prozent
    abzugsSatz: "0.1",
    // § 10 Abs. 1 BEEG: 300 € im Monat anrechnungsfrei
    elterngeldFreiMonatlich: 300,
    // § 14 Abs. 2 Nr. 19 Buchst. b WoGG
    zuwendungDritterFrei: 480,
    // § 17 Nr. 1 bis 4 WoGG, https://www.gesetze-im-internet.de/wogg/__17.html
    freibetragSchwerbehindert: 1800,
    freibetragNsVerfolgt: 750,
    freibetragAlleinerziehend: 1320,
    freibetragKindErwerbHoechst: 1200,
    // § 17a Abs. 1 WoGG; RBS 1 = 563 € in 2025 und 2026 (RBSFV 2026, BGBl. 2025 I Nr. 243, Nullrunde)
    grundrenteSockel: 1200,
    grundrenteSatz: "0.3",
    regelbedarfsstufe1: 563,
    // § 18 Satz 1 Nr. 1 bis 4 WoGG
    unterhaltHoechst: { auswaerts_ausbildung: 3000, kind_wechselmodell: 3000, ehegatte: 6000, sonstige: 3000 },
    // WoGVwV vom 28.06.2017 Nr. 21.37 Abs. 1, https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_28062017_SWII4.htm
    vermoegenErstes: 60000,
    vermoegenWeiteres: 30000,
  },
```

- [ ] **Step 6: Tests und Typprüfung**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle Tests grün (64 + 2), tsc ohne Ausgabe. Meckert tsc beim Einfrieren über die Typableitung, `tiefEinfrieren<Rechtsstand>({ … })` schreiben. `npm run gegentest` muss weiter 13 rot / 0 grün liefern (die Mutations-Strings in `wogg-2025.ts` sind unverändert).

- [ ] **Step 7: Commit**

```bash
git add src/rechtsstand test/rechtsstand
git commit -m "E2: Einkommenswerte im Rechtsstand 2025, Rechtsstand tief eingefroren"
```

---

### Task 2: Eingabetypen und Jahreseinkommen je Mitglied (§§ 14 bis 16)

**Files:**
- Create: `src/engine/eingabe.ts`
- Create: `src/engine/einkommen/jahreseinkommen.ts`
- Test: `test/engine/jahreseinkommen.test.ts`

**Interfaces:**
- Consumes: `Rechtsstand`, `rs.einkommen` (Task 1); `D`, `Dezimal` aus `src/engine/dezimal.ts`; `EingabeFehler`, `Rechenschritt` aus `src/engine/rechenweg.ts`; `Mietstufe`, `UnterhaltArt` aus `src/rechtsstand`
- Produces:
  - `EINNAHME_ARTEN`, `type EinnahmeArt`, `NUMMERN_VOLL`, `NUMMERN_HAELFTE`, `AUSSCHLUSS_LEISTUNGEN`, `type AusschlussLeistung`, `interface Einnahme`, `interface MitgliedEingabe`, `interface UnterhaltZahlung`, `interface HaushaltEingabe` (alle in `eingabe.ts`)
  - `berechneJahreseinkommen(rs: Rechtsstand, m: MitgliedEingabe, index: number): MitgliedEinkommen`
  - `interface MitgliedEinkommen { summe: Dezimal; abzugProzent: number; jahreseinkommen: Dezimal; erwerbseinkommen: Dezimal; renteJaehrlich: Dezimal; schritt: Rechenschritt; annahmen: string[]; hinweise: string[] }`

- [ ] **Step 1: `src/engine/eingabe.ts` anlegen** (nur Typen und Listen, keine Logik)

```ts
import type { Mietstufe, UnterhaltArt } from "../rechtsstand";

// § 14 WoGG. Regel je Art: siehe src/engine/einkommen/jahreseinkommen.ts und den E2-Plan, Abschnitt „Einnahmearten“.
export const EINNAHME_ARTEN = [
  "nichtselbstaendig",
  "minijob_pauschal",
  "rente",
  "versorgungsbezug",
  "selbstaendig",
  "vermietung",
  "kapital",
  "lohnersatz",
  "elterngeld",
  "zuschlaege_3b",
  "unterhalt",
  "zuwendung_dritter",
  "unterhaltsvorschuss",
  "ausbildungsfoerderung",
  "sonstige_voll",
  "sonstige_haelfte",
] as const;
export type EinnahmeArt = (typeof EINNAHME_ARTEN)[number];

// Nummern aus § 14 Abs. 2 WoGG ohne eigene Art. Nr. 13 und 23 sind weggefallen.
export const NUMMERN_VOLL: readonly number[] = [2, 4, 5, 7, 9, 14, 16, 17, 18, 20, 22, 28, 30, 31];
export const NUMMERN_HAELFTE: readonly number[] = [8, 10, 24, 25, 26, 29];

// § 7 Abs. 1 Satz 1 Nr. 1, 2, 4 bis 9 und Abs. 2 WoGG.
export const AUSSCHLUSS_LEISTUNGEN = [
  "grundsicherungsgeld_sgb2",
  "ausbildung_sgb2_zuschuss",
  "verletztengeld",
  "grundsicherung_alter_em",
  "hilfe_zum_lebensunterhalt",
  "sgb14_lebensunterhalt",
  "asylblg",
  "sgb8_kdu",
  "in_bedarf_beruecksichtigt",
] as const;
export type AusschlussLeistung = (typeof AUSSCHLUSS_LEISTUNGEN)[number];

export interface Einnahme {
  art: EinnahmeArt;
  betragMonatlich: number; // brutto; bei selbstaendig und vermietung Gewinn bzw. Überschuss, darf negativ sein
  werbungskostenMonatlich?: number; // nur nichtselbstaendig und minijob_pauschal
  sonderzahlungJaehrlich?: number; // nur nichtselbstaendig, § 15 Abs. 3 WoGG
  elterngeldPlus?: boolean; // nur elterngeld, § 10 Abs. 3 BEEG
  nummer?: number; // nur sonstige_voll und sonstige_haelfte: Nummer in § 14 Abs. 2 WoGG
}

export interface MitgliedEingabe {
  einnahmen: Einnahme[];
  zahltSteuern: boolean; // § 16 Satz 1 Nr. 1
  zahltKvPv: boolean; // § 16 Satz 1 Nr. 2, auch vergleichbare private Beiträge (Satz 2)
  zahltRv: boolean; // § 16 Satz 1 Nr. 3, auch vergleichbare private Beiträge (Satz 2)
  schwerbehindert?: boolean; // § 17 Nr. 1
  nsVerfolgt?: boolean; // § 17 Nr. 2
  kindUnter25?: boolean; // § 17 Nr. 4: Kind eines Haushaltsmitglieds, noch nicht 25
  grundrentenzeiten33?: boolean; // § 17a
  ausschluss?: AusschlussLeistung; // § 7
}

export interface UnterhaltZahlung {
  art: UnterhaltArt;
  betragMonatlich: number;
  tituliert?: boolean; // § 18 Satz 2: Titel, notarielle Vereinbarung oder Bescheid
}

export interface HaushaltEingabe {
  stichtag: string; // ISO-Datum
  mietstufe: Mietstufe;
  art: "mietzuschuss" | "lastenzuschuss";
  mieteMonatlich: number; // Bruttokaltmiete bzw. Belastung
  mitglieder: MitgliedEingabe[];
  alleinerziehend?: boolean; // § 17 Nr. 3, einmal je Haushalt
  unterhaltGezahlt?: UnterhaltZahlung[]; // § 18
  vermoegen?: number; // § 21 Nr. 3, Summe der zu berücksichtigenden Mitglieder
}
```

- [ ] **Step 2: Failing tests schreiben** in `test/engine/jahreseinkommen.test.ts`

```ts
import { describe, expect, it } from "vitest";
import type { Einnahme, MitgliedEingabe } from "../../src/engine/eingabe";
import { berechneJahreseinkommen } from "../../src/engine/einkommen/jahreseinkommen";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { WOGG_2025 } from "../../src/rechtsstand";

const ohneAbzug = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
function rechne(einnahmen: Einnahme[], extra: Partial<MitgliedEingabe> = {}) {
  return berechneJahreseinkommen(WOGG_2025, { einnahmen, ...ohneAbzug, ...extra }, 0);
}
const jahr = (einnahmen: Einnahme[], extra?: Partial<MitgliedEingabe>) => rechne(einnahmen, extra).jahreseinkommen.toFixed(2);
function fehlerFeld(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof EingabeFehler) return e.feld;
    throw e;
  }
  throw new Error("kein Fehler geworfen");
}

describe("Jahreseinkommen: Einkünfte nach § 14 Abs. 1 WoGG", () => {
  it("§ 9a Nr. 1a EStG: Arbeitslohn minus Pauschbetrag 1.230 €", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000 }])).toBe("22770.00");
  });
  it("§ 9a EStG: höhere Werbungskosten statt Pauschbetrag", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000, werbungskostenMonatlich: 150 }])).toBe("22200.00");
  });
  it("§ 9a Satz 2 EStG: Pauschbetrag höchstens bis zur Höhe der Einnahmen", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 50 }])).toBe("0.00");
  });
  it("§ 15 Abs. 3 WoGG: Sonderzahlung kommt zum Jahresbetrag", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000, sonderzahlungJaehrlich: 1200 }])).toBe("23970.00");
  });
  it("§ 14 Abs. 1 Satz 3 Nr. 2 WoGG: Minijob minus tatsächliche Aufwendungen, ohne Pauschbetrag", () => {
    expect(jahr([{ art: "minijob_pauschal", betragMonatlich: 520, werbungskostenMonatlich: 20 }])).toBe("6000.00");
    expect(jahr([{ art: "minijob_pauschal", betragMonatlich: 100, werbungskostenMonatlich: 150 }])).toBe("0.00");
  });
  it("§ 14 Abs. 2 Nr. 3 WoGG, § 9a Nr. 3 EStG: Rente voll minus 102 €", () => {
    expect(jahr([{ art: "rente", betragMonatlich: 1000 }])).toBe("11898.00");
  });
  it("§ 14 Abs. 2 Nr. 1 WoGG, § 9a Nr. 1b EStG: Versorgungsbezug mit eigenem Pauschbetrag neben der Rente", () => {
    expect(
      jahr([
        { art: "versorgungsbezug", betragMonatlich: 1000 },
        { art: "rente", betragMonatlich: 1000 },
      ]),
    ).toBe("23796.00");
  });
  it("§ 14 Abs. 1 Satz 4 WoGG: negative Einkünfte zählen 0 und werden nicht verrechnet", () => {
    const r = rechne([
      { art: "selbstaendig", betragMonatlich: -500 },
      { art: "nichtselbstaendig", betragMonatlich: 2000 },
    ]);
    expect(r.jahreseinkommen.toFixed(2)).toBe("22770.00");
    expect(r.hinweise.join(" ")).toContain("§ 14 Abs. 1 Satz 4");
  });
  it("§ 14 Abs. 1 WoGG: Vermietung mit Überschuss", () => {
    expect(jahr([{ art: "vermietung", betragMonatlich: 300 }])).toBe("3600.00");
  });
  it("§ 14 Abs. 2 Nr. 15 WoGG: Sparer-Pauschbetrag zählt, soweit die Erträge 100 € übersteigen", () => {
    expect(jahr([{ art: "kapital", betragMonatlich: 8 }])).toBe("0.00"); // 96 € im Jahr
    expect(jahr([{ art: "kapital", betragMonatlich: 9 }])).toBe("8.00"); // 108 € im Jahr
    expect(jahr([{ art: "kapital", betragMonatlich: 50 }])).toBe("500.00"); // 600 €
    expect(jahr([{ art: "kapital", betragMonatlich: 87.5 }])).toBe("1000.00"); // 1.050 €: 50 + 950
    expect(jahr([{ art: "kapital", betragMonatlich: 1000 }])).toBe("12000.00");
    expect(rechne([{ art: "kapital", betragMonatlich: 50 }]).annahmen.join(" ")).toContain("Sparer-Pauschbetrag");
  });
});

describe("Jahreseinkommen: Einnahmen nach § 14 Abs. 2 WoGG", () => {
  it("§ 14 Abs. 2 Nr. 6 WoGG: Arbeitslosengeld I voll, ohne Pauschbetrag (Beispiel 2)", () => {
    expect(jahr([{ art: "lohnersatz", betragMonatlich: 1350 }])).toBe("16200.00");
  });
  it("§ 14 Abs. 2 Nr. 6 WoGG mit § 10 BEEG: Elterngeld über 300 € (Plus: 150 €)", () => {
    expect(jahr([{ art: "elterngeld", betragMonatlich: 800 }])).toBe("6000.00");
    expect(jahr([{ art: "elterngeld", betragMonatlich: 400, elterngeldPlus: true }])).toBe("3000.00");
    expect(jahr([{ art: "elterngeld", betragMonatlich: 200 }])).toBe("0.00");
  });
  it("§ 14 Abs. 2 Nr. 11 WoGG: Zuschläge nach § 3b EStG voll", () => {
    expect(jahr([{ art: "zuschlaege_3b", betragMonatlich: 100 }])).toBe("1200.00");
  });
  it("§ 14 Abs. 2 Nr. 19 und 20 WoGG: Unterhalt voll", () => {
    expect(jahr([{ art: "unterhalt", betragMonatlich: 400 }])).toBe("4800.00");
  });
  it("§ 14 Abs. 2 Nr. 19 Buchst. b WoGG: Zuwendungen Dritter über 480 € im Jahr", () => {
    expect(jahr([{ art: "zuwendung_dritter", betragMonatlich: 50 }])).toBe("120.00");
    expect(jahr([{ art: "zuwendung_dritter", betragMonatlich: 30 }])).toBe("0.00");
  });
  it("§ 14 Abs. 2 Nr. 21 WoGG: Unterhaltsvorschuss voll", () => {
    expect(jahr([{ art: "unterhaltsvorschuss", betragMonatlich: 230 }])).toBe("2760.00");
  });
  it("§ 14 Abs. 2 Nr. 27 WoGG: BAföG-Zuschuss zur Hälfte", () => {
    expect(jahr([{ art: "ausbildungsfoerderung", betragMonatlich: 600 }])).toBe("3600.00");
  });
  it("§ 14 Abs. 2 Nr. 9 WoGG über sonstige_voll: Krankentagegeld voll", () => {
    expect(jahr([{ art: "sonstige_voll", nummer: 9, betragMonatlich: 200 }])).toBe("2400.00");
  });
  it("§ 14 Abs. 2 Nr. 26 WoGG über sonstige_haelfte: Pflegeeinnahmen zur Hälfte", () => {
    expect(jahr([{ art: "sonstige_haelfte", nummer: 26, betragMonatlich: 300 }])).toBe("1800.00");
  });
});

describe("Jahreseinkommen: Abzug nach § 16 WoGG", () => {
  it("§ 16 WoGG: 30 % bei Steuern, KV/PV und RV", () => {
    expect(jahr([{ art: "nichtselbstaendig", betragMonatlich: 2000 }], { zahltSteuern: true, zahltKvPv: true, zahltRv: true })).toBe(
      "15939.00",
    );
  });
  it("§ 16 WoGG: Abzug gilt auch für Einnahmen nach § 14 Abs. 2", () => {
    const r = rechne([{ art: "lohnersatz", betragMonatlich: 1000 }], { zahltKvPv: true });
    expect(r.jahreseinkommen.toFixed(2)).toBe("10800.00");
    expect(r.abzugProzent).toBe(10);
  });
  it("§ 17 Nr. 4 WoGG, WoGVwV 17.03.5: Erwerbseinkommen nach Werbungskosten und § 16, ohne Rente", () => {
    const r = rechne(
      [
        { art: "nichtselbstaendig", betragMonatlich: 2000 },
        { art: "zuschlaege_3b", betragMonatlich: 100 },
        { art: "rente", betragMonatlich: 500 },
      ],
      { zahltKvPv: true, zahltRv: true },
    );
    expect(r.erwerbseinkommen.toFixed(2)).toBe("19176.00");
    expect(r.renteJaehrlich.toFixed(2)).toBe("6000.00");
  });
  it("schreibt einen Rechenschritt mit Norm und Wert", () => {
    const r = rechne([{ art: "rente", betragMonatlich: 1300 }], { zahltKvPv: true });
    expect(r.schritt).toMatchObject({ schritt: "Jahreseinkommen Mitglied 1", norm: "§§ 14 bis 16 WoGG", wert: "13948.20" });
  });
});

describe("Jahreseinkommen: unmögliche Eingaben", () => {
  it("negativer Betrag bei Rente", () => {
    expect(fehlerFeld(() => jahr([{ art: "rente", betragMonatlich: -1 }]))).toBe("mitglieder[0].einnahmen[0].betragMonatlich");
  });
  it("Werbungskosten bei einer Art ohne Werbungskosten", () => {
    expect(fehlerFeld(() => jahr([{ art: "rente", betragMonatlich: 100, werbungskostenMonatlich: 10 }]))).toBe(
      "mitglieder[0].einnahmen[0].werbungskostenMonatlich",
    );
  });
  it("sonstige ohne oder mit unzulässiger Nummer", () => {
    expect(fehlerFeld(() => jahr([{ art: "sonstige_voll", betragMonatlich: 100 }]))).toBe("mitglieder[0].einnahmen[0].nummer");
    expect(fehlerFeld(() => jahr([{ art: "sonstige_voll", nummer: 13, betragMonatlich: 100 }]))).toBe("mitglieder[0].einnahmen[0].nummer");
    expect(fehlerFeld(() => jahr([{ art: "sonstige_haelfte", nummer: 27, betragMonatlich: 100 }]))).toBe(
      "mitglieder[0].einnahmen[0].nummer",
    );
  });
  it("unbekannte Art", () => {
    expect(fehlerFeld(() => jahr([{ art: "kindergeld" as never, betragMonatlich: 250 }]))).toBe("mitglieder[0].einnahmen[0].art");
  });
  it("fehlende Angabe zu § 16", () => {
    expect(
      fehlerFeld(() => berechneJahreseinkommen(WOGG_2025, { einnahmen: [], zahltKvPv: false, zahltRv: false } as unknown as MitgliedEingabe, 0)),
    ).toBe("mitglieder[0].zahltSteuern");
  });
});
```

- [ ] **Step 3: Test laufen lassen, er muss rot sein**

Run: `npx vitest run test/engine/jahreseinkommen.test.ts`
Expected: FAIL, Modul `src/engine/einkommen/jahreseinkommen` nicht gefunden.

- [ ] **Step 4: `src/engine/einkommen/jahreseinkommen.ts` implementieren**

```ts
import type { Rechtsstand } from "../../rechtsstand";
import { D, type Dezimal } from "../dezimal";
import { EINNAHME_ARTEN, type Einnahme, type EinnahmeArt, type MitgliedEingabe, NUMMERN_HAELFTE, NUMMERN_VOLL } from "../eingabe";
import { EingabeFehler, type Rechenschritt } from "../rechenweg";

export interface MitgliedEinkommen {
  summe: Dezimal; // Betrag nach §§ 14, 15, jährlich, vor § 16
  abzugProzent: number; // 0, 10, 20 oder 30
  jahreseinkommen: Dezimal; // nach § 16
  erwerbseinkommen: Dezimal; // eigene Einnahmen aus Erwerbstätigkeit nach § 16 (für § 17 Nr. 4)
  renteJaehrlich: Dezimal; // angegebene Renten brutto (für § 17a)
  schritt: Rechenschritt;
  annahmen: string[];
  hinweise: string[];
}

const MIT_WERBUNGSKOSTEN: readonly EinnahmeArt[] = ["nichtselbstaendig", "minijob_pauschal"];
const DARF_NEGATIV: readonly EinnahmeArt[] = ["selbstaendig", "vermietung"];

function pruefeBetrag(wert: unknown, feld: string, negativErlaubt = false): void {
  if (typeof wert !== "number" || !Number.isFinite(wert) || (!negativErlaubt && wert < 0))
    throw new EingabeFehler(feld, negativErlaubt ? "muss eine Zahl sein" : "muss eine Zahl ab 0 sein");
}

function pruefeEinnahme(e: Einnahme, feld: string): void {
  if (!EINNAHME_ARTEN.includes(e.art)) throw new EingabeFehler(`${feld}.art`, `unbekannte Einnahmeart: ${String(e.art)}`);
  pruefeBetrag(e.betragMonatlich, `${feld}.betragMonatlich`, DARF_NEGATIV.includes(e.art));
  if (e.werbungskostenMonatlich !== undefined) {
    if (!MIT_WERBUNGSKOSTEN.includes(e.art))
      throw new EingabeFehler(`${feld}.werbungskostenMonatlich`, "nur bei nichtselbstaendig und minijob_pauschal");
    pruefeBetrag(e.werbungskostenMonatlich, `${feld}.werbungskostenMonatlich`);
  }
  if (e.sonderzahlungJaehrlich !== undefined) {
    if (e.art !== "nichtselbstaendig") throw new EingabeFehler(`${feld}.sonderzahlungJaehrlich`, "nur bei nichtselbstaendig");
    pruefeBetrag(e.sonderzahlungJaehrlich, `${feld}.sonderzahlungJaehrlich`);
  }
  if (e.elterngeldPlus !== undefined && e.art !== "elterngeld")
    throw new EingabeFehler(`${feld}.elterngeldPlus`, "nur bei elterngeld");
  const liste = e.art === "sonstige_voll" ? NUMMERN_VOLL : e.art === "sonstige_haelfte" ? NUMMERN_HAELFTE : null;
  if (liste && (e.nummer === undefined || !liste.includes(e.nummer)))
    throw new EingabeFehler(`${feld}.nummer`, `Nummer aus § 14 Abs. 2 WoGG erwartet: ${liste.join(", ")}`);
  if (!liste && e.nummer !== undefined) throw new EingabeFehler(`${feld}.nummer`, "nur bei sonstige_voll und sonstige_haelfte");
}

function pruefeMitglied(m: MitgliedEingabe, feld: string): void {
  if (!Array.isArray(m.einnahmen)) throw new EingabeFehler(`${feld}.einnahmen`, "muss eine Liste sein");
  for (const k of ["zahltSteuern", "zahltKvPv", "zahltRv"] as const)
    if (typeof m[k] !== "boolean") throw new EingabeFehler(`${feld}.${k}`, "muss angegeben sein (ja oder nein), jede Angabe macht 10 % aus");
  m.einnahmen.forEach((e, i) => pruefeEinnahme(e, `${feld}.einnahmen[${i}]`));
}

// Jahreseinkommen eines zu berücksichtigenden Mitglieds nach §§ 14 bis 16 WoGG.
export function berechneJahreseinkommen(rs: Rechtsstand, m: MitgliedEingabe, index: number): MitgliedEinkommen {
  pruefeMitglied(m, `mitglieder[${index}]`);
  const w = rs.einkommen;
  const summeArt = (art: EinnahmeArt, feld: (e: Einnahme) => number | undefined = (e) => e.betragMonatlich): Dezimal =>
    m.einnahmen.filter((e) => e.art === art).reduce((s, e) => s.plus(new D(feld(e) ?? 0)), new D(0));
  const jahr = (x: Dezimal): Dezimal => x.times(12);
  const teile: string[] = [];
  const annahmen: string[] = [];
  const hinweise: string[] = [];
  const posten = (text: string, wert: Dezimal): Dezimal => {
    if (!wert.isZero()) teile.push(`${text} ${wert.toFixed(2)}`);
    return wert;
  };

  // § 19 EStG mit § 15 Abs. 3 WoGG; Werbungskosten mindestens Pauschbetrag (§ 9a Satz 1 Nr. 1a EStG),
  // höchstens bis zur Höhe der Einnahmen (§ 9a Satz 2 EStG).
  const arbeitBrutto = jahr(summeArt("nichtselbstaendig")).plus(summeArt("nichtselbstaendig", (e) => e.sonderzahlungJaehrlich));
  const arbeitWk = D.min(arbeitBrutto, D.max(jahr(summeArt("nichtselbstaendig", (e) => e.werbungskostenMonatlich)), w.arbeitnehmerPauschbetrag));
  const arbeit = posten("Arbeit", arbeitBrutto.minus(arbeitWk));

  // § 14 Abs. 1 Satz 3 Nr. 2 WoGG: tatsächliche Aufwendungen, kein Pauschbetrag.
  const minijobBrutto = jahr(summeArt("minijob_pauschal"));
  const minijob = posten(
    "Minijob",
    minijobBrutto.minus(D.min(minijobBrutto, jahr(summeArt("minijob_pauschal", (e) => e.werbungskostenMonatlich)))),
  );

  // § 22 EStG mit § 14 Abs. 2 Nr. 3 WoGG und § 19 EStG mit § 14 Abs. 2 Nr. 1 WoGG: voller Betrag,
  // je Art eigener Pauschbetrag (§ 9a Satz 1 Nr. 3 und Nr. 1b EStG).
  const renteBrutto = jahr(summeArt("rente"));
  const rente = posten("Rente", renteBrutto.minus(D.min(renteBrutto, w.rentenPauschbetrag)));
  const versorgungBrutto = jahr(summeArt("versorgungsbezug"));
  const versorgung = posten("Versorgung", versorgungBrutto.minus(D.min(versorgungBrutto, w.versorgungsPauschbetrag)));

  // § 14 Abs. 1 Satz 1 und 4 WoGG: nur positive Einkünfte, kein Ausgleich mit negativen.
  const positiv = (art: EinnahmeArt, text: string): Dezimal => {
    const x = jahr(summeArt(art));
    if (x.isNegative()) {
      hinweise.push(`${text}: negative Einkünfte werden nicht verrechnet (§ 14 Abs. 1 Satz 4 WoGG).`);
      return new D(0);
    }
    return posten(text, x);
  };
  const selbst = positiv("selbstaendig", "Selbständig");
  const vermietung = positiv("vermietung", "Vermietung");

  // § 20 EStG nach Sparer-Pauschbetrag, plus § 14 Abs. 2 Nr. 15 WoGG: der steuerfreie Betrag,
  // soweit die Kapitalerträge die Schwelle übersteigen.
  const kapitalErtrag = jahr(summeArt("kapital"));
  let kapital = new D(0);
  if (!kapitalErtrag.isZero()) {
    const steuerfrei = D.min(kapitalErtrag, w.sparerPauschbetrag);
    const nr15 = D.min(steuerfrei, D.max(0, kapitalErtrag.minus(w.kapitalSchwelle)));
    kapital = posten("Kapital", kapitalErtrag.minus(steuerfrei).plus(nr15));
    annahmen.push(
      `Kapitalerträge: Sparer-Pauschbetrag ${w.sparerPauschbetrag} € je Person; er zählt nach § 14 Abs. 2 Nr. 15 WoGG, soweit die Erträge ${w.kapitalSchwelle} € übersteigen (wörtliche Lesart, kein amtliches Zahlenbeispiel).`,
    );
  }

  // § 14 Abs. 2 Nr. 6 WoGG mit § 10 Abs. 1 und 3 BEEG.
  const elterngeldMonat = summeArt("elterngeld");
  let elterngeld = new D(0);
  if (!elterngeldMonat.isZero()) {
    const plus = m.einnahmen.some((e) => e.art === "elterngeld" && e.elterngeldPlus === true);
    const frei = new D(w.elterngeldFreiMonatlich).dividedBy(plus ? 2 : 1);
    elterngeld = posten("Elterngeld", jahr(D.max(0, elterngeldMonat.minus(frei))));
    annahmen.push(`Elterngeld: ${frei.toFixed(2)} € im Monat anrechnungsfrei (§ 10 BEEG), ohne Mehrlingszuschlag.`);
  }

  // § 14 Abs. 2 Nr. 19 Buchst. b WoGG.
  const zuwendung = posten("Zuwendungen Dritter", D.max(0, jahr(summeArt("zuwendung_dritter")).minus(w.zuwendungDritterFrei)));

  // § 14 Abs. 2 Nr. 6, 11, 19, 20, 21 und Nummern aus NUMMERN_VOLL: voll.
  const zuschlaege = jahr(summeArt("zuschlaege_3b"));
  const voll = posten(
    "Einnahmen § 14 Abs. 2",
    jahr(summeArt("lohnersatz").plus(summeArt("unterhalt")).plus(summeArt("unterhaltsvorschuss")).plus(summeArt("sonstige_voll"))).plus(zuschlaege),
  );

  // § 14 Abs. 2 Nr. 27 und Nummern aus NUMMERN_HAELFTE: zur Hälfte.
  const haelfte = posten("Hälfte nach § 14 Abs. 2", jahr(summeArt("ausbildungsfoerderung").plus(summeArt("sonstige_haelfte"))).dividedBy(2));

  const summe = [arbeit, minijob, rente, versorgung, selbst, vermietung, kapital, elterngeld, zuwendung, voll, haelfte].reduce(
    (s, x) => s.plus(x),
    new D(0),
  );

  // § 16 WoGG: jeweils 10 Prozent je zutreffender Kategorie.
  const kategorien = [m.zahltSteuern, m.zahltKvPv, m.zahltRv].filter(Boolean).length;
  const faktor = new D(1).minus(new D(w.abzugsSatz).times(kategorien));
  const jahreseinkommen = summe.times(faktor);
  // WoGVwV Nr. 17.03.5: eigene Einnahmen aus Erwerbstätigkeit nach Werbungskosten und § 16.
  const erwerbseinkommen = arbeit.plus(minijob).plus(selbst).plus(zuschlaege).times(faktor);

  const schritt: Rechenschritt = {
    schritt: `Jahreseinkommen Mitglied ${index + 1}`,
    norm: "§§ 14 bis 16 WoGG",
    wert: jahreseinkommen.toFixed(2),
    erklaerung: `${teile.length > 0 ? teile.join(" + ") : "keine Einnahmen"} = ${summe.toFixed(2)} €, Abzug ${kategorien * 10} % nach § 16`,
  };

  return {
    summe,
    abzugProzent: kategorien * 10,
    jahreseinkommen,
    erwerbseinkommen,
    renteJaehrlich: renteBrutto,
    schritt,
    annahmen,
    hinweise,
  };
}
```

- [ ] **Step 5: Tests und Typprüfung**

Run: `npx vitest run test/engine/jahreseinkommen.test.ts && npx tsc --noEmit`
Expected: alle grün, tsc ohne Ausgabe.

- [ ] **Step 6: Commit**

```bash
git add src/engine/eingabe.ts src/engine/einkommen/jahreseinkommen.ts test/engine/jahreseinkommen.test.ts
git commit -m "E2: Jahreseinkommen je Mitglied nach §§ 14 bis 16 WoGG mit allen Einnahmearten"
```

---

### Task 3: Gesamteinkommen und Y (§§ 13, 17, 17a, 18) mit den 11 BMWSB-Beispielen

**Files:**
- Create: `src/engine/einkommen/gesamteinkommen.ts`
- Create: `test/fixtures/bmwsb-2025-eingaben.ts`
- Test: `test/engine/gesamteinkommen.test.ts`

**Interfaces:**
- Consumes: `berechneJahreseinkommen`, `MitgliedEinkommen` (Task 2); `MitgliedEingabe`, `UnterhaltZahlung`, `HaushaltEingabe` (Task 2); `UNTERHALT_ARTEN` (Task 1); `BMWSB_2025` aus `test/fixtures/bmwsb-2025.ts` (Felder `nr`, `y`, `m`, `wohngeld`, `ort`)
- Produces:
  - `berechneGesamteinkommen(e: EinkommenEingabe): EinkommenErgebnis`
  - `interface EinkommenEingabe { rechtsstand: Rechtsstand; mitglieder: { index: number; mitglied: MitgliedEingabe }[]; alleinerziehend?: boolean; unterhaltGezahlt?: UnterhaltZahlung[] }` (`mitglieder` enthält nur die zu berücksichtigenden, `index` ist die Position im Haushalt)
  - `interface EinkommenErgebnis { mitglieder: MitgliedEinkommen[]; summeJahreseinkommen: Dezimal; freibetraege: Dezimal; unterhaltsabzug: Dezimal; gesamteinkommen: Dezimal; y: Dezimal; schritte: Rechenschritt[]; annahmen: string[]; hinweise: string[] }`
  - `EINGABEN_BMWSB_2025: Record<number, HaushaltEingabe>` (Fixture, von Task 6 wiederverwendet)

- [ ] **Step 1: Fixture `test/fixtures/bmwsb-2025-eingaben.ts` anlegen**

```ts
import type { HaushaltEingabe, MitgliedEingabe } from "../../src/engine/eingabe";

// Vollständige Eingaben zu den 11 BMWSB-Beispielen (Stand 01.01.2025), Quelle wie test/fixtures/bmwsb-2025.ts.
// Monatsbeträge laut Dokument; Kinder ohne Einkommen und arbeitslose Partner ohne ALG I haben keine Einnahmen.
const STICHTAG = "2025-07-01";
const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
const ohneEinnahmen = (): MitgliedEingabe => ({ einnahmen: [], ...ohne });

export const EINGABEN_BMWSB_2025: Record<number, HaushaltEingabe> = {
  1: {
    stichtag: STICHTAG, mietstufe: 1, art: "mietzuschuss", mieteMonatlich: 335,
    mitglieder: [{ einnahmen: [{ art: "rente", betragMonatlich: 1300 }], ...ohne, zahltKvPv: true }],
  },
  2: {
    stichtag: STICHTAG, mietstufe: 4, art: "mietzuschuss", mieteMonatlich: 470,
    mitglieder: [{ einnahmen: [{ art: "lohnersatz", betragMonatlich: 1350 }], ...ohne }],
  },
  3: {
    stichtag: STICHTAG, mietstufe: 2, art: "mietzuschuss", mieteMonatlich: 480,
    mitglieder: [
      { einnahmen: [{ art: "rente", betragMonatlich: 1410 }], ...ohne, zahltKvPv: true, schwerbehindert: true },
      { einnahmen: [{ art: "rente", betragMonatlich: 540 }], ...ohne, zahltKvPv: true },
    ],
  },
  4: {
    stichtag: STICHTAG, mietstufe: 1, art: "lastenzuschuss", mieteMonatlich: 750,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2150 }], ...ohne, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  5: {
    stichtag: STICHTAG, mietstufe: 6, art: "mietzuschuss", mieteMonatlich: 700, alleinerziehend: true,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 1530 }], ...ohne, zahltKvPv: true, zahltRv: true },
      { einnahmen: [{ art: "unterhaltsvorschuss", betragMonatlich: 696 }], ...ohne },
      ohneEinnahmen(),
    ],
  },
  6: {
    stichtag: STICHTAG, mietstufe: 7, art: "mietzuschuss", mieteMonatlich: 1225,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2490 }], zahltSteuern: true, zahltKvPv: true, zahltRv: true },
      { einnahmen: [{ art: "minijob_pauschal", betragMonatlich: 556 }], ...ohne },
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  7: {
    stichtag: STICHTAG, mietstufe: 3, art: "mietzuschuss", mieteMonatlich: 580,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2240 }], ...ohne, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  8: {
    stichtag: STICHTAG, mietstufe: 5, art: "mietzuschuss", mieteMonatlich: 870,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 2750 }], zahltSteuern: true, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      { einnahmen: [{ art: "minijob_pauschal", betragMonatlich: 60 }], ...ohne, kindUnter25: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
    ],
  },
  9: {
    stichtag: STICHTAG, mietstufe: 2, art: "mietzuschuss", mieteMonatlich: 780,
    mitglieder: [
      { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 4000 }], zahltSteuern: true, zahltKvPv: true, zahltRv: true },
      ohneEinnahmen(),
      ohneEinnahmen(),
      ohneEinnahmen(),
      ohneEinnahmen(),
      { einnahmen: [{ art: "rente", betragMonatlich: 645 }], ...ohne, zahltKvPv: true },
    ],
  },
  10: {
    stichtag: STICHTAG, mietstufe: 4, art: "mietzuschuss", mieteMonatlich: 570,
    mitglieder: [
      { einnahmen: [{ art: "rente", betragMonatlich: 880 }], ...ohne, zahltKvPv: true },
      { einnahmen: [], ...ohne, ausschluss: "grundsicherungsgeld_sgb2" },
    ],
  },
  11: {
    stichtag: STICHTAG, mietstufe: 2, art: "lastenzuschuss", mieteMonatlich: 345,
    mitglieder: [{ einnahmen: [{ art: "rente", betragMonatlich: 945 }], ...ohne, zahltKvPv: true, grundrentenzeiten33: true }],
  },
};
```

- [ ] **Step 2: Failing tests schreiben** in `test/engine/gesamteinkommen.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { D } from "../../src/engine/dezimal";
import type { HaushaltEingabe, MitgliedEingabe, UnterhaltZahlung } from "../../src/engine/eingabe";
import { berechneGesamteinkommen } from "../../src/engine/einkommen/gesamteinkommen";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { WOGG_2025 } from "../../src/rechtsstand";
import { BMWSB_2025 } from "../fixtures/bmwsb-2025";
import { EINGABEN_BMWSB_2025 } from "../fixtures/bmwsb-2025-eingaben";

const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
function ausHaushalt(h: HaushaltEingabe) {
  return berechneGesamteinkommen({
    rechtsstand: WOGG_2025,
    mitglieder: h.mitglieder.flatMap((mitglied, index) => (mitglied.ausschluss ? [] : [{ index, mitglied }])),
    alleinerziehend: h.alleinerziehend,
    unterhaltGezahlt: h.unterhaltGezahlt,
  });
}
function rechne(mitglieder: MitgliedEingabe[], extra: { alleinerziehend?: boolean; unterhaltGezahlt?: UnterhaltZahlung[] } = {}) {
  return berechneGesamteinkommen({ rechtsstand: WOGG_2025, mitglieder: mitglieder.map((mitglied, index) => ({ index, mitglied })), ...extra });
}
const y = (mitglieder: MitgliedEingabe[], extra?: Parameters<typeof rechne>[1]) => rechne(mitglieder, extra).y.toFixed(2);
const rentner = (betrag: number, extra: Partial<MitgliedEingabe> = {}): MitgliedEingabe => ({
  einnahmen: [{ art: "rente", betragMonatlich: betrag }],
  ...ohne,
  ...extra,
});

describe("berechneGesamteinkommen: amtliche Beispiele von den Einnahmen bis Y", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt Y = ${fall.y}`, () => {
      const r = ausHaushalt(EINGABEN_BMWSB_2025[fall.nr]);
      expect(r.y.toFixed(2)).toBe(fall.y);
      expect(r.y.equals(new D(fall.y))).toBe(true);
    });
  }
});

describe("berechneGesamteinkommen: Freibeträge (§§ 17, 17a WoGG)", () => {
  it("§ 17 Nr. 1 WoGG: 1.800 € je schwerbehindertem Mitglied", () => {
    expect(y([rentner(1000, { schwerbehindert: true })])).toBe("841.50");
  });
  it("§ 17 Nr. 2 WoGG: 750 € je NS-Verfolgtem", () => {
    expect(y([rentner(1000, { nsVerfolgt: true })])).toBe("929.00");
  });
  it("§ 17 Nr. 3 WoGG: 1.320 € einmal je Haushalt", () => {
    expect(y([rentner(1000), rentner(1000)], { alleinerziehend: true })).toBe("1873.00");
  });
  it("§ 17 Nr. 4 WoGG: Erwerbseinkommen des Kindes, höchstens 1.200 €", () => {
    const kind: MitgliedEingabe = { einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 500 }], ...ohne, kindUnter25: true };
    expect(y([rentner(1000), kind])).toBe("1289.00");
  });
  it("§ 17 Nr. 4 WoGG: kein Freibetrag für Unterhalt des Kindes", () => {
    const kind: MitgliedEingabe = { einnahmen: [{ art: "unterhalt", betragMonatlich: 300 }], ...ohne, kindUnter25: true };
    expect(y([rentner(1000), kind])).toBe("1291.50");
  });
  it("§ 17a WoGG: 1.200 € plus 30 % der übersteigenden Rente unter dem Deckel", () => {
    const r = rechne([rentner(300, { grundrentenzeiten33: true })]);
    expect(r.y.toFixed(2)).toBe("131.50");
    expect(r.annahmen.join(" ")).toContain("Grundrentenfreibetrag");
  });
  it("§ 13 WoGG: Freibeträge über dem Einkommen ergeben Y = 0, nicht negativ", () => {
    expect(y([rentner(80, { grundrentenzeiten33: true })])).toBe("0.00");
  });
  it("nennt die Annahme, wenn kein Freibetrag angegeben ist", () => {
    expect(ausHaushalt(EINGABEN_BMWSB_2025[1]).annahmen.join(" ")).toContain("Keine Freibeträge");
    expect(ausHaushalt(EINGABEN_BMWSB_2025[3]).annahmen.join(" ")).not.toContain("Keine Freibeträge");
  });
});

describe("berechneGesamteinkommen: Unterhaltsabzug (§ 18 WoGG)", () => {
  const basis = [rentner(3000)];
  it("§ 18 Satz 1 Nr. 3 WoGG: Ehegattenunterhalt höchstens 6.000 €", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "ehegatte", betragMonatlich: 600 }] })).toBe("2491.50");
  });
  it("§ 18 Satz 2 WoGG: mit Titel der festgelegte Betrag", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "ehegatte", betragMonatlich: 600, tituliert: true }] })).toBe("2391.50");
  });
  it("§ 18 Satz 1 Nr. 4 WoGG: sonstige Person unter dem Höchstbetrag voll", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "sonstige", betragMonatlich: 200 }] })).toBe("2791.50");
  });
  it("§ 18 Satz 1 Nr. 1 WoGG: auswärts in Ausbildung höchstens 3.000 €", () => {
    expect(y(basis, { unterhaltGezahlt: [{ art: "auswaerts_ausbildung", betragMonatlich: 400 }] })).toBe("2741.50");
  });
  it("unbekannte Unterhaltsart ist ein Eingabefehler", () => {
    let feld = "";
    try {
      rechne(basis, { unterhaltGezahlt: [{ art: "kind" as never, betragMonatlich: 100 }] });
    } catch (e) {
      if (e instanceof EingabeFehler) feld = e.feld;
    }
    expect(feld).toBe("unterhaltGezahlt[0].art");
  });
});

describe("berechneGesamteinkommen: Rechenweg", () => {
  it("Beispiel 3: Schritte mit Normen und Werten in fester Reihenfolge", () => {
    const r = ausHaushalt(EINGABEN_BMWSB_2025[3]);
    expect(r.schritte.map((s) => s.norm)).toEqual([
      "§§ 14 bis 16 WoGG",
      "§§ 14 bis 16 WoGG",
      "§ 13 Abs. 1 WoGG",
      "§ 17 Nr. 1 WoGG",
      "§ 13 Abs. 1 WoGG",
      "§ 13 Abs. 2 WoGG",
    ]);
    expect(r.schritte.map((s) => s.wert)).toEqual(["15136.20", "5740.20", "20876.40", "-1800.00", "19076.40", "1589.70"]);
  });
});
```

- [ ] **Step 3: Test laufen lassen, er muss rot sein**

Run: `npx vitest run test/engine/gesamteinkommen.test.ts`
Expected: FAIL, Modul `gesamteinkommen` nicht gefunden.

- [ ] **Step 4: `src/engine/einkommen/gesamteinkommen.ts` implementieren**

```ts
import { type Rechtsstand, UNTERHALT_ARTEN } from "../../rechtsstand";
import { D, type Dezimal } from "../dezimal";
import type { MitgliedEingabe, UnterhaltZahlung } from "../eingabe";
import { EingabeFehler, type Rechenschritt } from "../rechenweg";
import { berechneJahreseinkommen, type MitgliedEinkommen } from "./jahreseinkommen";

export interface EinkommenEingabe {
  rechtsstand: Rechtsstand;
  // Nur die zu berücksichtigenden Mitglieder; index ist die Position im Haushalt (Feldnamen, Rechenweg).
  mitglieder: { index: number; mitglied: MitgliedEingabe }[];
  alleinerziehend?: boolean;
  unterhaltGezahlt?: UnterhaltZahlung[];
}

export interface EinkommenErgebnis {
  mitglieder: MitgliedEinkommen[];
  summeJahreseinkommen: Dezimal;
  freibetraege: Dezimal;
  unterhaltsabzug: Dezimal;
  gesamteinkommen: Dezimal; // jährlich, nicht negativ
  y: Dezimal; // monatlich, ungerundet
  schritte: Rechenschritt[];
  annahmen: string[];
  hinweise: string[];
}

function pruefeUnterhalt(u: UnterhaltZahlung, feld: string): void {
  if (!UNTERHALT_ARTEN.includes(u.art)) throw new EingabeFehler(`${feld}.art`, `erwartet: ${UNTERHALT_ARTEN.join(", ")}`);
  if (typeof u.betragMonatlich !== "number" || !Number.isFinite(u.betragMonatlich) || u.betragMonatlich < 0)
    throw new EingabeFehler(`${feld}.betragMonatlich`, "muss eine Zahl ab 0 sein");
  if (u.tituliert !== undefined && typeof u.tituliert !== "boolean") throw new EingabeFehler(`${feld}.tituliert`, "muss ja oder nein sein");
}

// § 13 WoGG: Summe der Jahreseinkommen minus Freibeträge (§§ 17, 17a) und Unterhaltsabzüge (§ 18); Y = ein Zwölftel.
export function berechneGesamteinkommen(e: EinkommenEingabe): EinkommenErgebnis {
  const w = e.rechtsstand.einkommen;
  const ergebnisse = e.mitglieder.map(({ index, mitglied }) => berechneJahreseinkommen(e.rechtsstand, mitglied, index));
  const summe = ergebnisse.reduce((s, r) => s.plus(r.jahreseinkommen), new D(0));
  const schritte: Rechenschritt[] = ergebnisse.map((r) => r.schritt);
  const annahmen = ergebnisse.flatMap((r) => r.annahmen);
  const hinweise = ergebnisse.flatMap((r) => r.hinweise);
  schritte.push({
    schritt: "Summe der Jahreseinkommen",
    norm: "§ 13 Abs. 1 WoGG",
    wert: summe.toFixed(2),
    erklaerung: `${ergebnisse.length} zu berücksichtigende Mitglieder`,
  });

  let freibetraege = new D(0);
  const freibetrag = (schritt: string, norm: string, betrag: Dezimal, erklaerung: string): void => {
    if (betrag.isZero()) return;
    freibetraege = freibetraege.plus(betrag);
    schritte.push({ schritt, norm, wert: `-${betrag.toFixed(2)}`, erklaerung });
  };
  e.mitglieder.forEach(({ index, mitglied: m }, i) => {
    const nr = index + 1;
    const r = ergebnisse[i];
    if (m.schwerbehindert)
      freibetrag(`Freibetrag Schwerbehinderung Mitglied ${nr}`, "§ 17 Nr. 1 WoGG", new D(w.freibetragSchwerbehindert), "GdB 100 oder unter 100 mit häuslicher Pflege");
    if (m.nsVerfolgt) freibetrag(`Freibetrag NS-Verfolgung Mitglied ${nr}`, "§ 17 Nr. 2 WoGG", new D(w.freibetragNsVerfolgt), "Opfer der NS-Verfolgung oder Gleichgestellte");
    if (m.kindUnter25)
      freibetrag(
        `Freibetrag Erwerbseinkommen Kind Mitglied ${nr}`,
        "§ 17 Nr. 4 WoGG",
        D.min(r.erwerbseinkommen, w.freibetragKindErwerbHoechst),
        `Eigene Einnahmen aus Erwerbstätigkeit nach Abzügen, höchstens ${w.freibetragKindErwerbHoechst} €`,
      );
    if (m.grundrentenzeiten33) {
      const rente = r.renteJaehrlich;
      const roh = rente.lte(w.grundrenteSockel) ? rente : new D(w.grundrenteSockel).plus(rente.minus(w.grundrenteSockel).times(w.grundrenteSatz));
      const deckel = new D(w.regelbedarfsstufe1).times("0.5").times(12);
      freibetrag(
        `Grundrentenfreibetrag Mitglied ${nr}`,
        "§ 17a WoGG",
        D.min(roh, deckel),
        `${w.grundrenteSockel} € plus 30 % der übersteigenden Rente, höchstens ${deckel.toFixed(2)} € im Jahr`,
      );
      annahmen.push("Grundrentenfreibetrag aus der gesamten angegebenen Rente berechnet.");
    }
  });
  if (e.alleinerziehend) freibetrag("Freibetrag Alleinerziehende", "§ 17 Nr. 3 WoGG", new D(w.freibetragAlleinerziehend), "Einmal je Haushalt");
  const keinMerkmal = e.mitglieder.every(({ mitglied: m }) => !m.schwerbehindert && !m.nsVerfolgt && !m.kindUnter25 && !m.grundrentenzeiten33);
  if (!e.alleinerziehend && keinMerkmal)
    annahmen.push(
      "Keine Freibeträge nach §§ 17, 17a angegeben (Schwerbehinderung, NS-Verfolgung, alleinerziehend, erwerbstätige Kinder unter 25, Grundrentenzeiten).",
    );

  let unterhaltsabzug = new D(0);
  (e.unterhaltGezahlt ?? []).forEach((u, i) => {
    pruefeUnterhalt(u, `unterhaltGezahlt[${i}]`);
    const jahresbetrag = new D(u.betragMonatlich).times(12);
    const grenze = w.unterhaltHoechst[u.art];
    const abzug = u.tituliert ? jahresbetrag : D.min(jahresbetrag, grenze);
    unterhaltsabzug = unterhaltsabzug.plus(abzug);
    if (!abzug.isZero())
      schritte.push({
        schritt: `Unterhaltsabzug ${i + 1}`,
        norm: "§ 18 WoGG",
        wert: `-${abzug.toFixed(2)}`,
        erklaerung: u.tituliert ? "Betrag laut Titel, Vereinbarung oder Bescheid" : `Höchstens ${grenze} € im Jahr`,
      });
  });

  const gesamteinkommen = D.max(0, summe.minus(freibetraege).minus(unterhaltsabzug));
  const y = gesamteinkommen.dividedBy(12);
  schritte.push(
    { schritt: "Gesamteinkommen", norm: "§ 13 Abs. 1 WoGG", wert: gesamteinkommen.toFixed(2), erklaerung: "Summe minus Freibeträge und Unterhaltsabzüge, nicht unter 0" },
    { schritt: "Monatliches Gesamteinkommen Y", norm: "§ 13 Abs. 2 WoGG", wert: y.toFixed(2), erklaerung: "Ein Zwölftel, ungerundet weitergerechnet" },
  );

  return { mitglieder: ergebnisse, summeJahreseinkommen: summe, freibetraege, unterhaltsabzug, gesamteinkommen, y, schritte, annahmen, hinweise };
}
```

- [ ] **Step 5: Tests und Typprüfung**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle grün, darunter 11 Beispiel-Tests „ergibt Y = …“. Weicht ein Beispiel ab, zuerst die Fixture gegen `docs/quellen/2026-10-07-recherche-wohngeld-fachlich.md` Abschnitt 6a prüfen, nicht den Sollwert ändern.

- [ ] **Step 6: Commit**

```bash
git add src/engine/einkommen/gesamteinkommen.ts test/fixtures/bmwsb-2025-eingaben.ts test/engine/gesamteinkommen.test.ts
git commit -m "E2: Gesamteinkommen mit Freibeträgen und Unterhaltsabzug, alle 11 Beispiele bis Y"
```

---

### Task 4: Ausschluss nach § 7 und § 21 Nr. 2, 3 WoGG

**Files:**
- Modify: `src/engine/rechenweg.ts` (Typ `Ausschlussgrund`)
- Create: `src/engine/ausschluss.ts`
- Test: `test/engine/ausschluss.test.ts`

**Interfaces:**
- Consumes: `MitgliedEingabe`, `AUSSCHLUSS_LEISTUNGEN`, `AusschlussLeistung` (Task 2); `rs.einkommen.vermoegenErstes/Weiteres` (Task 1)
- Produces:
  - in `rechenweg.ts`: `interface Ausschlussgrund { code: "alle_ausgeschlossen" | "vermoegen" | "rechnerisch_kein_wohngeld" | "bagatellgrenze"; norm: string; text: string }`
  - `pruefeAusschluss(rs: Rechtsstand, mitglieder: MitgliedEingabe[], vermoegen?: number): AusschlussErgebnis`
  - `interface AusschlussErgebnis { zuBeruecksichtigen: number[]; ausgeschlossen: { index: number; leistung: AusschlussLeistung; norm: string }[]; vermoegensgrenze: Dezimal | null; grund?: Ausschlussgrund; schritte: Rechenschritt[]; annahmen: string[]; hinweise: string[] }`

- [ ] **Step 1: `Ausschlussgrund` in `src/engine/rechenweg.ts` ergänzen** (nach `Rechenschritt`):

```ts
// Warum das Ergebnis 0 € ist. Der Code ist maschinenlesbar, Norm und Text erklären ihn.
export interface Ausschlussgrund {
  code: "alle_ausgeschlossen" | "vermoegen" | "rechnerisch_kein_wohngeld" | "bagatellgrenze";
  norm: string;
  text: string;
}
```

- [ ] **Step 2: Failing tests schreiben** in `test/engine/ausschluss.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { pruefeAusschluss } from "../../src/engine/ausschluss";
import type { MitgliedEingabe } from "../../src/engine/eingabe";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { WOGG_2025 } from "../../src/rechtsstand";

const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
const frei = (): MitgliedEingabe => ({ einnahmen: [], ...ohne });
const mit = (ausschluss: MitgliedEingabe["ausschluss"]): MitgliedEingabe => ({ einnahmen: [], ...ohne, ausschluss });
function fehlerFeld(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof EingabeFehler) return e.feld;
    throw e;
  }
  throw new Error("kein Fehler geworfen");
}

describe("pruefeAusschluss: § 7 WoGG", () => {
  it("§ 7 Abs. 1 Satz 1 Nr. 1 WoGG: Bezieher von Grundsicherungsgeld zählt nicht mit (Beispiel 10)", () => {
    const r = pruefeAusschluss(WOGG_2025, [frei(), mit("grundsicherungsgeld_sgb2")]);
    expect(r.zuBeruecksichtigen).toEqual([0]);
    expect(r.ausgeschlossen).toEqual([{ index: 1, leistung: "grundsicherungsgeld_sgb2", norm: "§ 7 Abs. 1 Satz 1 Nr. 1 WoGG" }]);
    expect(r.grund).toBeUndefined();
    expect(r.schritte[0]).toMatchObject({ norm: "§§ 5 bis 7 WoGG", wert: "1 von 2" });
    expect(r.hinweise.join(" ")).toContain("Darlehen");
  });
  it("§ 7 Abs. 2 WoGG: in der Bedarfsgemeinschaft berücksichtigtes Mitglied", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei(), mit("in_bedarf_beruecksichtigt")]).ausgeschlossen[0].norm).toBe("§ 7 Abs. 2 WoGG");
  });
  it("§ 21 Nr. 2 WoGG: alle ausgeschlossen ergibt Grund statt Rechnung", () => {
    const r = pruefeAusschluss(WOGG_2025, [mit("grundsicherung_alter_em"), mit("grundsicherungsgeld_sgb2")]);
    expect(r.zuBeruecksichtigen).toEqual([]);
    expect(r.grund).toMatchObject({ code: "alle_ausgeschlossen", norm: "§ 21 Nr. 2 WoGG" });
  });
  it("ohne Ausschluss kein Darlehens-Hinweis", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei()]).hinweise.join(" ")).not.toContain("Darlehen");
  });
});

describe("pruefeAusschluss: Vermögen § 21 Nr. 3 WoGG, WoGVwV 21.37", () => {
  it("genau an der Grenze kein Ausschluss, darüber Ausschluss (1 Mitglied, 60.000 €)", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei()], 60000).grund).toBeUndefined();
    expect(pruefeAusschluss(WOGG_2025, [frei()], 60000.01).grund).toMatchObject({ code: "vermoegen", norm: "§ 21 Nr. 3 WoGG" });
  });
  it("30.000 € je weiterem zu berücksichtigendem Mitglied, Ausgeschlossene zählen nicht", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei(), frei()], 90000).grund).toBeUndefined();
    const r = pruefeAusschluss(WOGG_2025, [frei(), frei(), mit("grundsicherungsgeld_sgb2")], 90000.01);
    expect(r.vermoegensgrenze?.toFixed(2)).toBe("90000.00");
    expect(r.grund?.code).toBe("vermoegen");
  });
  it("ohne Angabe: Annahme kein erhebliches Vermögen", () => {
    expect(pruefeAusschluss(WOGG_2025, [frei()]).annahmen.join(" ")).toContain("§ 21 Nr. 3");
  });
  it("mit Angabe: Rechenschritt und Hinweis auf den Einzelfall", () => {
    const r = pruefeAusschluss(WOGG_2025, [frei()], 1000);
    expect(r.schritte.map((s) => s.norm)).toContain("§ 21 Nr. 3 WoGG, Nr. 21.37 WoGVwV");
    expect(r.hinweise.join(" ")).toContain("Einzelfall");
  });
});

describe("pruefeAusschluss: unmögliche Eingaben", () => {
  it("leerer Haushalt", () => {
    expect(fehlerFeld(() => pruefeAusschluss(WOGG_2025, []))).toBe("mitglieder");
  });
  it("unbekannte Leistung", () => {
    expect(fehlerFeld(() => pruefeAusschluss(WOGG_2025, [mit("buergergeld" as never)]))).toBe("mitglieder[0].ausschluss");
  });
  it("negatives Vermögen", () => {
    expect(fehlerFeld(() => pruefeAusschluss(WOGG_2025, [frei()], -1))).toBe("vermoegen");
  });
});
```

- [ ] **Step 3: Test laufen lassen, er muss rot sein**

Run: `npx vitest run test/engine/ausschluss.test.ts`
Expected: FAIL, Modul `ausschluss` nicht gefunden.

- [ ] **Step 4: `src/engine/ausschluss.ts` implementieren**

```ts
import type { Rechtsstand } from "../rechtsstand";
import { D, type Dezimal } from "./dezimal";
import { AUSSCHLUSS_LEISTUNGEN, type AusschlussLeistung, type MitgliedEingabe } from "./eingabe";
import { type Ausschlussgrund, EingabeFehler, type Rechenschritt } from "./rechenweg";

const NORM: Record<AusschlussLeistung, string> = {
  grundsicherungsgeld_sgb2: "§ 7 Abs. 1 Satz 1 Nr. 1 WoGG",
  ausbildung_sgb2_zuschuss: "§ 7 Abs. 1 Satz 1 Nr. 2 WoGG",
  verletztengeld: "§ 7 Abs. 1 Satz 1 Nr. 4 und Satz 2 WoGG",
  grundsicherung_alter_em: "§ 7 Abs. 1 Satz 1 Nr. 5 WoGG",
  hilfe_zum_lebensunterhalt: "§ 7 Abs. 1 Satz 1 Nr. 6 WoGG",
  sgb14_lebensunterhalt: "§ 7 Abs. 1 Satz 1 Nr. 7 WoGG",
  asylblg: "§ 7 Abs. 1 Satz 1 Nr. 8 WoGG",
  sgb8_kdu: "§ 7 Abs. 1 Satz 1 Nr. 9 WoGG",
  in_bedarf_beruecksichtigt: "§ 7 Abs. 2 WoGG",
};

const BEZEICHNUNG: Record<AusschlussLeistung, string> = {
  grundsicherungsgeld_sgb2: "Bürgergeld bzw. Grundsicherungsgeld nach SGB II",
  ausbildung_sgb2_zuschuss: "Zuschuss für Auszubildende nach § 27 Abs. 3 SGB II",
  verletztengeld: "Verletztengeld in Höhe des Grundsicherungsgeldes",
  grundsicherung_alter_em: "Grundsicherung im Alter und bei Erwerbsminderung",
  hilfe_zum_lebensunterhalt: "Hilfe zum Lebensunterhalt nach SGB XII",
  sgb14_lebensunterhalt: "Leistungen zum Lebensunterhalt nach SGB XIV",
  asylblg: "Leistungen nach dem Asylbewerberleistungsgesetz",
  sgb8_kdu: "Leistungen nach SGB VIII mit Unterkunftskosten",
  in_bedarf_beruecksichtigt: "bei der Leistung eines anderen Mitglieds berücksichtigt",
};

export interface AusschlussErgebnis {
  zuBeruecksichtigen: number[]; // Positionen im Haushalt
  ausgeschlossen: { index: number; leistung: AusschlussLeistung; norm: string }[];
  vermoegensgrenze: Dezimal | null;
  grund?: Ausschlussgrund;
  schritte: Rechenschritt[];
  annahmen: string[];
  hinweise: string[];
}

// § 7 WoGG (Ausschluss einzelner Mitglieder), § 21 Nr. 2 (alle ausgeschlossen) und Nr. 3 (erhebliches Vermögen).
export function pruefeAusschluss(rs: Rechtsstand, mitglieder: MitgliedEingabe[], vermoegen?: number): AusschlussErgebnis {
  if (!Array.isArray(mitglieder) || mitglieder.length === 0) throw new EingabeFehler("mitglieder", "mindestens ein Haushaltsmitglied angeben");
  mitglieder.forEach((m, i) => {
    if (m.ausschluss !== undefined && !AUSSCHLUSS_LEISTUNGEN.includes(m.ausschluss))
      throw new EingabeFehler(`mitglieder[${i}].ausschluss`, `unbekannte Leistung: ${String(m.ausschluss)}`);
  });
  if (vermoegen !== undefined && (typeof vermoegen !== "number" || !Number.isFinite(vermoegen) || vermoegen < 0))
    throw new EingabeFehler("vermoegen", "muss eine Zahl ab 0 sein");

  const ausgeschlossen = mitglieder.flatMap((m, index) => (m.ausschluss ? [{ index, leistung: m.ausschluss, norm: NORM[m.ausschluss] }] : []));
  const zuBeruecksichtigen = mitglieder.flatMap((m, index) => (m.ausschluss ? [] : [index]));
  const schritte: Rechenschritt[] = [
    {
      schritt: "Zu berücksichtigende Haushaltsmitglieder",
      norm: "§§ 5 bis 7 WoGG",
      wert: `${zuBeruecksichtigen.length} von ${mitglieder.length}`,
      erklaerung:
        ausgeschlossen.length > 0
          ? ausgeschlossen.map((a) => `Mitglied ${a.index + 1} ausgeschlossen (${BEZEICHNUNG[a.leistung]}, ${a.norm})`).join("; ")
          : "Kein Mitglied ausgeschlossen",
    },
  ];
  const annahmen: string[] = [];
  const hinweise: string[] = [];
  if (ausgeschlossen.length > 0)
    hinweise.push(
      "Kein Ausschluss, wenn die Leistung nur als Darlehen gezahlt wird oder Wohngeld die Hilfebedürftigkeit vermeidet oder beseitigt (§ 7 Abs. 1 Satz 3 WoGG). Dann das Mitglied ohne Ausschluss angeben.",
    );

  if (zuBeruecksichtigen.length === 0)
    return {
      zuBeruecksichtigen,
      ausgeschlossen,
      vermoegensgrenze: null,
      grund: { code: "alle_ausgeschlossen", norm: "§ 21 Nr. 2 WoGG", text: "Alle Haushaltsmitglieder sind vom Wohngeld ausgeschlossen." },
      schritte,
      annahmen,
      hinweise,
    };

  const w = rs.einkommen;
  const vermoegensgrenze = new D(w.vermoegenErstes).plus(new D(w.vermoegenWeiteres).times(zuBeruecksichtigen.length - 1));
  let grund: Ausschlussgrund | undefined;
  if (vermoegen === undefined) {
    annahmen.push("Kein erhebliches Vermögen angegeben (§ 21 Nr. 3 WoGG).");
  } else {
    const erheblich = new D(vermoegen).greaterThan(vermoegensgrenze);
    schritte.push({
      schritt: "Vermögen",
      norm: "§ 21 Nr. 3 WoGG, Nr. 21.37 WoGVwV",
      wert: new D(vermoegen).toFixed(2),
      erklaerung: `Regelgrenze ${vermoegensgrenze.toFixed(2)} € für ${zuBeruecksichtigen.length} zu berücksichtigende Mitglieder${erheblich ? ", überschritten" : ""}`,
    });
    hinweise.push("Die Vermögensgrenze ist ein Regelwert der Verwaltungsvorschrift; die Wohngeldbehörde prüft den Einzelfall.");
    if (erheblich)
      grund = {
        code: "vermoegen",
        norm: "§ 21 Nr. 3 WoGG",
        text: `Das Vermögen übersteigt die Regelgrenze von ${vermoegensgrenze.toFixed(2)} € (erhebliches Vermögen).`,
      };
  }

  return { zuBeruecksichtigen, ausgeschlossen, vermoegensgrenze, ...(grund ? { grund } : {}), schritte, annahmen, hinweise };
}
```

- [ ] **Step 5: Tests und Typprüfung**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle grün.

- [ ] **Step 6: Commit**

```bash
git add src/engine/rechenweg.ts src/engine/ausschluss.ts test/engine/ausschluss.test.ts
git commit -m "E2: Ausschluss nach § 7 WoGG und Vermögensgrenze nach § 21 Nr. 3 mit WoGVwV 21.37"
```

---

### Task 5: Formel und Miete nach der E1-Gesamt-Review nachschärfen

**Files:**
- Modify: `src/engine/formel.ts`
- Modify: `src/engine/miete.ts`
- Test: `test/engine/formel.test.ts`, `test/engine/miete.test.ts` (anhängen)

**Interfaces:**
- Consumes: `Ausschlussgrund` (Task 4)
- Produces: `FormelErgebnis` bekommt `grund?: Ausschlussgrund` und `annahmen: string[]`; `unterBagatellgrenze` ist nur noch wahr für 0 € < Betrag < 10 €; letzter Formel-Schritt trägt `grund?.norm ?? "§ 19 Abs. 1 WoGG"`; `berechneMiete` setzt bei Anteil ≠ 1 einen ersten Schritt „Anteil der zu berücksichtigenden Mitglieder“ mit Norm „§ 11 Abs. 3 WoGG“ und Wert `"<zu berücksichtigen>/<Mitglieder>"`.

- [ ] **Step 1: Failing tests anhängen** an `test/engine/formel.test.ts`:

```ts
describe("berechneFormel: Grund für 0 € und Annahmen", () => {
  it("negatives z4: Grund rechnerisch kein Wohngeld (§ 19 Abs. 1), nicht Bagatellgrenze", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "2500" });
    expect(e.grund).toMatchObject({ code: "rechnerisch_kein_wohngeld", norm: "§ 19 Abs. 1 WoGG" });
    expect(e.unterBagatellgrenze).toBe(false);
  });
  it("9 €: Grund Bagatellgrenze (§ 21 Nr. 1)", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1405.75" });
    expect(e.grund).toMatchObject({ code: "bagatellgrenze", norm: "§ 21 Nr. 1 WoGG" });
    expect(e.schritte.at(-1)?.norm).toBe("§ 21 Nr. 1 WoGG");
  });
  it("positives Wohngeld: kein Grund, letzter Schritt § 19 Abs. 1", () => {
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "1162.35" });
    expect(e.grund).toBeUndefined();
    expect(e.schritte.at(-1)).toMatchObject({ norm: "§ 19 Abs. 1 WoGG", wert: "110" });
  });
  it("§ 19 Abs. 3: Zuschlagsdeckel ist M aus § 11 vor dem Mindestwert-Ersatz", () => {
    // M = 200 liegt unter dem Mindestwert 298; gerechnet wird mit 298 (Grundbetrag 208), gedeckelt bei 200.
    const e = berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "200", y: "5000" });
    expect(e.grundbetrag).toBe(208);
    expect(e.zuschlag).toBe(0);
    expect(e.wohngeld).toBe(208);
  });
  it("§ 19 Abs. 3: Annahme „kein Zuschlag bei 0 €“ wird ausgegeben, wenn sie greift", () => {
    expect(berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "2018.60", y: "20000" }).annahmen.join(" ")).toContain("keine Zuschläge");
    expect(berechneFormel({ rechtsstand, zuBeruecksichtigen: 14, m: "2018.60", y: "4688.25" }).annahmen).toEqual([]);
    expect(berechneFormel({ rechtsstand, zuBeruecksichtigen: 1, m: "445.40", y: "2500" }).annahmen).toEqual([]);
  });
});
```

und an `test/engine/miete.test.ts`:

```ts
describe("berechneMiete: Rechenweg mit Anteil (§ 11 Abs. 3)", () => {
  it("Beispiel 10: Anteil als eigener erster Schritt, sechs Schritte mit Werten", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 4, haushaltsmitglieder: 2, zuBeruecksichtigen: 1, mieteMonatlich: 570 });
    expect(e.schritte[0]).toMatchObject({ norm: "§ 11 Abs. 3 WoGG", wert: "1/2" });
    expect(e.schritte.map((s) => s.wert)).toEqual(["1/2", "309.50", "12.40", "285.00", "71.30", "356.30"]);
  });
  it("Beispiel 1: ohne Mischhaushalt kein Anteil-Schritt, fünf Schritte", () => {
    const e = berechneMiete({ rechtsstand, mietstufe: 1, haushaltsmitglieder: 1, zuBeruecksichtigen: 1, mieteMonatlich: 335 });
    expect(e.schritte).toHaveLength(5);
    expect(e.schritte.map((s) => s.norm)).not.toContain("§ 11 Abs. 3 WoGG");
  });
});
```

- [ ] **Step 2: Tests laufen lassen, die neuen müssen rot sein**

Run: `npx vitest run test/engine/formel.test.ts test/engine/miete.test.ts`
Expected: FAIL in den neuen Tests (`grund` undefined, Zuschlag 90 statt 0, `annahmen` undefined, kein Anteil-Schritt); die alten Tests bleiben grün.

- [ ] **Step 3: `src/engine/formel.ts` ändern**

Import erweitern: `import { type Ausschlussgrund, EingabeFehler, type Rechenschritt } from "./rechenweg";`

In `FormelErgebnis` nach `unterBagatellgrenze: boolean;` ergänzen:

```ts
  grund?: Ausschlussgrund; // gesetzt, wenn das Wohngeld 0 € ist
  annahmen: string[];
```

Den Block ab `// § 19 Abs. 3:` bis einschließlich `const wohngeld = …` ersetzen durch:

```ts
  // § 19 Abs. 3: Zuschlag ab dem 13. Mitglied, höchstens bis zur Höhe von M. Gedeckelt wird mit dem M aus § 11,
  // nicht mit dem Mindestwert, der nur in die Formel eingesetzt wird.
  // Annahme: Der Zuschlag erhöht nur ein positives Wohngeld; ergibt die 12er-Rechnung 0 €, gibt es keinen Zuschlag.
  const annahmen: string[] = [];
  let zuschlag = 0;
  if (n > 12 && grundbetrag > 0) {
    const obergrenze = mRoh.toDecimalPlaces(0, D.ROUND_DOWN).toNumber();
    zuschlag = Math.max(0, Math.min((n - 12) * rs.zuschlagAb13, obergrenze - grundbetrag));
  }
  if (n > 12 && grundbetrag === 0)
    annahmen.push(
      "Über 12 Mitglieder: Ergibt die Rechnung für 12 Mitglieder kein Wohngeld, gibt es auch keine Zuschläge nach § 19 Abs. 3 WoGG (Annahme, im Gesetz nicht ausdrücklich geregelt).",
    );
  const vorBagatell = grundbetrag + zuschlag;
  const unterBagatellgrenze = vorBagatell > 0 && vorBagatell < rs.bagatellgrenze;
  const wohngeld = unterBagatellgrenze ? 0 : vorBagatell;
  let grund: Ausschlussgrund | undefined;
  if (vorBagatell === 0)
    grund = {
      code: "rechnerisch_kein_wohngeld",
      norm: "§ 19 Abs. 1 WoGG",
      text: "Nach der Formel ergibt sich kein Wohngeld: Das Einkommen ist im Verhältnis zur Miete zu hoch.",
    };
  else if (unterBagatellgrenze)
    grund = { code: "bagatellgrenze", norm: "§ 21 Nr. 1 WoGG", text: `Das Wohngeld läge unter ${rs.bagatellgrenze} € im Monat.` };
```

Den letzten `schritte.push` (Schritt „Wohngeld“) ersetzen durch:

```ts
  schritte.push({
    schritt: "Wohngeld",
    norm: grund?.norm ?? "§ 19 Abs. 1 WoGG",
    wert: String(wohngeld),
    erklaerung: grund?.text ?? "Monatliches Wohngeld",
  });
```

und die Rückgabe auf

```ts
  return { mEingesetzt: M, yEingesetzt: Y, z1, z2, z3, z4, grundbetrag, zuschlag, wohngeld, unterBagatellgrenze, ...(grund ? { grund } : {}), annahmen, schritte };
```

- [ ] **Step 4: `src/engine/miete.ts` ändern.** `const schritte: Rechenschritt[] = [ … ];` wird zu einer Liste, vor die bei Anteil ≠ 1 der Anteil-Schritt kommt:

```ts
  const schritte: Rechenschritt[] = [];
  if (!anteil.equals(1))
    schritte.push({
      schritt: "Anteil der zu berücksichtigenden Mitglieder",
      norm: "§ 11 Abs. 3 WoGG",
      wert: `${e.zuBeruecksichtigen}/${n}`,
      erklaerung: "Miete, Höchstbetrag und Entlastungsbeträge werden nur zu diesem Anteil angesetzt",
    });
  schritte.push(
    // die bisherigen fünf Einträge unverändert: Höchstbetrag, Klimakomponente, Berücksichtigte Miete, Entlastung Heizkosten, M
  );
```

Die fünf bisherigen Objektliterale wandern dabei wörtlich in den `push`-Aufruf; ihr Inhalt ändert sich nicht.

- [ ] **Step 5: Tests, Typprüfung, Gegentests**

Run: `npx vitest run && npx tsc --noEmit && npm run gegentest`
Expected: alle Tests grün; Gegentest 13 rot / 0 grün. Der Test „Zuschläge höchstens bis zur Höhe von M“ (M = 298, Y = 5000, Zuschlag 90) bleibt grün, weil dort M schon dem Mindestwert entspricht.

- [ ] **Step 6: Commit**

```bash
git add src/engine/formel.ts src/engine/miete.ts test/engine/formel.test.ts test/engine/miete.test.ts
git commit -m "E2: Grund für 0 €, Zuschlagsdeckel aus § 11, Annahme ohne Zuschlag, Anteil-Schritt § 11 Abs. 3"
```

---

### Task 6: Gesamtablauf `berechneWohngeld`

**Files:**
- Create: `src/engine/berechnen.ts`
- Test: `test/engine/berechnen.test.ts`

**Interfaces:**
- Consumes: `rechtsstandFuer`, `RechtsstandFehlt` (E1); `pruefeAusschluss` (Task 4); `berechneGesamteinkommen` (Task 3); `berechneMiete` (E1, Task 5); `berechneFormel` (E1, Task 5); `HaushaltEingabe` (Task 2); `EINGABEN_BMWSB_2025` (Task 3), `BMWSB_2025`
- Produces:
  - `berechneWohngeld(e: HaushaltEingabe): Berechnung`
  - `interface Berechnung { wohngeldMonatlich: number; rechtsstand: string; mietstufe: Mietstufe; art: "mietzuschuss" | "lastenzuschuss"; y: string | null; m: string | null; rechenweg: Rechenschritt[]; annahmen: string[]; hinweise: string[]; ausschlussgrund?: Ausschlussgrund }`
  - `HINWEIS_UNVERBINDLICH` (Konstante, E4 verwendet sie in der Tool-Antwort)

- [ ] **Step 1: Failing tests schreiben** in `test/engine/berechnen.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { berechneWohngeld, HINWEIS_UNVERBINDLICH } from "../../src/engine/berechnen";
import type { HaushaltEingabe, MitgliedEingabe } from "../../src/engine/eingabe";
import { EingabeFehler } from "../../src/engine/rechenweg";
import { RechtsstandFehlt } from "../../src/rechtsstand";
import { BMWSB_2025 } from "../fixtures/bmwsb-2025";
import { EINGABEN_BMWSB_2025 } from "../fixtures/bmwsb-2025-eingaben";

const ohne = { zahltSteuern: false, zahltKvPv: false, zahltRv: false };
const leer = (): MitgliedEingabe => ({ einnahmen: [], ...ohne });
const beispiel = (nr: number, aenderung: Partial<HaushaltEingabe> = {}): HaushaltEingabe => ({ ...EINGABEN_BMWSB_2025[nr], ...aenderung });
const rentnerin = (betrag: number): MitgliedEingabe => ({ einnahmen: [{ art: "rente", betragMonatlich: betrag }], ...ohne, zahltKvPv: true });

describe("berechneWohngeld: amtliche Beispiele von der vollständigen Eingabe bis zum Betrag", () => {
  for (const fall of BMWSB_2025) {
    it(`BMWSB-Beispiel ${fall.nr} (${fall.ort}) ergibt ${fall.wohngeld} €`, () => {
      const r = berechneWohngeld(EINGABEN_BMWSB_2025[fall.nr]);
      expect(r.wohngeldMonatlich).toBe(fall.wohngeld);
      expect(r.y).toBe(fall.y);
      expect(r.m).toBe(fall.m);
      expect(r.rechtsstand).toBe("wogg-2025");
      expect(r.hinweise).toContain(HINWEIS_UNVERBINDLICH);
      expect(r.ausschlussgrund).toBeUndefined();
    });
  }
});

describe("berechneWohngeld: Rechenweg", () => {
  it("Beispiel 1: 18 Schritte, Y, M und Betrag an fester Stelle", () => {
    const r = berechneWohngeld(EINGABEN_BMWSB_2025[1]);
    expect(r.rechenweg).toHaveLength(18);
    expect(r.rechenweg[0]).toMatchObject({ schritt: "Rechtsstand", wert: "wogg-2025" });
    expect(r.rechenweg[1]).toMatchObject({ norm: "§§ 5 bis 7 WoGG", wert: "1 von 1" });
    expect(r.rechenweg[5]).toMatchObject({ norm: "§ 13 Abs. 2 WoGG", wert: "1162.35" });
    expect(r.rechenweg[10]).toMatchObject({ schritt: "M", wert: "445.40" });
    expect(r.rechenweg[17]).toMatchObject({ norm: "§ 19 Abs. 1 WoGG", wert: "110" });
  });
  it("Beispiel 10: Mischhaushalt mit Anteil-Schritt und 19 Schritten", () => {
    const r = berechneWohngeld(EINGABEN_BMWSB_2025[10]);
    expect(r.rechenweg).toHaveLength(19);
    expect(r.rechenweg[1].wert).toBe("1 von 2");
    expect(r.rechenweg.find((s) => s.norm === "§ 11 Abs. 3 WoGG")?.wert).toBe("1/2");
  });
});

describe("berechneWohngeld: Review Focus", () => {
  it("Stichtag 2026 rechnet mit demselben Rechtsstand und Ergebnis", () => {
    expect(berechneWohngeld(beispiel(1, { stichtag: "2026-12-31" })).wohngeldMonatlich).toBe(110);
  });
  it("Einnahmen eines ausgeschlossenen Mitglieds zählen nicht (Beispiel 10)", () => {
    const h = beispiel(10);
    const sohn: MitgliedEingabe = { ...h.mitglieder[1], einnahmen: [{ art: "nichtselbstaendig", betragMonatlich: 3000 }] };
    const r = berechneWohngeld({ ...h, mitglieder: [h.mitglieder[0], sohn] });
    expect(r.wohngeldMonatlich).toBe(191);
    expect(r.y).toBe("784.35");
  });
  it("Freibeträge über dem Einkommen: Y = 0, Formel rechnet mit dem Mindestwert", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [{ ...rentnerin(80), grundrentenzeiten33: true }] }));
    expect(r.y).toBe("0.00");
    expect(r.wohngeldMonatlich).toBeGreaterThan(0);
  });
});

describe("berechneWohngeld: über 12 Mitglieder", () => {
  const haushalt = (anzahl: number): MitgliedEingabe[] => [
    { einnahmen: [{ art: "lohnersatz", betragMonatlich: 4688.25 }], ...ohne },
    ...Array.from({ length: anzahl - 1 }, leer),
  ];
  it("Länderfall: 14 Mitglieder, Stufe III, Miete 1.600 € ergibt 1.335 €", () => {
    const r = berechneWohngeld({ stichtag: "2025-07-01", mietstufe: 3, art: "mietzuschuss", mieteMonatlich: 1600, mitglieder: haushalt(14) });
    expect(r.y).toBe("4688.25");
    expect(r.m).toBe("2018.60");
    expect(r.wohngeldMonatlich).toBe(1335);
  });
  it("Mischhaushalt mit 15 Mitgliedern, eines ausgeschlossen: 1.261 € (Werte für 12, Anteil 14/15; nachgerechnet mit Python decimal)", () => {
    const mitglieder = haushalt(15);
    mitglieder[14] = { ...leer(), ausschluss: "grundsicherungsgeld_sgb2" };
    const r = berechneWohngeld({ stichtag: "2025-07-01", mietstufe: 3, art: "mietzuschuss", mieteMonatlich: 1600, mitglieder });
    expect(r.m).toBe("1884.03");
    expect(r.wohngeldMonatlich).toBe(1261);
  });
});

describe("berechneWohngeld: 0 € mit Grund", () => {
  it("§ 21 Nr. 2: alle ausgeschlossen, keine Rechnung", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [{ ...leer(), ausschluss: "grundsicherungsgeld_sgb2" }] }));
    expect(r.wohngeldMonatlich).toBe(0);
    expect(r.ausschlussgrund?.code).toBe("alle_ausgeschlossen");
    expect(r.y).toBeNull();
    expect(r.m).toBeNull();
    expect(r.hinweise).toContain(HINWEIS_UNVERBINDLICH);
  });
  it("§ 21 Nr. 3: Vermögen über der Regelgrenze", () => {
    expect(berechneWohngeld(beispiel(1, { vermoegen: 60000.01 })).ausschlussgrund?.code).toBe("vermoegen");
    expect(berechneWohngeld(beispiel(1, { vermoegen: 60000 })).wohngeldMonatlich).toBe(110);
  });
  it("§ 19 Abs. 1: Einkommen zu hoch", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [rentnerin(3000)] }));
    expect(r.wohngeldMonatlich).toBe(0);
    expect(r.ausschlussgrund?.code).toBe("rechnerisch_kein_wohngeld");
  });
  it("§ 21 Nr. 1: 6 € liegen unter der Bagatellgrenze", () => {
    const r = berechneWohngeld(beispiel(1, { mitglieder: [rentnerin(1580)] }));
    expect(r.wohngeldMonatlich).toBe(0);
    expect(r.ausschlussgrund?.code).toBe("bagatellgrenze");
  });
});

describe("berechneWohngeld: Annahmen und Fehler", () => {
  it("gleiche Annahmen erscheinen nur einmal", () => {
    const r = berechneWohngeld(
      beispiel(3, {
        mitglieder: [
          { ...rentnerin(1410), grundrentenzeiten33: true },
          { ...rentnerin(540), grundrentenzeiten33: true },
        ],
      }),
    );
    expect(r.annahmen.filter((a) => a.includes("Grundrentenfreibetrag"))).toHaveLength(1);
  });
  it("Stichtag ab 2027 ergibt RechtsstandFehlt", () => {
    expect(() => berechneWohngeld(beispiel(1, { stichtag: "2027-01-01" }))).toThrow(RechtsstandFehlt);
  });
  it("leerer Haushalt ergibt EingabeFehler", () => {
    expect(() => berechneWohngeld(beispiel(1, { mitglieder: [] }))).toThrow(EingabeFehler);
  });
  it("unbekannte Art ergibt EingabeFehler", () => {
    expect(() => berechneWohngeld(beispiel(1, { art: "wohnbeihilfe" as never }))).toThrow(EingabeFehler);
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss rot sein**

Run: `npx vitest run test/engine/berechnen.test.ts`
Expected: FAIL, Modul `berechnen` nicht gefunden.

- [ ] **Step 3: `src/engine/berechnen.ts` implementieren**

```ts
import { type Mietstufe, rechtsstandFuer } from "../rechtsstand";
import { pruefeAusschluss } from "./ausschluss";
import type { HaushaltEingabe } from "./eingabe";
import { berechneGesamteinkommen } from "./einkommen/gesamteinkommen";
import { berechneFormel } from "./formel";
import { berechneMiete } from "./miete";
import { type Ausschlussgrund, EingabeFehler, type Rechenschritt } from "./rechenweg";

export const HINWEIS_UNVERBINDLICH = "Unverbindliche Schätzung. Über den Anspruch entscheidet die Wohngeldbehörde.";

export interface Berechnung {
  wohngeldMonatlich: number;
  rechtsstand: string;
  mietstufe: Mietstufe;
  art: HaushaltEingabe["art"];
  y: string | null; // Anzeige mit zwei Stellen; null, wenn nicht gerechnet wurde
  m: string | null;
  rechenweg: Rechenschritt[];
  annahmen: string[];
  hinweise: string[];
  ausschlussgrund?: Ausschlussgrund;
}

const eindeutig = (liste: string[]): string[] => [...new Set(liste)];

// Gesamtablauf: Rechtsstand → Ausschluss (§§ 7, 21) → Einkommen (§§ 13 bis 18) → Miete (§§ 11, 12) → Formel (§ 19).
export function berechneWohngeld(e: HaushaltEingabe): Berechnung {
  const rs = rechtsstandFuer(e.stichtag);
  if (e.art !== "mietzuschuss" && e.art !== "lastenzuschuss") throw new EingabeFehler("art", "mietzuschuss oder lastenzuschuss");
  const rechenweg: Rechenschritt[] = [
    { schritt: "Rechtsstand", norm: rs.fundstelle, wert: rs.id, erklaerung: `Stichtag ${e.stichtag}, gültig ${rs.gueltigAb} bis ${rs.gueltigBis}` },
  ];
  const basis = { rechtsstand: rs.id, mietstufe: e.mietstufe, art: e.art };

  const ausschluss = pruefeAusschluss(rs, e.mitglieder, e.vermoegen);
  rechenweg.push(...ausschluss.schritte);
  const annahmen = [...ausschluss.annahmen];
  const hinweise = [HINWEIS_UNVERBINDLICH, ...ausschluss.hinweise];
  if (ausschluss.grund)
    return {
      ...basis,
      wohngeldMonatlich: 0,
      y: null,
      m: null,
      rechenweg,
      annahmen: eindeutig(annahmen),
      hinweise: eindeutig(hinweise),
      ausschlussgrund: ausschluss.grund,
    };

  const n = ausschluss.zuBeruecksichtigen.length;
  const einkommen = berechneGesamteinkommen({
    rechtsstand: rs,
    mitglieder: ausschluss.zuBeruecksichtigen.map((index) => ({ index, mitglied: e.mitglieder[index] })),
    alleinerziehend: e.alleinerziehend,
    unterhaltGezahlt: e.unterhaltGezahlt,
  });
  const miete = berechneMiete({
    rechtsstand: rs,
    mietstufe: e.mietstufe,
    haushaltsmitglieder: e.mitglieder.length,
    zuBeruecksichtigen: n,
    mieteMonatlich: e.mieteMonatlich,
  });
  const formel = berechneFormel({ rechtsstand: rs, zuBeruecksichtigen: n, m: miete.m, y: einkommen.y });

  rechenweg.push(...einkommen.schritte, ...miete.schritte, ...formel.schritte);
  annahmen.push(...einkommen.annahmen, ...formel.annahmen);
  hinweise.push(...einkommen.hinweise);

  return {
    ...basis,
    wohngeldMonatlich: formel.wohngeld,
    y: einkommen.y.toFixed(2),
    m: miete.m.toFixed(2),
    rechenweg,
    annahmen: eindeutig(annahmen),
    hinweise: eindeutig(hinweise),
    ...(formel.grund ? { ausschlussgrund: formel.grund } : {}),
  };
}
```

- [ ] **Step 4: Tests und Typprüfung**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle grün. Weicht die Schrittzahl in „Beispiel 1: 18 Schritte“ ab, die Zusammensetzung prüfen (1 Rechtsstand + 1 Haushalt + 4 Einkommen + 5 Miete + 7 Formel), nicht die Zahl im Test anpassen.

- [ ] **Step 5: Commit**

```bash
git add src/engine/berechnen.ts test/engine/berechnen.test.ts
git commit -m "E2: Gesamtablauf berechneWohngeld, alle 11 Beispiele von der Eingabe bis zum Betrag"
```

---

### Task 7: Gegentests erweitern, README-Annahmen

**Files:**
- Modify: `scripts/gegentest.mjs` (Liste `MUTATIONEN`)
- Modify: `README.md` (Abschnitt „Rechenregeln“)

**Interfaces:**
- Consumes: Code aus Task 1 bis 6
- Produces: `npm run gegentest` meldet alle Mutationen rot

- [ ] **Step 1: Mutationen an die Liste `MUTATIONEN` anhängen** (nach „Über 12 nicht gedeckelt“):

```js
  { name: "Arbeitnehmer-Pauschbetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "arbeitnehmerPauschbetrag: 1230", neu: "arbeitnehmerPauschbetrag: 1231" },
  { name: "Versorgungs-Pauschbetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "versorgungsPauschbetrag: 102", neu: "versorgungsPauschbetrag: 103" },
  { name: "Renten-Pauschbetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "rentenPauschbetrag: 102", neu: "rentenPauschbetrag: 103" },
  { name: "Kapital-Schwelle 100 €", datei: "src/rechtsstand/wogg-2025.ts", alt: "kapitalSchwelle: 100", neu: "kapitalSchwelle: 101" },
  { name: "Abzugssatz § 16", datei: "src/rechtsstand/wogg-2025.ts", alt: 'abzugsSatz: "0.1"', neu: 'abzugsSatz: "0.11"' },
  { name: "Elterngeld anrechnungsfrei", datei: "src/rechtsstand/wogg-2025.ts", alt: "elterngeldFreiMonatlich: 300", neu: "elterngeldFreiMonatlich: 301" },
  { name: "Zuwendungen Dritter frei", datei: "src/rechtsstand/wogg-2025.ts", alt: "zuwendungDritterFrei: 480", neu: "zuwendungDritterFrei: 481" },
  { name: "Freibetrag Schwerbehinderung", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragSchwerbehindert: 1800", neu: "freibetragSchwerbehindert: 1801" },
  { name: "Freibetrag NS-Verfolgung", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragNsVerfolgt: 750", neu: "freibetragNsVerfolgt: 751" },
  { name: "Freibetrag Alleinerziehende", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragAlleinerziehend: 1320", neu: "freibetragAlleinerziehend: 1321" },
  { name: "Höchstbetrag Kind-Freibetrag", datei: "src/rechtsstand/wogg-2025.ts", alt: "freibetragKindErwerbHoechst: 1200", neu: "freibetragKindErwerbHoechst: 1201" },
  { name: "Grundrente 30 %", datei: "src/rechtsstand/wogg-2025.ts", alt: 'grundrenteSatz: "0.3"', neu: 'grundrenteSatz: "0.31"' },
  { name: "Regelbedarfsstufe 1", datei: "src/rechtsstand/wogg-2025.ts", alt: "regelbedarfsstufe1: 563", neu: "regelbedarfsstufe1: 564" },
  { name: "Unterhalt Ehegatte", datei: "src/rechtsstand/wogg-2025.ts", alt: "ehegatte: 6000", neu: "ehegatte: 6001" },
  { name: "Vermögen erstes Mitglied", datei: "src/rechtsstand/wogg-2025.ts", alt: "vermoegenErstes: 60000", neu: "vermoegenErstes: 60001" },
  { name: "Vermögen weiteres Mitglied", datei: "src/rechtsstand/wogg-2025.ts", alt: "vermoegenWeiteres: 30000", neu: "vermoegenWeiteres: 30001" },
  { name: "Negative Einkünfte verrechnet", datei: "src/engine/einkommen/jahreseinkommen.ts", alt: "if (x.isNegative())", neu: "if (false)" },
  { name: "Hälfte nach § 14 Abs. 2 voll", datei: "src/engine/einkommen/jahreseinkommen.ts", alt: ".dividedBy(2));", neu: ".dividedBy(1));" },
  { name: "Y ein Zwölftel", datei: "src/engine/einkommen/gesamteinkommen.ts", alt: "gesamteinkommen.dividedBy(12)", neu: "gesamteinkommen.dividedBy(11)" },
  { name: "Ausschluss ignoriert", datei: "src/engine/ausschluss.ts", alt: "(m.ausschluss ? [] : [index])", neu: "[index]" },
  { name: "Zuschlagsdeckel nach Mindestwert", datei: "src/engine/formel.ts", alt: "mRoh.toDecimalPlaces(0, D.ROUND_DOWN)", neu: "M.toDecimalPlaces(0, D.ROUND_DOWN)" },
  { name: "Anteil-Schritt fehlt", datei: "src/engine/miete.ts", alt: "if (!anteil.equals(1))", neu: "if (false)" },
```

- [ ] **Step 2: Gegentests laufen lassen**

Run: `npm run gegentest; echo "exit=$?"`
Expected: 35 rot, 0 grün, `exit=0`. (Keine Mutation des Sparer-Pauschbetrags: Er kürzt sich nach WoGVwV Nr. 17.03.5 heraus, die Mutation wäre wirkungsgleich.) Meldet das Skript „Stelle nicht gefunden“, weicht der Code vom Plan ab: den `alt`-String an die tatsächliche Stelle anpassen, nicht die Mutation streichen. Bleibt eine Mutation grün, fehlt ein Test: im Testmodul des betroffenen Bausteins einen Verhaltenstest ergänzen, der die Stelle trifft, dann erneut laufen lassen. Nie eine grüne Mutation entfernen und nie einen Test ergänzen, der nur den Datenwert vergleicht (der wäre bei jeder Datenänderung rot und prüft die Engine nicht).

- [ ] **Step 3: README ergänzen.** Im Abschnitt „## Rechenregeln“ nach dem bestehenden Punkt zu über 12 Mitgliedern anhängen:

```markdown
- Einkommen nach §§ 13 bis 18 WoGG mit allen Einnahmearten aus § 14. Welche Art welche Nummer abdeckt, steht im Plan `docs/superpowers/plans/2026-10-08-e2-einkommen.md`.
- Kapitalerträge: Von den Erträgen bleiben 100 € im Jahr frei, der Rest zählt (§ 14 Abs. 2 Nr. 15 WoGG; Rechenweg wie WoGVwV Nr. 17.03.5 Beispiel 2).
- Elterngeld: 300 € im Monat bleiben frei (Elterngeld Plus 150 €), § 10 BEEG. Mehrlingszuschläge werden nicht abgebildet.
- Aktivrente (§ 14 Abs. 2 Nr. 12 WoGG, seit 2026): Den gesamten Arbeitslohn als nichtselbständige Arbeit eintragen; steuerfrei oder nicht, er zählt voll.
- Grundrentenfreibetrag (§ 17a WoGG): berechnet aus der gesamten angegebenen Rente, höchstens 3.378 € im Jahr (50 % der Regelbedarfsstufe 1 von 563 €, 2025 und 2026).
- Freibetrag für erwerbstätige Kinder (§ 17 Nr. 4 WoGG): nach Werbungskosten und dem 10-%-Abzug, wie WoGVwV Nr. 17.03.5.
- Vermögen (§ 21 Nr. 3 WoGG): Regelgrenze 60.000 € für das erste und 30.000 € für jedes weitere zu berücksichtigende Mitglied (WoGVwV Nr. 21.37). Die Behörde prüft den Einzelfall.
- Ausschluss (§ 7 WoGG): Wer Bürgergeld bzw. Grundsicherungsgeld, Grundsicherung, Hilfe zum Lebensunterhalt oder vergleichbare Leistungen bezieht, zählt nicht mit; Miete und Höchstbeträge werden dann anteilig angesetzt (§ 11 Abs. 3).
```

- [ ] **Step 4: Gesamtprüfung**

Run: `npx vitest run && npx tsc --noEmit && npm run gegentest; echo "exit=$?"`
Expected: alle Tests grün, tsc ohne Ausgabe, Gegentest alle rot / 0 grün, `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/gegentest.mjs README.md
git commit -m "E2: Gegentests für Einkommen, Ausschluss und Review-Korrekturen; README-Annahmen"
```
