// One full-screen window: toolbar plus the widget grid. A layout is saved only
// after a user action, never on the grid's own mount-time layout callback.
import { useCallback, useEffect, useState } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import type { LayoutItem, LayoutResponse, ScreenId } from '../shared/types.ts';
import { GRID_COLS, WIDGET_CATALOGUE } from '../shared/widget-catalogue.ts';
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

  const apply = useCallback((layout: LayoutResponse) => {
    setItems(layout.items);
    setNotice(
      layout.warning
        ? 'The saved layout file could not be read, so this is the default. It is kept aside on the next save.'
        : null,
    );
    setLoad('ready');
  }, []);

  const call = useCallback(
    async (method: string, body?: unknown): Promise<LayoutResponse | null> => {
      const res = await fetch(`/api/layouts/${screen}`, {
        method,
        ...(body === undefined
          ? {}
          : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      if (res.status === 401) {
        window.location.assign('/login');
        return null;
      }
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as LayoutResponse;
    },
    [screen],
  );

  useEffect(() => {
    let live = true;
    call('GET')
      .then((layout) => {
        if (live && layout) apply(layout);
      })
      .catch(() => {
        if (live) setLoad('failed');
      });
    return () => {
      live = false;
    };
  }, [apply, call]);

  const save = useCallback(
    (next: LayoutItem[]) => {
      setItems(next);
      call('PUT', { items: next })
        .then(() => setNotice(null))
        .catch(() => setNotice('This layout was not saved. It will be lost on reload.'));
    },
    [call],
  );

  const reset = () => {
    call('DELETE')
      .then((layout) => {
        if (layout) apply(layout);
      })
      .catch(() => setNotice('The reset did not save. Try again.'));
  };

  const add = (id: string) => {
    const spec = specFor(id);
    if (!spec) return;
    const bottom = items.reduce((max, box) => Math.max(max, box.y + box.h), 0);
    save([...items, { i: spec.id, x: 0, y: bottom, w: spec.w, h: spec.h }]);
  };

  const remove = (id: string) => save(items.filter((box) => box.i !== id));

  const available = WIDGET_CATALOGUE.filter((w) => !items.some((box) => box.i === w.id));
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
            <option value="">{available.length === 0 ? 'All on screen' : 'Choose'}</option>
            {available.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.button} onClick={reset}>
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
            dragConfig={{ enabled: true, handle: `.${styles.widgetHead}`, cancel: 'button' }}
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
