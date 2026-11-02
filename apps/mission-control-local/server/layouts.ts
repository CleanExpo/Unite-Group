// Per-screen layouts in one local JSON file outside the repo. Writes are serialised
// and atomic. A file that cannot be read is moved aside, never overwritten.
import { chmod, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';
import { SCREENS } from '../shared/types.ts';
import type { LayoutItem, LayoutResponse, ScreenId } from '../shared/types.ts';
import { DEFAULT_LAYOUTS, parseLayoutItems } from '../shared/widget-catalogue.ts';

type Saved = Partial<Record<ScreenId, LayoutItem[]>>;
type ReadResult = { saved: Saved; unreadable: boolean };

export function createLayoutStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();

  async function readSaved(): Promise<ReadResult> {
    let raw: string;
    try {
      raw = await readFile(file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { saved: {}, unreadable: false };
      return { saved: {}, unreadable: true };
    }
    try {
      const parsed = JSON.parse(raw) as { version?: unknown; screens?: Record<string, unknown> };
      if (parsed.version !== 1 || typeof parsed.screens !== 'object' || parsed.screens === null) {
        return { saved: {}, unreadable: true };
      }
      const saved: Saved = {};
      let unreadable = false;
      for (const screen of SCREENS) {
        if (!(screen in parsed.screens)) continue;
        const items = parseLayoutItems(parsed.screens[screen]);
        if (items) saved[screen] = items;
        else unreadable = true;
      }
      return { saved, unreadable };
    } catch {
      return { saved: {}, unreadable: true };
    }
  }

  async function writeSaved(saved: Saved, previous: ReadResult): Promise<void> {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    if (previous.unreadable) await rename(file, `${file}.unreadable-${Date.now()}`);
    const temp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
    const handle = await open(temp, 'wx', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify({ version: 1, screens: saved }, null, 2)}\n`);
      await handle.sync();
    } catch (err) {
      await handle.close();
      await rm(temp, { force: true });
      throw err;
    }
    await handle.close();
    await rename(temp, file);
    await chmod(file, 0o600);
  }

  function serial<T>(job: () => Promise<T>): Promise<T> {
    const run = queue.then(job, job);
    queue = run.catch(() => undefined);
    return run;
  }

  function get(screen: ScreenId): Promise<LayoutResponse> {
    return serial(async () => {
      const { saved, unreadable } = await readSaved();
      const items = saved[screen];
      const response: LayoutResponse = items
        ? { screen, items, source: 'saved' }
        : { screen, items: DEFAULT_LAYOUTS[screen].map((i) => ({ ...i })), source: 'default' };
      if (unreadable) response.warning = 'layout-file-unreadable';
      return response;
    });
  }

  function save(screen: ScreenId, items: LayoutItem[]): Promise<void> {
    return serial(async () => {
      const previous = await readSaved();
      await writeSaved({ ...previous.saved, [screen]: items }, previous);
    });
  }

  function reset(screen: ScreenId): Promise<void> {
    return serial(async () => {
      const previous = await readSaved();
      const { [screen]: _dropped, ...rest } = previous.saved;
      await writeSaved(rest, previous);
    });
  }

  return { get, save, reset };
}

export type LayoutStore = ReturnType<typeof createLayoutStore>;
