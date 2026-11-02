import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, BIND_HOST, listen } from './app.ts';
import { createAuth, loadPasscode, PasscodeConfigError } from './auth.ts';
import { createFleetSource } from './broker.ts';
import { readConfig } from './config.ts';
import { createLayoutStore } from './layouts.ts';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
  const config = readConfig(process.env);
  const passcode = loadPasscode(process.env, config.dataDir);
  const server = createApp({
    auth: createAuth(passcode),
    layouts: createLayoutStore(config.layoutsDir),
    fleet: createFleetSource({
      fixturePath: config.fixturePath,
      showTailscaleIp: config.showTailscaleIp,
    }),
    clientDir: join(appRoot, 'dist', 'client'),
  });
  await listen(server, config.port);
  const mode = config.fixturePath ? ' (FIXTURE DATA)' : '';
  console.log(`Mission Control on http://${BIND_HOST}:${config.port}/screen/1${mode}`);
} catch (err) {
  console.error(err instanceof PasscodeConfigError ? err.message : `Failed to start: ${(err as Error).name}`);
  process.exitCode = 1;
}
