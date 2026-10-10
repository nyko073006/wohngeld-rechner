import { McpServer } from "@modelcontextprotocol/server";
import { registriereMietstufeFinden } from "./mietstufe-finden";
import { registriereWohngeldBerechnen } from "./wohngeld-berechnen";

export const SERVER_NAME = "wohngeld-rechner";
export const SERVER_VERSION = "0.2.0";

// Pro Request ein frischer Server (zustandslos).
export function erzeugeServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registriereMietstufeFinden(server);
  registriereWohngeldBerechnen(server);
  return server;
}
