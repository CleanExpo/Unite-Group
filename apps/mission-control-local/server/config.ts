import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_PORT = 42140;

export interface Config {
  port: number;
  dataDir: string;
  layoutsDir: string;
  fixturePath?: string;
  showTailscaleIp: boolean;
}

/** Everything here is local to this machine and sits outside the repo by default. */
export function readConfig(env: NodeJS.ProcessEnv): Config {
  const port = env.MC_PORT === undefined ? DEFAULT_PORT : Number(env.MC_PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('MC_PORT must be a port number.');
  }
  const dataDir = env.MC_DATA_DIR ?? join(homedir(), '.unite-mission-control');
  return {
    port,
    dataDir,
    layoutsDir: join(dataDir, 'layouts'),
    fixturePath: env.MC_FIXTURE || undefined,
    showTailscaleIp: env.MC_SHOW_TAILSCALE_IP === '1',
  };
}
