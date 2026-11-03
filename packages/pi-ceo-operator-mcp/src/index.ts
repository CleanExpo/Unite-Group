/**
 * Pi-CEO Operator MCP App production composition root: the only module that
 * starts the HTTP transport. In a build, the generated dist/__entry.js binds the
 * compiled Vite manifest before importing this file.
 */
import { app } from "./server.js";

export default await app.run();
