// Widget ids and grid sizes, shared by the server (layout validation, defaults)
// and the browser (registry). Later phases add a row here and a component in
// src/registry.tsx. The type-check fails if the two disagree.
import type { LayoutItem, ScreenId } from './types.ts';

export interface WidgetSpec {
  id: string;
  title: string;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

export const GRID_COLS = 12;
export const MAX_GRID_ROWS = 200;

export const WIDGET_CATALOGUE = [
  { id: 'machine-mac-mini', title: 'Mac Mini', w: 4, h: 7, minW: 3, minH: 4 },
  { id: 'machine-macbook-pro', title: 'MacBook Pro', w: 4, h: 7, minW: 3, minH: 4 },
  { id: 'machine-windows-pc', title: 'Windows PC', w: 4, h: 7, minW: 3, minH: 4 },
  { id: 'job-queue', title: 'Job queue', w: 12, h: 8, minW: 4, minH: 4 },
  { id: 'clock', title: 'Clock', w: 4, h: 3, minW: 2, minH: 2 },
] as const satisfies readonly WidgetSpec[];

export type WidgetId = (typeof WIDGET_CATALOGUE)[number]['id'];

export const WIDGET_IDS: ReadonlySet<string> = new Set(WIDGET_CATALOGUE.map((w) => w.id));

export const DEFAULT_LAYOUTS: Record<ScreenId, readonly LayoutItem[]> = {
  '1': [
    { i: 'machine-mac-mini', x: 0, y: 0, w: 4, h: 7 },
    { i: 'machine-macbook-pro', x: 4, y: 0, w: 4, h: 7 },
    { i: 'machine-windows-pc', x: 8, y: 0, w: 4, h: 7 },
    { i: 'job-queue', x: 0, y: 7, w: 12, h: 8 },
  ],
  '2': [
    { i: 'clock', x: 0, y: 0, w: 4, h: 3 },
    { i: 'job-queue', x: 4, y: 0, w: 8, h: 12 },
  ],
};

/** Returns the valid layout, or null. Rejects unknown widgets, duplicates and off-grid boxes. */
export function parseLayoutItems(value: unknown): LayoutItem[] | null {
  if (!Array.isArray(value) || value.length > WIDGET_CATALOGUE.length) return null;
  const seen = new Set<string>();
  const items: LayoutItem[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return null;
    const { i, x, y, w, h } = raw as Record<string, unknown>;
    if (typeof i !== 'string' || !WIDGET_IDS.has(i) || seen.has(i)) return null;
    if (![x, y, w, h].every(Number.isSafeInteger)) return null;
    const box = { i, x, y, w, h } as LayoutItem;
    if (box.x < 0 || box.y < 0 || box.w < 1 || box.h < 1) return null;
    if (box.x + box.w > GRID_COLS || box.y + box.h > MAX_GRID_ROWS) return null;
    seen.add(i);
    items.push(box);
  }
  return items;
}
