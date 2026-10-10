// Statische Seiten für Einreichung und Rechtstexte. Reines HTML, kein Skript, keine Cookies.
const MAIL = "wohngeld@patinasouthside.de";
const REPO = "https://github.com/nyko073006/wohngeld-rechner";
const HINWEIS =
  "Unverbindliche Schätzung, keine Rechtsberatung. Maßgeblich ist der Bescheid der Wohngeldbehörde.";

const CSS = `body{font:16px/1.55 system-ui,sans-serif;max-width:42rem;margin:0 auto;padding:1rem 16px 3rem;color:#1a1a1a;background:#fff}
h1{font-size:1.6rem}h2{font-size:1.15rem;margin-top:1.8rem}a{color:#0b5cad}
nav{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;margin:1rem 0}.hinweis{background:#f3f3f3;padding:.7rem 1rem;border-radius:6px}
@media (prefers-color-scheme:dark){body{color:#e8e8e8;background:#161616}a{color:#7db7f5}.hinweis{background:#242424}}`;

const NAV = `<nav><a href="/">Start</a> <a href="/datenschutz">Datenschutz</a> <a href="/impressum">Impressum</a> <a href="/support">Support</a> <a href="/nutzungsbedingungen">Nutzungsbedingungen</a></nav>`;

function seite(titel: string, inhalt: string): string {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titel}</title><style>${CSS}</style></head><body>
<h1>${titel}</h1>
${NAV}
${inhalt}
<hr>${NAV}
</body></html>`;
}

const START = seite(
  "Wohngeld-Rechner",
  `<p>Der Wohngeld-Rechner ist ein MCP-Server für ChatGPT. Er schätzt das Wohngeld nach dem Wohngeldgesetz (WoGG) und ermittelt die Mietstufe einer Gemeinde.</p>
<p class="hinweis">${HINWEIS}</p>
<ul><li><a href="/datenschutz">Datenschutz</a></li><li><a href="/impressum">Impressum</a></li><li><a href="/support">Support</a></li><li><a href="/nutzungsbedingungen">Nutzungsbedingungen</a></li></ul>
<h2>English summary</h2>
<p>This is an MCP server for ChatGPT that estimates German housing benefit (Wohngeld, WoGG) and looks up the rent level of a municipality. Non-binding estimate, no legal advice; the decision of the housing benefit authority is binding.</p>`,
);

const IMPRESSUM = seite(
  "Impressum",
  `<p>Angaben nach § 5 DDG</p>
<p>Niklas J. Thaler<br>Hermann-Löns-Straße 10<br>89537 Giengen</p>
<p>E-Mail: <a href="mailto:${MAIL}">${MAIL}</a></p>
<h2>English summary</h2>
<p>Provider: Niklas J. Thaler (private individual), Hermann-Löns-Straße 10, 89537 Giengen, Germany. Contact: ${MAIL}</p>`,
);

const DATENSCHUTZ = seite(
  "Datenschutzerklärung",
  `<h2>Verantwortlicher</h2>
<p>Niklas J. Thaler, Hermann-Löns-Straße 10, 89537 Giengen, E-Mail: <a href="mailto:${MAIL}">${MAIL}</a> (siehe <a href="/impressum">Impressum</a>).</p>
<h2>Welche Angaben verarbeitet werden</h2>
<p>Die Angaben, die ChatGPT an die Tools des Rechners übergibt (Miete, Haushaltsmitglieder, Einnahmen, Ort), werden nur zur Berechnung im Arbeitsspeicher verarbeitet. Sie werden nicht gespeichert, nicht protokolliert und nicht weitergegeben.</p>
<h2>Nutzungsstatistik</h2>
<p>Gezählt wird nur, welches Tool an welchem Tag wie oft aufgerufen wurde. Es werden keine IP-Adressen und keine Eingaben erfasst; die Zahlen haben keinen Personenbezug.</p>
<h2>Hosting</h2>
<p>Der Rechner läuft auf Cloudflare Workers (Cloudflare, Inc.; Auftragsverarbeitung). Die Datenübermittlung in die USA stützt sich auf das EU-US Data Privacy Framework. Cloudflare verarbeitet technisch die IP-Adresse, um die Seiten auszuliefern; eigene Server-Logs sind abgeschaltet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Bereitstellung und Sicherheit des Dienstes).</p>
<h2>ChatGPT</h2>
<p>Für die Verarbeitung im Chat ist OpenAI verantwortlich, siehe deren <a href="https://openai.com/policies/privacy-policy">Datenschutzerklärung</a>.</p>
<h2>Cookies, Tracking, Speicherdauer</h2>
<p>Keine Cookies, kein Tracking. Eingaben werden nicht gespeichert, es gibt dafür keine Speicherdauer. Die Zählerwerte ohne Personenbezug werden nach 90 Tagen gelöscht.</p>
<h2>Ihre Rechte</h2>
<p>Sie haben die Rechte nach Art. 15 bis 21 DSGVO (Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch). Beschwerden richten Sie an die Aufsichtsbehörde: Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg.</p>
<p>Stand: 10.10.2026</p>
<h2>English summary</h2>
<p>Inputs passed by ChatGPT to the tools (rent, household members, income, location) are processed in memory only for the calculation. They are not stored, logged or shared. We only count tool calls per tool and day (no IP addresses, no inputs); counters are deleted after 90 days. Hosting: Cloudflare Workers (EU-US Data Privacy Framework), legal basis Art. 6(1)(f) GDPR. No cookies, no tracking. OpenAI is responsible for processing inside ChatGPT. Contact: ${MAIL}</p>`,
);

const SUPPORT = seite(
  "Support",
  `<p>Bei Fehlern oder Fragen zum Rechner: <a href="mailto:${MAIL}">${MAIL}</a></p>
