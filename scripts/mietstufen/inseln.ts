// Liest die Gemeindeliste aus § 12 Abs. 4a WoGG (https://www.gesetze-im-internet.de/wogg/__12.html):
// „Für die Gemeinden Baltrum, Borkum (Stadt), ... und Insel Hiddensee, die auf Inseln ohne Festlandanschluss liegen, ...“
export function parseInselnAusGesetz(html: string): string[] {
  const absatz = /\(4a\)([\s\S]*?)<\/div>/.exec(html)?.[1];
  if (!absatz) throw new Error("§ 12 WoGG: Absatz 4a nicht gefunden");
  const text = absatz
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  const liste = /Für die Gemeinden (.*?), die auf Inseln ohne Festlandanschluss liegen/.exec(text)?.[1];
  if (!liste) throw new Error("§ 12 WoGG: Gemeindeliste in Absatz 4a nicht gefunden");
  return liste.replace(/ und (Insel Hiddensee)$/, ", $1").split(", ");
}
