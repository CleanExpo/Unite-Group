export type SyncStatus = "ok" | "partial" | "error";

export type SyncResult<F = Record<string, unknown>> = {
  rowsUpserted: number;
  succeeded: string[];
  failed: F[];
};

export type SyncLifecycleConfig<F = Record<string, unknown>> = {
  integration: string;
  cadenceMs: number;
  partialIfFailed?: boolean;
  formatFailure: (f: F) => string;
};
