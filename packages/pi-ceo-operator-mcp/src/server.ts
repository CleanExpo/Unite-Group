/**
 * Pi-CEO Operator MCP App definition.
 * Importing this module starts nothing: Skybridge 2 registers tools per request,
 * and src/index.ts alone starts the HTTP transport.
 */
import { createOperatorServer } from "./runtime.js";

export const app = createOperatorServer();
export type AppType = typeof app;
