// Layouts live outside the repo. Every save or reset of a screen writes a NEW file,
// screen-<id>.r<revision>.json, and the highest revision is the current layout.
//
// A write names the revision it was based on. The new file is published with link(),
// which fails if that file already exists, so of two writers based on the same
// revision exactly one wins and the other is told the layout changed. This holds
// across windows and across server instances sharing the folder, with no lock file.
// A file is complete before it is published (temp file, fsync, link), so a reader
// never sees half a layout. A file that cannot be read is never overwritten.
import { link, mkdir, open, readdir, readFile, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type { LayoutItem, LayoutResponse, ScreenId } from '../shared/types.ts';
import { DEFAULT_LAYOUTS, parseLayoutItems } from '../shared/widget-catalogue.ts';

/** Older revisions kept on disk after each write. The current one is never removed. */
export const KEEP_REVISIONS = 10;

export type WriteResult = { ok: true; layout: LayoutResponse } | { ok: false; current: LayoutResponse };

type Saved = { kind: 'items'; items: LayoutItem[] } | { kind: 'reset' } | { kind: 'unreadable' };

const REVISION_FILE = /^screen-([12])\.r(\d{1,15})\.json$/;

export function createLayoutStore(dir: string) {
  const queues = new Map<ScreenId, Promise<unknown>>();
  const fileFor = (screen: ScreenId, revision: number) => join(dir, `screen-${screen}.r${revision}.json`);

  async function revisions(screen: ScreenId): Promise<number[]> {
    let names: string[];
    try {
      names = await readdir(dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err; // A folder that cannot be listed is a failed read, never "no layout".
    }
    const found: number[] = [];
    for (const name of names) {
      const match = REVISION_FILE.exec(name);
      if (match && match[1] === screen) found.push(Number(match[2]));
    }
    return found.sort((a, b) => a - b);
  }

  async function readRevision(screen: ScreenId, revision: number): Promise<Saved | 'gone'> {
    let raw: string;
    try {
      raw = await readFile(fileFor(screen, revision), 'utf8');
    } catch (err) {
      return (err as NodeJS.ErrnoException).code === 'ENOENT' ? 'gone' : { kind: 'unreadable' };
    }
    try {
      const parsed = JSON.parse(raw) as { version?: unknown; items?: unknown; reset?: unknown };
      if (parsed.version !== 1) return { kind: 'unreadable' };
      if (parsed.reset === true) return { kind: 'reset' };
      const items = parseLayoutItems(parsed.items);
      return items ? { kind: 'items', items } : { kind: 'unreadable' };
    } catch {
      return { kind: 'unreadable' };
    }
  }

  async function current(screen: ScreenId): Promise<LayoutResponse> {
    // A file can only vanish under us if another instance pruned it after writing newer
    // ones, so listing again finds the newer revision.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const all = await revisions(screen);
      const revision = all.at(-1) ?? 0;
      const saved: Saved | 'gone' = revision === 0 ? { kind: 'reset' } : await readRevision(screen, revision);
      if (saved === 'gone') continue;
      if (saved.kind === 'items') return { screen, revision, items: saved.items, source: 'saved' };
      const response: LayoutResponse = {
        screen,
        revision,
        items: DEFAULT_LAYOUTS[screen].map((i) => ({ ...i })),
        source: 'default',
      };
      if (saved.kind === 'unreadable') response.warning = 'layout-file-unreadable';
      return response;
    }
    throw new Error('layout revisions kept changing while being read');
  }

  async function publish(screen: ScreenId, revision: number, body: object): Promise<boolean> {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const temp = join(dir, `.screen-${screen}.${randomBytes(6).toString('hex')}.tmp`);
    const handle = await open(temp, 'wx', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify({ version: 1, ...body }, null, 2)}\n`);
      await handle.sync();
      await handle.close();
      await link(temp, fileFor(screen, revision));
      return true;
    } catch (err) {
      await handle.close().catch(() => undefined);
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw err;
    } finally {
      await rm(temp, { force: true });
    }
  }

  /** Removes old revisions. An unreadable one is renamed aside, never deleted. */
  async function prune(screen: ScreenId, latest: number): Promise<void> {
    for (const revision of await revisions(screen)) {
      if (revision > latest - KEEP_REVISIONS) break;
      const file = fileFor(screen, revision);
      const saved = await readRevision(screen, revision);
      if (saved === 'gone') continue;
      if (saved.kind === 'unreadable') await rename(file, `${file}.unreadable-${Date.now()}`).catch(() => undefined);
      else await rm(file, { force: true });
    }
  }

  async function write(screen: ScreenId, expected: number, body: object): Promise<WriteResult> {
    const before = await current(screen);
    if (before.revision !== expected) return { ok: false, current: before };
    const next = expected + 1;
    if (!(await publish(screen, next, body))) return { ok: false, current: await current(screen) };
    // Our file exists, but if another instance pruned that number after writing newer
    // revisions, it landed below them and will never be read. Report the conflict
    // rather than a save that silently does not count.
    const after = await current(screen);
    if (after.revision !== next) return { ok: false, current: after };
    await prune(screen, next).catch(() => undefined);
    return { ok: true, layout: after };
  }

  // One queue per screen: writes to one screen wait for each other, not for the other screen.
  function serial<T>(screen: ScreenId, job: () => Promise<T>): Promise<T> {
    const run = (queues.get(screen) ?? Promise.resolve()).then(job, job);
    queues.set(screen, run.catch(() => undefined));
    return run;
  }

  return {
    get: (screen: ScreenId) => serial(screen, () => current(screen)),
    save: (screen: ScreenId, items: LayoutItem[], expected: number) =>
      serial(screen, () => write(screen, expected, { items })),
    reset: (screen: ScreenId, expected: number) => serial(screen, () => write(screen, expected, { reset: true })),
  };
}

export type LayoutStore = ReturnType<typeof createLayoutStore>;
