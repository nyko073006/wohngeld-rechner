---
date: 2026-10-10
source: claude
chat_url: https://claude.ai/code/session_01Hfu71SFPNRx6dVyExTgxPn
---

# Auffindbarkeit im ChatGPT-Verzeichnis (vor der Einreichung)

Frage: Schlägt ChatGPT den Rechner nach Aufnahme ins Verzeichnis ungefragt vor, statt im Web zu suchen? Abgerufen am 10.10.2026. Mehrere OpenAI-Seiten (help.openai.com, Launch-Blog, `apps-sdk/concepts/user-interaction`) lieferten beim Abruf 403 oder 404; Aussagen daraus sind als „berichtet“ markiert.

## Ergebnis

Nicht zugesichert. Ungefragte Vorschläge gibt es nur als mögliche Belohnung für Plugins mit nachgewiesener Nutzung und Zufriedenheit. Die Einreichung macht den Rechner installierbar, nicht auffindbar. Der einzige belegte Hebel auf die Tool-Wahl sind die Metadaten.

## Belegt (selbst nachgelesen)

**Einreichungsrichtlinien**, https://developers.openai.com/apps-sdk/app-submission-guidelines:

> Plugins that demonstrate strong real-world utility and high user satisfaction may be eligible for enhanced distribution opportunities, such as directory placement or proactive suggestions.

Das Verzeichnis heißt jetzt „universal directory shared by ChatGPT and Codex“ (Plugin Directory).

**Metadaten-Leitfaden**, https://developers.openai.com/apps-sdk/guides/optimize-metadata:

> ChatGPT and Codex decide when to call your tool based on the metadata you provide. Well-crafted names, descriptions, and parameter docs increase recall on relevant prompts and reduce accidental activations.

Empfohlen: Tool-Namen aus Domäne und Aktion, Beschreibungen mit „Use this when…“ und Ausschlüssen, Golden-Prompt-Set aus direkten, indirekten und negativen Prompts, eine Änderung pro Durchlauf.

## Einreichungsvoraussetzungen (laut Richtlinien)

- Verifizierte Person oder Organisation im OpenAI-Plattform-Dashboard
- Veröffentlichte Datenschutzerklärung: Datenkategorien, Zwecke, Empfänger, Aufbewahrung, Nutzerkontrollen
- Support-Kontakt, aktuell gehalten
- Getestet auf Desktop und Mobil
- Demo-Konto nur bei Authentifizierung (hier nicht nötig)
- UI-Einbettungen nur von eigener Domain, in der CSP deklariert (hier ohne Widget nicht relevant)
- Demo-Video wird nicht verlangt

## Berichtet (nicht im Volltext geprüft)

- Umbenennung App Directory → Plugin Directory am 09.07.2026 (Suchzusammenfassung zu help.openai.com/en/articles/20001256).
- Beim Start (Okt. 2025) keine Apps in EWR, Schweiz und UK, „soon“ für die EU angekündigt. Aktueller EU-Stand unbekannt.
- Verbundene Apps lassen sich per @-Nennung oder Tools-Menü auslösen; ohne Nennung „In-conversation discovery“ ohne veröffentlichte Bedingungen.
- Marketingblogs (moburst, phiture) behaupten Vorschläge mitten im Gespräch; keine OpenAI-Belege.

## Eigene Beobachtung (Abnahme 10.10.2026)

Ohne ausgewähltes Plugin hat ChatGPT im Web gesucht und das BMWSB-Beispiel abgelesen; der Server bekam keinen Aufruf.
