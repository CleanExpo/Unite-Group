/**
 * UNI-3520: GET /api/portal/artefacts must refuse anonymous and non-admin
 * callers, and must refuse any client value outside the known map, before it
 * touches the file system.
 */
import { join } from 'path';
import os from 'os';
import { NextResponse } from 'next/server';

jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

import { requireAdmin } from '@/lib/security/require-admin';
import { readdir, readFile } from 'fs/promises';
import { GET } from '../route';

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockReaddir = readdir as unknown as jest.Mock;
const mockReadFile = readFile as unknown as jest.Mock;

const ARTEFACTS_ROOT = join(os.homedir(), 'Pi-CEO/Pi-Dev-Ops/.harness/artefacts');

function get(query: string) {
  return GET(new Request(`http://localhost/api/portal/artefacts${query}`));
}

function asAdmin() {
  mockRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'admin@example.test' });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReaddir.mockResolvedValue(['2026-11-01-positioning.md', 'notes.txt']);
  mockReadFile.mockResolvedValue('# Positioning brief\nBody text for the preview.');
});

describe('GET /api/portal/artefacts: authentication', () => {
  it('returns 401 and reads no files when there is no session', async () => {
    mockRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    );
    const res = await get('?client=ccw');
    expect(res.status).toBe(401);
    expect(mockReaddir).not.toHaveBeenCalled();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('returns 403 and reads no files for a logged-in non-admin', async () => {
    mockRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    );
    const res = await get('?client=ccw');
    expect(res.status).toBe(403);
    expect(mockReaddir).not.toHaveBeenCalled();
  });
});

describe('GET /api/portal/artefacts: client allow-list', () => {
  it.each(['../x', '../../..', 'unknown-client', 'ccw/../..', ''])(
    'returns 400 and reads no files for client=%p',
    async (client) => {
      asAdmin();
      const res = await get(`?client=${encodeURIComponent(client)}`);
      expect(res.status).toBe(400);
      expect(mockReaddir).not.toHaveBeenCalled();
      expect(mockReadFile).not.toHaveBeenCalled();
    },
  );
});

describe('GET /api/portal/artefacts: known client still works', () => {
  it('lists markdown artefacts for an admin and client=ccw', async () => {
    asAdmin();
    const res = await get('?client=ccw');
    expect(res.status).toBe(200);
    expect(mockReaddir).toHaveBeenCalledWith(join(ARTEFACTS_ROOT, 'ccw'));
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.artefacts[0].title).toBe('Positioning brief');
    expect(body.artefacts[0].date).toBe('2026-11-01');
  });

  it('maps client=ccw-crm to the same folder', async () => {
    asAdmin();
    const res = await get('?client=ccw-crm');
    expect(res.status).toBe(200);
    expect(mockReaddir).toHaveBeenCalledWith(join(ARTEFACTS_ROOT, 'ccw'));
  });

  it('keeps the existing default when no client is given', async () => {
    asAdmin();
    const res = await get('');
    expect(res.status).toBe(200);
    expect(mockReaddir).toHaveBeenCalledWith(join(ARTEFACTS_ROOT, 'ccw'));
  });
});
