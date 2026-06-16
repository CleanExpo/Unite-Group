import { NextResponse } from "next/server";
import { timingSafeBearerMatch } from "@/lib/security/safe-compare";
import {
  seedRow,
  markRunning,
  markCompleted,
  markErrored,
} from "@/lib/runtime/sync-state-repo";
import type {
  SyncResult,
  SyncStatus,
  SyncLifecycleConfig,
} from "@/lib/runtime/types";

export function withSyncLifecycle<F = Record<string, unknown>>(
  cfg: SyncLifecycleConfig<F>,
  sync: () => Promise<SyncResult<F>>,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    const auth = req.headers.get("authorization");
    if (!timingSafeBearerMatch(auth, process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await seedRow(cfg.integration);
    await markRunning(cfg.integration);

    try {
      const result = await sync();
      const hasFailures = result.failed.length > 0;
      const status: SyncStatus = hasFailures
        ? cfg.partialIfFailed === false
          ? "error"
          : "partial"
        : "ok";
      const errorString = hasFailures
        ? result.failed.map(cfg.formatFailure).join("; ")
        : null;
      const nextDueAt = new Date(Date.now() + cfg.cadenceMs);
      await markCompleted(cfg.integration, result, status, nextDueAt, errorString);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      await markErrored(cfg.integration, err);
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  };
}
