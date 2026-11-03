/**
 * Pi-CEO Operator MCP App production composition root: the only module that
 * starts the HTTP transport. In a build, the generated dist/__entry.js binds the
 * compiled Vite manifest before importing this file.
 */
import { app } from "./server.js";
import { configureSkybridgePort } from "./port-env.js";

// The Skybridge CLI bridges PORT to __PORT, but Docker launches this file
// directly to preserve PID 1 and graceful SIGTERM handling.
configureSkybridgePort(process.env);

export default await app.run();