<h2>Wofür und wofür nicht</h2>
<p>Gemeldet werden können Fehler und Fragen zum Rechner. Nicht möglich sind Beratung im Einzelfall und die Antragstellung; dafür ist die Wohngeldbehörde Ihrer Gemeinde zuständig.</p>
<p class="hinweis">${HINWEIS}</p>
<p>Quellcode und Fehlermeldungen: <a href="${REPO}">${REPO}</a></p>
<h2>English summary</h2>
<p>For bugs or questions about the calculator write to ${MAIL} or open an issue at ${REPO}. We cannot give individual advice or file applications; the local housing benefit authority is responsible. Non-binding estimate, no legal advice.</p>`,
);

const NUTZUNGSBEDINGUNGEN = seite(
  "Nutzungsbedingungen",
  `<h2>Anbieter</h2>
<p>Niklas J. Thaler, Hermann-Löns-Straße 10, 89537 Giengen (siehe <a href="/impressum">Impressum</a>).</p>
<h2>Leistung</h2>
<p>Der Wohngeld-Rechner ist ein kostenloser MCP-Server, den ChatGPT aufruft. Er schätzt das Wohngeld nach dem Wohngeldgesetz und ermittelt die Mietstufe einer Gemeinde. Es besteht kein Anspruch auf ständige Verfügbarkeit; der Dienst kann jederzeit geändert oder eingestellt werden.</p>
<h2>Keine Beratung</h2>
<p class="hinweis">${HINWEIS}</p>
<p>Die Ergebnisse beruhen auf den Angaben, die im Chat gemacht werden, und auf dem angezeigten Rechtsstand. Sie ersetzen weder den Antrag noch die Prüfung durch die Wohngeldbehörde.</p>
<h2>Haftung</h2>
<p>Für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung von Leben, Körper oder Gesundheit wird nach den gesetzlichen Vorschriften gehaftet. Im Übrigen ist die Haftung für Schäden aus der Nutzung des kostenlosen Dienstes ausgeschlossen, soweit das Gesetz es zulässt.</p>
<h2>Datenschutz</h2>
<p>Siehe <a href="/datenschutz">Datenschutzerklärung</a>.</p>
<h2>Recht</h2>
<p>Es gilt das Recht der Bundesrepublik Deutschland. Zwingende Verbraucherschutzvorschriften des Staates, in dem Sie wohnen, bleiben unberührt.</p>
<p>Stand: 11.10.2026</p>
<h2>English summary</h2>
<p>Wohngeld-Rechner is a free MCP server used by ChatGPT, provided by Niklas J. Thaler, Giengen, Germany. It gives a non-binding estimate of German housing benefit, not legal advice; the decision of the housing benefit authority is binding. No guarantee of availability. Liability is limited to intent, gross negligence and injury to life, body or health, as far as the law permits. German law applies; mandatory consumer protection rules of your country of residence remain unaffected. Contact: ${MAIL}</p>`,
);

const SEITEN: Record<string, string> = {
  "/": START,
  "/datenschutz": DATENSCHUTZ,
  "/impressum": IMPRESSUM,
  "/support": SUPPORT,
  "/nutzungsbedingungen": NUTZUNGSBEDINGUNGEN,
};

// Domain-Nachweis fürs OpenAI-Portal: genau der Token, sonst nichts. Kommt als Secret, nie aus dem Repo.
export function challengeFuer(token: string | undefined): Response | null {
  const wert = token?.trim();
  if (!wert) return null;
  return new Response(wert, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

export function seiteFuer(pfad: string): Response | null {
  const html = SEITEN[pfad];
  if (html === undefined) return null;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
