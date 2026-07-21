// Read-only inventory for legacy autonomous-labelled Linear projections.
// The executor is permanently retired, so this module cannot report healthy,
// stale, next-claimable, or live-enabled states.

import { isBlocked, type ClaimCandidate } from "./linear-claim";

export type QueueHealthState = "unconfigured" | "retired";

export interface QueueConfigReadiness {
  linearKeyPresent: boolean;
  teamConfigured: boolean;
  projectConfigured: boolean;
  inventoryConfigured: boolean;
}

export interface QueueHealthReport {
  state: QueueHealthState;
  summary: string;
  authority: "crm-ownest";
  executionEnabled: false;
  config: QueueConfigReadiness;
  legacyLabelledProjectionCount: number;
  blockedProjectionCount: number;
}

/** Build presence-only inventory flags; secret values never enter the result. */
export function buildConfigReadiness(env: {
  linearKey?: string | null;
  teamKey?: string | null;
  projectName?: string | null;
}): QueueConfigReadiness {
  const linearKeyPresent = Boolean(env.linearKey?.trim());
  const teamConfigured = Boolean(env.teamKey?.trim());
  const projectConfigured = Boolean(env.projectName?.trim());
  return {
    linearKeyPresent,
    teamConfigured,
    projectConfigured,
    inventoryConfigured:
      linearKeyPresent && teamConfigured && projectConfigured,
  };
}

export function computeQueueHealth(input: {
  config: QueueConfigReadiness;
  candidates: ClaimCandidate[];
}): QueueHealthReport {
  const state: QueueHealthState = input.config.inventoryConfigured
    ? "retired"
    : "unconfigured";
  const blockedProjectionCount = input.candidates.filter(isBlocked).length;
  return {
    state,
    summary:
      state === "retired"
        ? `Legacy Linear executor retired; ${input.candidates.length} labelled projection(s) remain for inventory only.`
        : "Legacy Linear executor retired; Linear inventory is not configured.",
    authority: "crm-ownest",
    executionEnabled: false,
    config: input.config,
    legacyLabelledProjectionCount: input.candidates.length,
    blockedProjectionCount,
  };
}
