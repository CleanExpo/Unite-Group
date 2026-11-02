// One full-screen window: toolbar plus the widget grid. A layout is saved only
// after a user action, never on the grid's own mount-time layout callback.
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import { createLayoutWriter } from '../shared/layout-writer.ts';
import type { Conflict, LayoutOp, SendResult } from '../shared/layout-writer.ts';
import type { LayoutConflict, LayoutItem, LayoutResponse, ScreenId } from '../shared/types.ts';
import { addableWidgets, GRID_COLS, WIDGET_CATALOGUE } from '../shared/widget-catalogue.ts';
import type { WidgetId } from '../shared/widget-catalogue.ts';
import { WIDGET_COMPONENTS } from './registry.tsx';
import { useFleet } from './useFleet.tsx';
import styles from './Screen.module.css';

type LoadState = 'loading' | 'ready' | 'failed';
type GridBox = Pick<LayoutItem, 'i' | 'x' | 'y' | 'w' | 'h'>;

const specFor = (id: string) => WIDGET_CATALOGUE.find((w) => w.id === id);

function plain(boxes: readonly GridBox[]): LayoutItem[] {
  return boxes.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));
}

function brokerLabel(fleet: ReturnType<typeof useFleet>): { text: string; bad: boolean } {
  if (fleet.kind === 'loading') return { text: 'Broker: checking', bad: false };
  if (fleet.kind === 'server-unreachable') return { text: 'Server down', bad: true };
  if (fleet.snapshot.status === 'down') return { text: 'Broker down', bad: true };
  if (fleet.snapshot.source === 'fixture') return { text: 'FIXTURE DATA', bad: true };
  return { text: 'Broker live', bad: false };
}

