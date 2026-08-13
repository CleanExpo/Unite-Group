"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { BusinessFilter } from "./BusinessFilter";
import { IssueDetailPanel } from "./IssueDetailPanel";
import { CreateIssueModal } from "./CreateIssueModal";
import { StaleReadNotice } from "@/components/ui/StaleReadNotice";

interface Card {
  id: string;
  title: string;
  businessKey: string;
  businessColor: string;
  teamKey: string;
  stateId: string;
}

interface Column {
  id: string;
  title: string;
  cards: Card[];
}

const COLUMN_TITLES: Record<string, string> = {
  today: "TODAY",
  hot: "HOT",
  pipeline: "PIPELINE",
  someday: "SOMEDAY",
  done: "DONE",
};

const COLUMN_ORDER = ["today", "hot", "pipeline", "someday", "done"];

export function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [stateMap, setStateMap] = useState<
    Record<string, Record<string, string>>
  >({});
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  // ONE state describing what is on screen and where it came from, replacing
  // three interacting booleans (`stale`, `hasLoadedOnce`, `configured`).
  //
  // Four consecutive review rounds found defects in the boolean version, each a
  // different path through the same state space, each fixed by adding another
  // condition:
  //   - an empty board that HAD been read could not be marked      (needed hasLoadedOnce)
  //   - an unconfigured 200 counted as a read                       (needed a columns check)
  //   - configured -> unconfigured -> failed poll still latched     (needed a clear)
  // Three booleans give eight states, most of which are unreachable and two of
  // which are lies. The bug was never any one condition; it was modelling "what
  // is displayed" as flags that each fix had to keep in agreement by hand.
  //
  // `boardSource` says it directly:
  //   'none'         nothing has ever been read — no board, nothing to retain
  //   'read'         a real payload is displayed — the only state that can go stale
  //   'unconfigured' Linear answered successfully with no board at all
  // A failed poll can only make a 'read' board stale, and an unconfigured
  // response OVERWRITES 'read', which is precisely the transition the fourth
  // round caught. [UNI-2493]
  type BoardSource = "none" | "read" | "unconfigured";
  const [boardSource, setBoardSource] = useState<BoardSource>("none");
  const configured = boardSource !== "unconfigured";
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [businessFilter, setBusinessFilter] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [applyingColumn, setApplyingColumn] = useState<string | null>(null);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const loadIssues = useCallback(async () => {
    try {
      const res = await fetch("/api/linear/issues");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as {
        // Optional on purpose: an unconfigured Linear omits `columns` rather
        // than sending empty ones, so absence cannot be read as "no issues".
        // The `!configured` banner below is what the founder sees in that case.
        columns?: Record<string, Card[]>;
        stateMap: Record<string, Record<string, string>>;
        configured?: boolean;
      };
      // Assigned, never accumulated: every successful read REPLACES what is on
      // screen, so the source of the displayed board is whatever this response
      // was. The boolean version only ever set flags true, which is why an
      // unconfigured response could not undo an earlier successful read.
      const hasBoard = data.configured !== false && Boolean(data.columns);
      setBoardSource(hasBoard ? "read" : "unconfigured");
      setStateMap(data.stateMap);
      setColumns(
        COLUMN_ORDER.map((id) => ({
          id,
          title: COLUMN_TITLES[id],
          cards: data.columns?.[id] ?? [],
        })),
      );
      setStale(false);
      setLastSynced(new Date());
    } catch {
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues();
    // Poll every 60s for inbound Linear changes
    const interval = setInterval(loadIssues, 60_000);
    return () => clearInterval(interval);
  }, [loadIssues]);

  // Generate CRM proposals only. The route creates no Hermes or Linear work.
  async function handleApply(columnId: string) {
    setApplyingColumn(columnId);
    setApplyStatus(null);
    try {
      const col = columns.find((c) => c.id === columnId);
      const existingTitles = (col?.cards ?? []).map((c) => c.title);
      const res = await fetch("/api/kanban/generate-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: columnId, existingTitles }),
      });
      const data = (await res.json()) as {
        createdCount?: number;
        skippedExistingCount?: number;
        failedCount?: number;
        partial?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "generation failed");
      const n = data.createdCount ?? 0;
      const reused = data.skippedExistingCount ?? 0;
      const failed = data.failedCount ?? 0;
      setApplyStatus(
        `Created ${n} CRM proposal${n === 1 ? "" : "s"} for review${reused ? `; reused ${reused}` : ""}${failed ? `; ${failed} failed` : ""} — nothing was queued or sent to Hermes or Linear.`,
      );
    } catch (err) {
      setApplyStatus(
        `Propose failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      setApplyingColumn(null);
    }
  }

  function findColumnByCardId(cardId: string): string | undefined {
    return columns.find((col) => col.cards.some((c) => c.id === cardId))?.id;
  }

  // Cached data retained across a failed read. Only a board that was actually
  // READ can be stale: 'unconfigured' has no payload to retain and 'none' never
  // had one, so neither can be marked.
  //
  // An earlier version required at least one retained CARD, on the reasoning
  // that with no cards nothing is presented as current. That was this branch's
  // own thesis inverted — a board whose last SUCCESSFUL read found nothing is
  // presenting "no issues" as a fact, and after a failed reload that fact is no
  // longer confirmed. An empty board is a claim. [UNI-2501]
  const staleRead = stale && boardSource === "read";

  // An unconfigured Linear omits `columns` entirely rather than sending empty
  // ones, and line ~91 coerces that absence into five empty columns. The
  // not-connected banner appears, but the board beneath it looked like a
  // successfully-read empty backlog with every action live — the same false-empty
  // class this branch exists to remove, surviving at the CONSUMER after the route
  // stopped lying. Found by the release round at 2d209caa.
  //
  // Kept separate from `staleRead`, which means "a payload was read and is being
  // retained". Nothing was ever read here, so there is no retained data to mark
  // as stale; what is required is that nothing ACTS on a board that does not
  // exist. Both conditions gate the actions; only `staleRead` marks a region.
  const unreadableBoard = staleRead || !configured;

  function handleDragStart(event: DragStartEvent) {
    const card = columns
      .flatMap((c) => c.cards)
      .find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);

    // A failed reload keeps the cached cards on screen — deliberate, and the
    // banner above says so. What was missing is the INERT half: dragging a
    // retained card still PATCHed /api/linear/issues with a stateMap from a
    // read that has since failed, moving an issue in Linear on the strength of
    // stale state. Nothing acts on the retained board until a read succeeds;
    // the Retry in the banner above stays live as the way back. [UNI-2494]
    // Gated on `staleRead` only, deliberately. Widening this to an
    // unconfigured board is untestable: that board has no cards, so
    // findColumnByCardId returns undefined and the handler exits before any
    // gate is reached. A mutation control proved the widened form could not
    // fail, and an uncontrolled line is what this audit keeps finding.
    if (staleRead) return;

    if (!over) return;

    const activeColId = findColumnByCardId(String(active.id));
    const overColId = columns.find((col) => col.id === over.id)
      ? String(over.id)
      : findColumnByCardId(String(over.id));

    if (!activeColId || !overColId) return;

    // Optimistic local update
    if (activeColId !== overColId) {
      setColumns((cols) => {
        const activeCol = cols.find((c) => c.id === activeColId)!;
        const overCol = cols.find((c) => c.id === overColId)!;
        const card = activeCol.cards.find((c) => c.id === active.id)!;
        const overIndex = overCol.cards.findIndex((c) => c.id === over.id);
        const insertAt = overIndex === -1 ? overCol.cards.length : overIndex;
        return cols.map((col) => {
          if (col.id === activeColId)
            return {
              ...col,
              cards: col.cards.filter((c) => c.id !== active.id),
            };
          if (col.id === overColId) {
            const newCards = [...overCol.cards];
            newCards.splice(insertAt, 0, card);
            return { ...col, cards: newCards };
          }
          return col;
        });
      });

      // Sync to Linear
      const card = columns
        .flatMap((c) => c.cards)
        .find((c) => c.id === String(active.id));
      if (card) {
        try {
          const res = await fetch("/api/linear/issues", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              issueId: card.id,
              columnId: overColId,
              teamKey: card.teamKey,
              stateMap,
            }),
          });
          // A non-OK Response does NOT throw, so without this only network
          // failures were caught and every rejected write was rendered as a
          // completed move. This branch is what made that reachable: UNI-2493
          // and UNI-2495 taught PATCH to answer 503 when Linear is
          // unconfigured and 502 on an update error, replacing a silent 200.
          // The route stopped lying and the only consumer kept believing it.
          if (!res.ok) throw new Error(`PATCH /api/linear/issues ${res.status}`);
        } catch {
          // Revert by re-reading: the optimistic move is discarded and the
          // board shows whatever Linear actually holds. If that read fails too
          // the board marks itself stale, which is the honest end state.
          await loadIssues();
        }
      }
    } else {
      // Same-column reorder (local only)
      setColumns((cols) =>
        cols.map((col) => {
          if (col.id !== activeColId) return col;
          const oldIndex = col.cards.findIndex((c) => c.id === active.id);
          const newIndex = col.cards.findIndex((c) => c.id === over.id);
          return { ...col, cards: arrayMove(col.cards, oldIndex, newIndex) };
        }),
      );
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 h-full">
        {COLUMN_ORDER.map((id) => (
          <div
            key={id}
            className="w-64 shrink-0 rounded-sm animate-pulse"
            style={{ background: "var(--surface-card)", height: 200 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {!configured && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[12px]"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-sm"
            style={{ background: "var(--color-border)" }}
          />
          Demo — connect Linear via Settings to see live issues
        </div>
      )}
      {stale && configured && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[12px]"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.30)",
            color: "#f59e0b",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-sm bg-[#f59e0b] animate-pulse" />
          {/* "showing cached data" is only true if there IS cached data. On a
              first read that never landed the board is empty because nothing
              was read, and claiming a cache is the same false-empty this branch
              exists to remove — one banner away from the defect it reports. */}
          {boardSource === "read"
            ? "Linear unreachable — showing cached data"
            : "Linear unreachable — the board could not be read"}
          <button
            onClick={loadIssues}
            className="ml-auto underline opacity-70 hover:opacity-100"
          >
            Retry
          </button>
        </div>
      )}
      {lastSynced && !stale && configured && (
        <div className="flex items-center justify-between">
          <p
            className="text-[11px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            Synced with Linear — {lastSynced.toLocaleTimeString("en-AU")}
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="text-[11px] font-medium px-3 py-1 rounded-sm transition-opacity hover:opacity-80"
            style={{ background: "#16a34a", color: "#fffdf7" }}
          >
            + New Issue
          </button>
        </div>
      )}
      {applyStatus && (
        <div
          className="px-3 py-1.5 rounded-sm text-[12px]"
          style={{
            background: applyStatus.startsWith("Propose failed")
              ? "rgba(239,68,68,0.08)"
              : "var(--color-accent-dim)",
            border: `1px solid ${applyStatus.startsWith("Propose failed") ? "rgba(239,68,68,0.3)" : "var(--color-accent-border)"}`,
            color: applyStatus.startsWith("Propose failed")
              ? "var(--color-danger)"
              : "var(--color-accent-text)",
          }}
        >
          {applyStatus}
        </div>
      )}
      <BusinessFilter
        activeFilter={businessFilter}
        onFilterChange={setBusinessFilter}
      />
      {/* The banner above carries the recovery affordance and stays as it is.
          This adds the machine-readable half of the contract — the marker no
          census could find, and the explicit promise that the retained board
          is inert until a read succeeds. [UNI-2494] */}
      {staleRead && <StaleReadNotice source="Linear board" actionsDisabled />}
      {/* An unconfigured Linear is not an empty board, and taking its ACTIONS
          offline was only half the fix. The route omits `columns` on purpose, but
          `data.columns?.[id] ?? []` turned that absence into five columns each
          rendering `{cards.length}` — a visible 0 per column. "0 issues in TODAY"
          is a claim, and it was being made about a board that was never read.
          The connection banner above said otherwise two lines up.

          So the grid is withheld entirely, not merely disabled. A genuinely empty
          CONFIGURED board still renders its zeros, because that zero is a fact.
          Found by the round at e8118ed7, pressing the same point a round earlier
          had raised about actionability. [UNI-2493] */}
      {!configured ? (
        <div
          className="flex items-center justify-center rounded-sm border p-8 text-[12px]"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-muted)",
            background: "var(--surface-card)",
          }}
        >
          No Linear board to show — the integration is not connected, so the
          backlog was never read.
        </div>
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full" data-stale-read={staleRead ? "true" : undefined}>
          {columns.map((col) => {
            const filteredCards = businessFilter
              ? col.cards.filter((c) => c.businessKey === businessFilter)
              : col.cards;
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                cards={filteredCards}
                isDone={col.id === "done"}
                // Opening a retained card mounts IssueDetailPanel and GETs
                // /api/linear/issues/{id} for an id the latest read could not
                // confirm — an act on a retained record, inside the marked
                // region, and invisible to the census detector because a card
                // is not a <button>. Withheld rather than disabled: there is no
                // affordance to keep visible, and the Retry in the banner is
                // still the way back. [UNI-2502]
                onCardClick={unreadableBoard ? undefined : setSelectedIssueId}
                onPropose={
                  col.id !== "done" ? () => handleApply(col.id) : undefined
                }
                applying={applyingColumn === col.id}
                // Propose builds `existingTitles` from the retained cards and
                // POSTs /api/kanban/generate-next, so on a stale board it would
                // generate work from a list the latest read could not confirm.
                // Disabled rather than hidden, so the affordance and its reason
                // stay visible. [UNI-2495]
                proposeDisabled={unreadableBoard}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeCard ? (
            <KanbanCard
              id={activeCard.id}
              title={activeCard.title}
              businessKey={activeCard.businessKey}
              businessColor={activeCard.businessColor}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      )}
      <CreateIssueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadIssues();
        }}
      />
      {selectedIssueId && (
        <IssueDetailPanel
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  );
}
