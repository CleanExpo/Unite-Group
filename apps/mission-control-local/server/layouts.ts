// Layouts live outside the repo, one JSON file per screen. Each save replaces only
// that screen's file atomically, so two screens can never overwrite each other, even
// from two server instances. A file that cannot be read is moved aside, never overwritten.
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type { LayoutItem, LayoutResponse, ScreenId } from '../shared/types.ts';
import { DEFAULT_LAYOUTS, parseLayoutItems } from '../shared/widget-catalogue.ts';

type ReadResult = { items: LayoutItem[] | null; unreadable: boolean };

export function createLayoutStore(dir: string) {
  let queue: Promise<unknown> = Promise.resolve();
  const fileFor = (screen: ScreenId) => join(dir, `screen-${screen}.json`);

  async function readSaved(screen: ScreenId): Promise<ReadResult> {
    let raw: string;
    try {
      raw = await readFile(fileFor(screen), 'utf8');
    } catch (err) {
      const missing = (err as NodeJS.ErrnoException).code === 'ENOENT';
      return { items: null, unreadable: !missing };
    }
    try {
      const parsed = JSON.parse(raw) as { version?: unknown; items?: unknown };
      const items = parsed.version === 1 ? parseLayoutItems(parsed.items) : null;
      return { items, unreadable: items === null };
    } catch {
      return { items: null, unreadable: true };
    }
  }

  async function moveAsideIfUnreadable(screen: ScreenId): Promise<void> {
    if ((await readSaved(screen)).unreadable) {
      const file = fileFor(screen);
      await rename(file, `${file}.unreadable-${Date.now()}`);
    }
  }

  async function write(screen: ScreenId, items: LayoutItem[]): Promise<void> {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const temp = `${fileFor(screen)}.${randomBytes(6).toString('hex')}.tmp`;
    const handle = await open(temp, 'wx', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify({ version: 1, items }, null, 2)}\n`);
      await handle.sync();
      await handle.close();
      await rename(temp, fileFor(screen));
    } catch (err) {
      await handle.close().catch(() => undefined);
      await rm(temp, { force: true });
      throw err;
    }
  }

  function serial<T>(job: () => Promise<T>): Promise<T> {
    const run = queue.then(job, job);
    queue = run.catch(() => undefined);
    return run;
  }

  function get(screen: ScreenId): Promise<LayoutResponse> {
    return serial(async () => {
      const { items, unreadable } = await readSaved(screen);
      const response: LayoutResponse = items
        ? { screen, items, source: 'saved' }
        : { screen, items: DEFAULT_LAYOUTS[screen].map((i) => ({ ...i })), source: 'default' };
      if (unreadable) response.warning = 'layout-file-unreadable';
      return response;
    });
  }

  function save(screen: ScreenId, items: LayoutItem[]): Promise<void> {
    return serial(async () => {
      await moveAsideIfUnreadable(screen);
      await write(screen, items);
    });
  }

  function reset(screen: ScreenId): Promise<void> {
    return serial(async () => {
      await moveAsideIfUnreadable(screen);
      await rm(fileFor(screen), { force: true });
    });
  }

  return { get, save, reset };
}

export type LayoutStore = ReturnType<typeof createLayoutStore>;
