// Packt plugin/ als Einreichungs-ZIP nach dist/; plugin.json liegt an der Wurzel des Archivs.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const wurzel = resolve(import.meta.dirname, "..");
const { name, version } = JSON.parse(readFileSync(resolve(wurzel, "plugin/plugin.json"), "utf8"));
const ziel = resolve(wurzel, `dist/${name}-${version}.zip`);
mkdirSync(resolve(wurzel, "dist"), { recursive: true });
rmSync(ziel, { force: true });
execFileSync("zip", ["-r", "-X", ziel, ".", "-x", "*.DS_Store"], { cwd: resolve(wurzel, "plugin"), stdio: "inherit" });
console.log(ziel);
