import { spawnSync } from 'node:child_process';

const SECURITY_ROUTE_CHECK_COMMAND = [
  'ts-node',
  '--transpile-only',
  '-O',
  '{"module":"commonjs","moduleResolution":"node"}',
  'scripts/check-route-inventory.ts',
];

describe('scripts/check-route-inventory', () => {
  it('treats signed Telegram approval callback decisions as a protected mutating route', () => {
    const result = spawnSync('npx', SECURITY_ROUTE_CHECK_COMMAND, {
      cwd: process.cwd(),
      env: { ...process.env, ROUTE_INVENTORY_ALLOWLIST: '' },
      encoding: 'utf8',
    });

    expect(`${result.stdout}\n${result.stderr}`).not.toContain('/api/telegram/approval-callback');
    expect(result.status).toBe(0);
  });

  it('treats the DR/NRPG CRM lead integration gate as a protected mutating route', () => {
    const result = spawnSync('npx', SECURITY_ROUTE_CHECK_COMMAND, {
      cwd: process.cwd(),
      env: { ...process.env, ROUTE_INVENTORY_ALLOWLIST: '' },
      encoding: 'utf8',
    });

    expect(`${result.stdout}\n${result.stderr}`).not.toContain('/api/integrations/dr-nrpg/crm/leads');
    expect(result.status).toBe(0);
  });
});
