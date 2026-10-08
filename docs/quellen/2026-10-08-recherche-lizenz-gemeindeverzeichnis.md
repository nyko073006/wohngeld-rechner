---
date: 2026-10-08
source: claude
chat_url: https://claude.ai/code/session_01G9peWGoGjXLUNJg2fCx3Mi
---

# Lizenz der Rohdaten für die Mietstufen (E3)

Klärt den offenen Punkt aus Spec Abschnitt 8 und 3.3. Abgerufen am 08.10.2026.

## Ergebnis

Beide Rohquellen dürfen unverändert in `data/roh/` eingecheckt und weiterverbreitet werden, auch in einem öffentlichen Repo. Die Pflicht ist ein Quellennachweis. Für abgeleitete Daten (`data/mietstufen-2023.json`) muss der Nachweis zusätzlich sagen, dass die Daten verändert bzw. nur als Berechnungsgrundlage verwendet wurden. Die MIT-Lizenz des Repos gilt nicht für diese Daten. Das muss die README sagen.

## 1. Destatis-Gemeindeverzeichnis (GV-ISys)

**Vermerk in der Datei selbst.** Die Datei „Alle politisch selbständigen Gemeinden mit ausgewählten Merkmalen am 31.12.2025“ (`31122025_Auszug_GV.xlsx`, Veröffentlichung 27.08.2026, Blatt „Inhalt“) trägt den Vermerk:

> © Daten (im Auftrag der Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder)
> Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet.

Quelle: https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GVAuszugJ/31122025_Auszug_GV.html (Download per Skript, Text aus `xl/sharedStrings.xml`). Primär, hoch.

**Allgemeine Destatis-Regel.** https://www.destatis.de/DE/Service/Impressum/copyright-allgemein.html:

> Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet.

Weiter heißt es dort: Die Weiterverwendung ist „sowohl für nicht gewerbliche als auch gewerbliche Zwecke erlaubt“, und zwar ohne ausdrückliche Genehmigung. Das Statistische Bundesamt (Destatis) ist „als Herausgeber in den Quellennachweis aufzunehmen“. Änderungen sind „als solche kenntlich zu machen bzw. im Quellennachweis mit dem Hinweis zu versehen, dass die Daten geändert, nur als Berechnungsgrundlage verwendet oder verändert dargestellt wurden“. Primär, hoch.

Einschränkung der allgemeinen Regel: Sie gilt, „soweit das Statistische Bundesamt Inhaber des Urheberrechts ist und die alleinigen Herausgeberrechte besitzt“. Herausgeber des GV-ISys ist aber die Herausgebergemeinschaft der Statistischen Ämter des Bundes und der Länder. Diese Lücke schließt der Vermerk in der Datei, denn er spricht für die ganze Herausgebergemeinschaft.

Nicht einschlägig: Die Datenlizenz Deutschland – Namensnennung – Version 2.0 gilt laut Impressum für GENESIS-Online, nicht für die GV-ISys-Downloads.

Überholt: Das Repo github.com/digineo/gemeindeverzeichnis behauptet, das Verzeichnis sei kostenpflichtig (108 € für Excel). Das trifft auf die Excel-Auszüge nicht zu, Destatis bietet sie frei zum Download an.

**Quellennachweis (Vorschlag für README und JSON-Kopf):**

> Gemeindeverzeichnis: © Statistisches Bundesamt (Destatis) im Auftrag der Herausgebergemeinschaft Statistische Ämter des Bundes und der Länder, GV-ISys, Gebietsstand <TT.MM.JJJJ>. Vervielfältigung und Verbreitung mit Quellenangabe gestattet. In `data/mietstufen-2023.json` nur als Berechnungsgrundlage verwendet und verändert dargestellt (Zuordnung Gemeinde → Kreis → Mietenstufe).

## 2. Anlage zu § 1 Abs. 3 WoGV (Mietenstufenliste)

Die Anlage ist Teil einer Rechtsverordnung. Gesetze und Verordnungen sind amtliche Werke nach § 5 Abs. 1 UrhG und genießen keinen urheberrechtlichen Schutz (https://www.gesetze-im-internet.de/urhg/__5.html). Für das HTML von gesetze-im-internet.de gibt es also keine Lizenzpflicht. Eine Quellenangabe ist trotzdem Pflicht im Projekt (Spec: Nachprüfbarkeit). Primär, hoch.

## Offen

Keine Lizenzfrage mehr offen. Welche GV-Ausgabe genutzt wird (Gebietsstand 31.03.2021 passend zur Liste oder aktueller Stand), entscheidet der E3-Plan. Der Lizenzvermerk ist für beide gleich zu prüfen, sobald die Datei feststeht.
