// src/lib/command-centre/work-packet.ts
//
// UNI-2147 — Mission Control work-generator: the execution-packet contract.
//
// A WorkPacket binds outcome → project → agent owner → routing → projection → approval
// → evidence, so a plain business request becomes a durable, routable unit of work.
// This module is the typed contract + builder + guarded status machine + the
// mapping to a read-only Linear projection plan.
//
// SAFETY: pure + dependency-free. This module has no Linear create dependency or
// live option. CRM persistence happens in authenticated routes; Linear output is
// descriptive planning data only.

import {
  BUSINESS_TO_TEAM,
  type CreateIssueInput,
} from "@/lib/integrations/linear";

export type PacketStatus =
  | "draft"
  | "routed"
  | "running"
  | "blocked"
  | "awaiting_approval"
  | "completed";
export type NextActionOwner =
  "hermes" | "pi-ceo" | "senior_agent" | "phill" | "external_provider";
export type WorkLane =
  "deep_reasoning" | "coding" | "video_media" | "fast_drafting" | "ops";
export type RiskLevel = "low" | "medium" | "high";

/** Projection provenance only; never an execution opt-in. */
export const PACKET_LABELS = ["source:crm-work-packet"] as const;

export interface WorkPacketRequest {
  /** Plain-language requested outcome. */
  outcome: string;
  /** Portfolio/business key (synthex, dr, ccw, …) — routes the Linear team. */
  projectKey?: string;
  clientId?: string | null;
  lane?: WorkLane;
  riskLevel?: RiskLevel;
  /** Whether the work performs a CRM / production write (forces approval). */
  touchesCrmWrite?: boolean;
}

export type ParseWorkPacketRequestResult =
  | { ok: true; value: WorkPacketRequest }
  | { ok: false; error: string };

const WORK_LANES = new Set<WorkLane>([
  "deep_reasoning",
  "coding",
  "video_media",
  "fast_drafting",
  "ops",
]);
const RISK_LEVELS = new Set<RiskLevel>(["low", "medium", "high"]);
const WORK_PACKET_REQUEST_KEYS = new Set([
  "outcome",
  "projectKey",
  "clientId",
  "lane",
  "riskLevel",
  "touchesCrmWrite",
]);

/** Runtime parser for the untrusted API boundary. */
export function parseWorkPacketRequest(
  input: unknown,
): ParseWorkPacketRequestResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid_body" };
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !WORK_PACKET_REQUEST_KEYS.has(key))) {
    return { ok: false, error: "unknown_field" };
  }
  if (typeof body.outcome !== "string" || body.outcome.trim().length === 0) {
    return { ok: false, error: "outcome_required" };
  }
  const outcome = body.outcome.trim();
  if (outcome.length > 2_000) {
    return { ok: false, error: "outcome_too_long" };
  }

  const value: WorkPacketRequest = { outcome };
  if (body.projectKey !== undefined) {
    if (typeof body.projectKey !== "string") {
      return { ok: false, error: "invalid_project_key" };
    }
    const projectKey = body.projectKey.trim().toLowerCase();
    if (
      projectKey.length === 0 ||
      projectKey.length > 80 ||
      !/^[a-z0-9][a-z0-9_-]*$/.test(projectKey)
    ) {
      return { ok: false, error: "invalid_project_key" };
    }
    value.projectKey = projectKey;
  }
  if (body.clientId !== undefined) {
    if (body.clientId === null) value.clientId = null;
    else if (
      typeof body.clientId === "string" &&
      body.clientId.trim().length > 0 &&
      body.clientId.trim().length <= 128
    ) {
      value.clientId = body.clientId.trim();
    } else return { ok: false, error: "invalid_client_id" };
  }
  if (body.lane !== undefined) {
    if (typeof body.lane !== "string" || !WORK_LANES.has(body.lane as WorkLane)) {
      return { ok: false, error: "invalid_lane" };
    }
    value.lane = body.lane as WorkLane;
  }
  if (body.riskLevel !== undefined) {
    if (
      typeof body.riskLevel !== "string" ||
      !RISK_LEVELS.has(body.riskLevel as RiskLevel)
    ) {
      return { ok: false, error: "invalid_risk_level" };
    }
    value.riskLevel = body.riskLevel as RiskLevel;
  }
  if (body.touchesCrmWrite !== undefined) {
    if (typeof body.touchesCrmWrite !== "boolean") {
      return { ok: false, error: "invalid_touches_crm_write" };
    }
    value.touchesCrmWrite = body.touchesCrmWrite;
  }
  return { ok: true, value };
}

export interface WorkPacket {
  id: string;
  outcome: string;
  projectKey: string;
  clientId: string | null;
  lane: WorkLane;
  riskLevel: RiskLevel;
  status: PacketStatus;
  nextActionOwner: NextActionOwner;
  approvalRequired: boolean;
  approvedBy: string | null;
  labels: string[];
  linearIssueId: string | null;
  evidencePath: string | null;
  createdAt: string;
}

function slug(outcome: string): string {
  return (
    outcome
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "packet"
  );
}

/** Who owns the next action for a freshly-built packet. */
export function routeOwner(
  lane: WorkLane,
  approvalRequired: boolean,
): NextActionOwner {
  if (approvalRequired) return "phill"; // approval gate → Phill owns the next move
  switch (lane) {
    case "deep_reasoning":
      return "pi-ceo";
    case "coding":
      return "senior_agent";
    case "video_media":
    case "fast_drafting":
      return "external_provider";
    case "ops":
      return "hermes";
  }
}

