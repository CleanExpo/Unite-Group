// Unit tests for branch-ticket-resolver (UNI-1998 #3 — DB-write helper
// coverage). Covers the pure parser (`extractLinearKey`) and the mutation
// writer (`resolveBranchesToTickets`) that upserts into `developer_branch_map`.
//
// The mutation tests mock `getAdminClient` so we verify the call shape, the
// filter logic, and the upsert payload without touching prod.

import {
  extractLinearKey,
  resolveBranchesToTickets,
} from '@/lib/developers/branch-ticket-resolver';

const upsertMock = jest.fn().mockResolvedValue({ error: null });
const fromMock = jest.fn(() => ({ upsert: upsertMock }));
jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

beforeEach(() => {
  upsertMock.mockClear();
  fromMock.mockClear();
});

describe('extractLinearKey — regex shape', () => {
  test('extracts standard Linear key from a feature branch', () => {
    expect(extractLinearKey('feature/UNI-123-some-name')).toBe('UNI-123');
  });

  test('canonicalises lowercase to uppercase', () => {
    expect(extractLinearKey('fix/uni-456')).toBe('UNI-456');
  });

  test('matches minimum-shape key (2 letters, 1 digit)', () => {
    expect(extractLinearKey('AB-1')).toBe('AB-1');
  });

  test('matches maximum-shape key (4 letters, 5 digits)', () => {
    expect(extractLinearKey('ABCD-99999')).toBe('ABCD-99999');
  });

  test('rejects 1-letter prefix', () => {
    expect(extractLinearKey('A-1')).toBeNull();
  });

  test('rejects 5-letter prefix', () => {
    expect(extractLinearKey('ABCDE-1')).toBeNull();
  });

  test('rejects 6-digit suffix', () => {
    expect(extractLinearKey('ABC-123456')).toBeNull();
  });

  test('returns null when branch has no Linear key', () => {
    expect(extractLinearKey('main')).toBeNull();
    expect(extractLinearKey('feature/no-ticket-here')).toBeNull();
  });

  test('returns the FIRST match when multiple keys are present', () => {
    expect(extractLinearKey('feature/RA-2-then-UNI-99')).toBe('RA-2');
  });

  test('finds an embedded key surrounded by slashes', () => {
    expect(extractLinearKey('phillmcgurk/UNI-99/something')).toBe('UNI-99');
  });
});

describe('resolveBranchesToTickets — mutation shape', () => {
  test('no-op when branches is empty', async () => {
    await resolveBranchesToTickets([]);
    expect(fromMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test('filters out untagged "main" branches before writing', async () => {
    await resolveBranchesToTickets([
      {
        repo: 'CleanExpo/Unite-Group',
        branch: 'main',
        developerEmail: 'phill@example.com',
        lastCommitAt: '2026-05-18T00:00:00Z',
      },
    ]);
    // main + no Linear key → filtered out → no upsert call
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test('writes a row when branch carries a Linear key', async () => {
    await resolveBranchesToTickets([
      {
        repo: 'CleanExpo/Unite-Group',
        branch: 'feature/UNI-123-something',
        developerEmail: 'phill@example.com',
        lastCommitAt: '2026-05-18T00:00:00Z',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('developer_branch_map');
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [rows, opts] = upsertMock.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'repo,branch' });
    expect(rows).toEqual([
      {
        repo: 'CleanExpo/Unite-Group',
        branch: 'feature/UNI-123-something',
        linear_issue_id: 'UNI-123',
        developer_email: 'phill@example.com',
        last_seen_at: '2026-05-18T00:00:00Z',
      },
    ]);
  });

  test('keeps non-main branches without Linear keys (linear_issue_id = null)', async () => {
    await resolveBranchesToTickets([
      {
        repo: 'CleanExpo/Unite-Group',
        branch: 'feature/no-ticket-here',
        developerEmail: 'rana@example.com',
        lastCommitAt: '2026-05-18T00:00:00Z',
      },
    ]);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [rows] = upsertMock.mock.calls[0];
    expect(rows[0].linear_issue_id).toBeNull();
    expect(rows[0].developer_email).toBe('rana@example.com');
  });

  test('falls back to current time when lastCommitAt is null', async () => {
    const before = new Date().toISOString();
    await resolveBranchesToTickets([
      {
        repo: 'CleanExpo/Unite-Group',
        branch: 'feature/UNI-200-no-commit-time',
        developerEmail: 'phill@example.com',
        lastCommitAt: null,
      },
    ]);
    const after = new Date().toISOString();
    const [rows] = upsertMock.mock.calls[0];
    expect(rows[0].last_seen_at >= before).toBe(true);
    expect(rows[0].last_seen_at <= after).toBe(true);
  });

  test('batches multiple branches into a single upsert call', async () => {
    await resolveBranchesToTickets([
      {
        repo: 'CleanExpo/Unite-Group',
        branch: 'feature/UNI-1',
        developerEmail: 'a@example.com',
        lastCommitAt: '2026-05-18T00:00:00Z',
      },
      {
        repo: 'CleanExpo/RestoreAssist',
        branch: 'feature/RA-2',
        developerEmail: 'b@example.com',
        lastCommitAt: '2026-05-18T01:00:00Z',
      },
    ]);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [rows] = upsertMock.mock.calls[0];
    expect(rows).toHaveLength(2);
    expect(rows[0].linear_issue_id).toBe('UNI-1');
    expect(rows[1].linear_issue_id).toBe('RA-2');
  });

  test('does not leak unrelated fields into the upsert payload', async () => {
    await resolveBranchesToTickets([
      {
        repo: 'CleanExpo/Unite-Group',
        branch: 'feature/UNI-300',
        developerEmail: 'phill@example.com',
        lastCommitAt: '2026-05-18T00:00:00Z',
      },
    ]);
    const [rows] = upsertMock.mock.calls[0];
    const expectedKeys = [
      'repo',
      'branch',
      'linear_issue_id',
      'developer_email',
      'last_seen_at',
    ].sort();
    expect(Object.keys(rows[0]).sort()).toEqual(expectedKeys);
  });
});