export function Screen({ screen }: { screen: ScreenId }) {
  const [items, setItems] = useState<LayoutItem[]>([]);
  const [load, setLoad] = useState<LoadState>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const { width, containerRef, mounted } = useContainerWidth();
  const fleet = useFleet();
  const broker = brokerLabel(fleet);

  const [conflict, setConflict] = useState<Conflict | null>(null);

  const apply = useCallback((layout: LayoutResponse) => {
    setItems(layout.items);
    setConflict(null);
    setNotice(
      layout.warning
        ? 'The saved layout file could not be read, so this is the default. That file is kept, not overwritten.'
        : null,
    );
    setLoad('ready');
  }, []);

  const signOut = () => window.location.assign('/login');

  const send = useCallback(
    async (op: LayoutOp, revision: number): Promise<SendResult> => {
      const res = await fetch(`/api/layouts/${screen}`, {
        method: op.kind === 'reset' ? 'DELETE' : 'PUT',
        headers: {
          'If-Match': `"${revision}"`,
          ...(op.kind === 'save' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(op.kind === 'save' ? { body: JSON.stringify({ items: op.items }) } : {}),
      });
      if (res.status === 401) return { status: 'signed-out' };
      if (res.status === 409) return { status: 'conflict', current: ((await res.json()) as LayoutConflict).current };
      if (!res.ok) throw new Error(String(res.status));
      return { status: 'ok', layout: (await res.json()) as LayoutResponse };
    },
    [screen],
  );

  // Saves and resets share one queue, so a reset cannot be overwritten by an older save.
  const writer = useMemo(
    () =>
      createLayoutWriter(send, {
        onLayout: apply,
        onConflict: setConflict,
        onFailed: () => setNotice('The last layout change was not saved. It will be lost on reload.'),
      }),
    [apply, send],
  );

  useEffect(() => {
    let live = true;
    fetch(`/api/layouts/${screen}`)
      .then(async (res) => {
        if (res.status === 401) return signOut();
        if (!res.ok) throw new Error(String(res.status));
        const layout = (await res.json()) as LayoutResponse;
        if (!live) return;
        writer.loaded(layout);
        apply(layout);
      })
      .catch(() => {
        if (live) setLoad('failed');
      });
    return () => {
      live = false;
    };
  }, [apply, screen, writer]);

  const save = (next: LayoutItem[]) => {
    setItems(next);
    writer.write({ kind: 'save', items: next });
  };

  const reset = () => writer.write({ kind: 'reset' });

  const add = (id: string) => {
    const spec = specFor(id);
    if (!spec) return;
    const bottom = items.reduce((max, box) => Math.max(max, box.y + box.h), 0);
    save([...items, { i: spec.id, x: 0, y: bottom, w: spec.w, h: spec.h }]);
  };

  const remove = (id: string) => save(items.filter((box) => box.i !== id));

  // While another window's change is waiting on a decision, nothing else can be edited.
  const loaded = load === 'ready' && conflict === null;
  const available = addableWidgets(loaded, items);
  const other = screen === '1' ? '2' : '1';
  const onStop = (layout: readonly GridBox[]) => save(plain(layout));

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <h1 className={styles.title}>Mission Control</h1>
        <span className={styles.screenId}>Screen {screen}</span>
        <span className={broker.bad ? styles.brokerBad : styles.brokerOk} role="status">
          {broker.text}
        </span>
        <span className={styles.spacer} />
        <label className={styles.addLabel}>
          <span>Add widget</span>
          <select
            value=""
            disabled={available.length === 0}
            onChange={(event) => add(event.target.value)}
          >
            <option value="">
              {conflict ? 'Reload or overwrite first' : !loaded ? 'Layout not loaded' : available.length === 0 ? 'All on screen' : 'Choose'}
            </option>
            {available.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.button} onClick={reset} disabled={!loaded}>
          Reset to default
        </button>
        <a className={styles.button} href={`/screen/${other}`}>
          Screen {other}
        </a>
        <form method="post" action="/logout">
          <button type="submit" className={styles.button}>
            Sign out
          </button>
        </form>
      </header>

      {notice ? (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      ) : null}
      {conflict ? (
        <div className={styles.notice} role="alertdialog" aria-label="Layout changed in another window">
          <p>
            This layout was changed in another window. Your last change is not saved yet. Reload to show
            the other window&apos;s layout, or overwrite it with yours.
          </p>
          <button type="button" className={styles.button} onClick={() => writer.reload()}>
            Reload
          </button>
          <button type="button" className={styles.button} onClick={() => writer.overwrite()}>
            Overwrite with mine
          </button>
        </div>
      ) : null}
      {load === 'failed' ? (
        <p className={styles.notice} role="alert">
          The layout could not be loaded. Reload the page to try again.
        </p>
      ) : null}
      {load === 'ready' && items.length === 0 ? (
        <p className={styles.empty}>No widgets on this screen. Add one, or reset to default.</p>
      ) : null}

      <main ref={containerRef} className={styles.grid}>
        {mounted && load === 'ready' ? (
          <ReactGridLayout
            width={width}
            layout={items.map((box) => {
              const spec = specFor(box.i);
              return { ...box, minW: spec?.minW, minH: spec?.minH };
            })}
            gridConfig={{ cols: GRID_COLS, rowHeight: 40, margin: [10, 10] }}
            dragConfig={{ enabled: loaded, handle: `.${styles.widgetHead}`, cancel: 'button' }}
            resizeConfig={{ enabled: loaded }}
            onDragStop={onStop}
            onResizeStop={onStop}
          >
            {items.map((box) => {
              const spec = specFor(box.i);
              if (!spec) return null;
              const Body = WIDGET_COMPONENTS[spec.id as WidgetId];
              return (
                <section key={box.i} className={styles.widget} aria-label={spec.title}>
                  <header className={styles.widgetHead}>
                    <h2>{spec.title}</h2>
                    <button
                      type="button"
                      className={styles.remove}
                      disabled={!loaded}
                      aria-label={`Remove ${spec.title}`}
                      onClick={() => remove(box.i)}
                    >
                      Remove
                    </button>
                  </header>
                  <div className={styles.widgetBody}>
                    <Body />
                  </div>
                </section>
              );
            })}
          </ReactGridLayout>
        ) : null}
      </main>
    </div>
  );
}
