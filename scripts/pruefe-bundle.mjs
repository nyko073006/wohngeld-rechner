// Baut den Worker wie beim Deploy (ohne Hochladen) und prüft das Ergebnis:
// keine node:-Importe (Workers ohne nodejs_compat) und unter 3 MiB gzip (Workers Free).
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { gzipSync } from "node:zlib";

const AUSGABE = "dist-pruefung";
const GRENZE_GZIP = 3 * 1024 * 1024;

rmSync(AUSGABE, { recursive: true, force: true });
const bau = spawnSync("npx", ["wrangler", "deploy", "--dry-run", "--outdir", AUSGABE], { stdio: "inherit" });
if (bau.status !== 0) {
  console.error("wrangler deploy --dry-run ist fehlgeschlagen.");
  process.exit(1);
}

const dateien = readdirSync(AUSGABE).filter((d) => d.endsWith(".js"));
if (dateien.length === 0) {
  console.error(`Keine .js-Datei in ${AUSGABE}.`);
  process.exit(1);
}
let fehler = 0;
for (const d of dateien) {
  const code = readFileSync(`${AUSGABE}/${d}`, "utf8");
  const node = code.match(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']node:[^"']+["']/g) ?? [];
  const gz = gzipSync(code).length;
  console.log(`${d}: ${code.length} Bytes, gzip ${gz} Bytes, node:-Importe ${node.length}`);
  if (node.length > 0) {
    console.error(node.join("\n"));
    fehler++;
  }
  if (gz > GRENZE_GZIP) {
    console.error(`${d} ist größer als 3 MiB gzip.`);
    fehler++;
  }
}
process.exit(fehler > 0 ? 1 : 0);
