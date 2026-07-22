/**
 * Pi-CEO Operator MCP App production composition root.
 * Runtime construction stays import-safe in runtime.ts; this module alone starts
 * the HTTP transport and optionally binds the compiled Vite manifest.
 */
import { applyProductionManifest, createOperatorServer } from "./runtime.js";

const server = createOperatorServer();

if (process.env.NODE_ENV === "production") {
  await applyProductionManifest(server);
}

export default await server.run();
export type AppType = typeof server;