export interface BuildWorkPacketOptions {
  now: string;
  idPrefix?: string;
}

export function buildWorkPacket(
  request: WorkPacketRequest,
  opts: BuildWorkPacketOptions,
): WorkPacket {
  const lane: WorkLane = request.lane ?? "ops";
  const riskLevel: RiskLevel = request.riskLevel ?? "low";
  const approvalRequired =
    request.touchesCrmWrite === true || riskLevel === "high";
  const projectKey =
    (request.projectKey ?? "").trim().toLowerCase() || "unite-group";
  return {
    id: `${opts.idPrefix ?? "wp"}-${slug(request.outcome)}-${opts.now}`,
    outcome: request.outcome,
    projectKey,
    clientId: request.clientId ?? null,
    lane,
    riskLevel,
    status: "draft",
    nextActionOwner: routeOwner(lane, approvalRequired),
    approvalRequired,
    approvedBy: null,
    labels: [...PACKET_LABELS],
    linearIssueId: null,
    evidencePath: null,
    createdAt: opts.now,
  };
}

// ─── Guarded status machine ──────────────────────────────────────────────────

export type PacketEvent =
  | { type: "route" }
  | { type: "start" }
  | { type: "block" }
  | { type: "unblock" }
  | { type: "approve"; by: string }
  | { type: "complete"; evidencePath?: string };

export interface TransitionResult {
  packet: WorkPacket;
  ok: boolean;
  reason: string;
}

const ALLOWED_FROM: Record<PacketEvent["type"], PacketStatus[]> = {
  route: ["draft"],
  start: ["routed", "blocked", "awaiting_approval"],
  block: ["routed", "running", "awaiting_approval"],
  unblock: ["blocked"],
  approve: ["awaiting_approval", "blocked", "routed", "running"],
  complete: ["running"],
};

export function transitionPacket(
  packet: WorkPacket,
  event: PacketEvent,
): TransitionResult {
  const allowed = ALLOWED_FROM[event.type];
  if (!allowed.includes(packet.status)) {
    return {
      packet,
      ok: false,
      reason: `cannot ${event.type} from ${packet.status}`,
    };
  }

  switch (event.type) {
    case "route":
      return {
        packet: { ...packet, status: "routed" },
        ok: true,
        reason: "routed",
      };
    case "block":
      return {
        packet: { ...packet, status: "blocked" },
        ok: true,
        reason: "blocked",
      };
    case "unblock":
      return {
        packet: { ...packet, status: "routed" },
        ok: true,
        reason: "unblocked",
      };
    case "approve":
      return {
        packet: { ...packet, approvedBy: event.by, status: "running" },
        ok: true,
        reason: `approved by ${event.by}`,
      };
    case "start": {
      // A packet requiring approval cannot run until approved.
      if (packet.approvalRequired && !packet.approvedBy) {
        return {
          packet: { ...packet, status: "awaiting_approval" },
          ok: true,
          reason: "approval required before running",
        };
      }
      return {
        packet: { ...packet, status: "running" },
        ok: true,
        reason: "running",
      };
    }
    case "complete": {
      if (packet.approvalRequired && !packet.approvedBy) {
        return {
          packet,
          ok: false,
          reason: "cannot complete: approval required and not approved",
        };
      }
      return {
        packet: {
          ...packet,
          status: "completed",
          evidencePath: event.evidencePath ?? packet.evidencePath,
        },
        ok: true,
        reason: "completed",
      };
    }
  }
}

// ─── Linear projection planning (pure; no create path) ──────────────────────

const LANE_PRIORITY: Record<WorkLane, number> = {
  deep_reasoning: 2,
  coding: 2,
  ops: 3,
  fast_drafting: 3,
  video_media: 3,
};

export function toLinearIssueInput(packet: WorkPacket): CreateIssueInput {
  const teamKey = BUSINESS_TO_TEAM[packet.projectKey] ?? "UNI";
  const description = [
    "## Overview",
    packet.outcome,
    "",
    "## Acceptance Criteria",
    "- [ ] Implement the smallest production-safe slice that satisfies the requested outcome.",
    "- [ ] Run the relevant focused tests plus type-check/lint where the project supports them.",
    "- [ ] Post branch, PR, verification evidence, and any blockers back to Linear.",
    "",
    "## Routing",
    `Project: ${packet.projectKey}${packet.clientId ? ` · client ${packet.clientId}` : ""}`,
    `Lane: ${packet.lane} · risk: ${packet.riskLevel}`,
    `Next action owner: ${packet.nextActionOwner}`,
    `Approval required: ${packet.approvalRequired}`,
    `Projection provenance: ${PACKET_LABELS.join(" · ")}`,
  ].join("\n");
  return {
    title: packet.outcome.slice(0, 120),
    description,
    teamKey,
    priority: packet.riskLevel === "high" ? 1 : LANE_PRIORITY[packet.lane],
    labelNames: [...packet.labels],
  };
}

export interface PacketProjectionPlan {
  packet: WorkPacket;
  mode: "plan-only";
  linearInput: CreateIssueInput;
  created: null;
}

/** Build a descriptive projection plan. No environment value can make it write. */
export function planPacketLinearProjection(
  packet: WorkPacket,
): PacketProjectionPlan {
  return {
    packet,
    mode: "plan-only",
    linearInput: toLinearIssueInput(packet),
    created: null,
  };
}
