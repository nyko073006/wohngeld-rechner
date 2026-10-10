// Prüft den deployten Server über HTTP wie ein MCP-Client. Exit 0 nur, wenn alle Prüfungen stimmen.
import { INITIALIZE_PARAMS, rufeMcp } from "../test/hilfen/mcp";

const url = process.argv[2] ?? "https://wohngeld-rechner.nyko-a85.workers.dev/mcp";
const fetchFn = (r: Request) => fetch(new Request(url, r));
let fehler = 0;
const pruefe = (name: string, ok: boolean, ist: unknown) => {
  console.log(`${ok ? "ok    " : "FEHLER"} ${name}${ok ? "" : `: ${JSON.stringify(ist)}`}`);
  if (!ok) fehler++;
};

const init = await rufeMcp(fetchFn, "initialize", INITIALIZE_PARAMS);
pruefe("initialize Version 0.2.0", init.body?.result?.serverInfo?.version === "0.2.0", init.body);

const liste = await rufeMcp(fetchFn, "tools/list");
const namen = (liste.body?.result?.tools ?? []).map((t: { name: string }) => t.name).sort();
pruefe("tools/list", JSON.stringify(namen) === JSON.stringify(["mietstufe_finden", "wohngeld_berechnen"]), namen);

const ort = await rufeMcp(fetchFn, "tools/call", { name: "mietstufe_finden", arguments: { gemeinde: "Monheim", land: "NRW" } });
const t = ort.body?.result?.structuredContent;
pruefe("mietstufe_finden Monheim NRW = VI", t?.status === "eindeutig" && t?.treffer?.mietstufe === 6, t);

const rechnung = await rufeMcp(fetchFn, "tools/call", {
  name: "wohngeld_berechnen",
  arguments: {
    stichtag: "2025-07-01",
    mietstufe: 1,
    art: "mietzuschuss",
    miete_monatlich: 335,
    mitglieder: [{ einnahmen: [{ art: "rente", betrag_monatlich: 1300 }], zahlt_steuern: false, zahlt_kv_pv: true, zahlt_rv: false }],
  },
});
const r = rechnung.body?.result?.structuredContent;
pruefe("wohngeld_berechnen BMWSB-Beispiel 1 = 110 €", r?.wohngeld_monatlich === 110, r ?? rechnung.body);

const fremd = await fetch(url.replace(/\/mcp$/, "/anderes"));
pruefe("404 außerhalb von /mcp", fremd.status === 404, fremd.status);

process.exit(fehler > 0 ? 1 : 0);
