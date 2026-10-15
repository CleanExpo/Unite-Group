import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createIdeaLifecycle } from "@/lib/command-centre/idea-lifecycle";
import type { ResearchRun } from "@/lib/command-centre/idea-research";
import { MissionResearch } from "../MissionResearch";

const taskId = "00000000-0000-4000-8000-000000000001";
const actorId = "00000000-0000-4000-8000-000000000002";
const runId = "00000000-0000-4000-8000-000000000003";
const now = "2026-10-15T00:00:00Z";
function lifecycle(mandate = true) {
  const state = createIdeaLifecycle(
    {
      title: "Customer intake",
      rawIdea: "Explore whether customer intake could be simpler.",
      requestId: "00000000-0000-4000-8000-000000000004",
    },
    { actorId, now },
  );
  if (mandate)
    state.mandate = {
      objective: "Compare customer needs and current alternatives.",
      allowedSources: ["Public official publications"],
      maximumSources: 8,
      spendLimitMinor: 0,
      currency: "AUD",
      paidApiAllowed: false,
    };
  return state;
}
function run(
  state: ResearchRun["state"] = "queued",
): Omit<ResearchRun, "lease"> {
  return {
    schemaVersion: 1,
    id: runId,
    requestId: "00000000-0000-4000-8000-000000000005",
    taskId,
    founderId: actorId,
    state,
    authority: {
      runId,
      taskId,
      founderId: actorId,
      actorId,
      lifecycleRevision: 1,
      inputHash: "a".repeat(64),
      mandateHash: "b".repeat(64),
      approvedAt: now,
      expiresAt: "2026-10-15T01:00:00Z",
      scope: "public_research_only",
      limits: {
        maximumSources: 8,
        timeLimitMinutes: 10,
        maxTurns: 6,
        concurrency: 1,
      },
      allowedDomains: ["example.com"],
      paidApiAllowed: false,
      subscriptionCredits: "unknown",
    },
    authorityHash: "c".repeat(64),
    startedAt: null,
    deadlineAt: null,
    attempts: 1,
    turnsReserved: 0,
    checkpoint: null,
    result: null,
    toolObservations: [],
    error: null,
    history: [{ action: "start", at: now, actor: actorId }],
  };
}
function body(
  research: ReturnType<typeof run> | null = null,
  authorityCurrent = true,
  signingAvailable = true,
) {
  return {
    taskId,
    research,
    source: "supabase",
    authorityCurrent,
    readiness: {
      signingAvailable,
      runnerConnection: "unknown",
      subscriptionAllowance: "unknown",
      paidApiFallback: false,
    },
  };
}
const response = (value: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => value,
});
async function load() {
  fireEvent.click(
    screen.getByRole("button", { name: "Load research requests" }),
  );
  await screen.findByText("Choose the research boundaries");
}
function approve() {
  fireEvent.click(screen.getByText("Choose the research boundaries"));
  fireEvent.change(
    screen.getByLabelText("Allowed public website domains — one per line"),
    { target: { value: "EXAMPLE.COM\ndocs.example.com" } },
  );
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I approve public research/ }),
  );
}
beforeEach(() => {
  vi.restoreAllMocks();
});

describe("MissionResearch", () => {
  it("reads on request and keeps research separate from brief and build consent", async () => {
    const fetchMock = vi.fn(async () => response(body()));
    vi.stubGlobal("fetch", fetchMock);
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle(false)} />);
    expect(fetchMock).not.toHaveBeenCalled();
    await load();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/command-centre/missions/research?taskId=${taskId}`,
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
    expect(
      screen.getByText(
        /Availability and remaining subscription allowance are not confirmed/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Save the research objective/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve and queue research" }),
    ).not.toBeInTheDocument();
  });

  it("queues only explicitly approved immutable input, public domains and bounded limits", async () => {
    const writes: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST")
          writes.push(JSON.parse(init.body as string));
        return response(body(init?.method === "POST" ? run() : null));
      }),
    );
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    await load();
    expect(
      screen.getByRole("button", { name: "Approve and queue research" }),
    ).toBeDisabled();
    approve();
    expect(writes).toHaveLength(0);
    expect(
      screen.getByLabelText("Maximum sources admitted to findings"),
    ).toHaveAttribute("max", "8");
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and queue research" }),
    );
    await screen.findByText("Queued", { exact: true });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      action: "start",
      taskId,
      expectedRevision: 1,
      allowedDomains: ["example.com", "docs.example.com"],
      limits: {
        maximumSources: 8,
        timeLimitMinutes: 10,
        maxTurns: 6,
        concurrency: 1,
      },
    });
    expect(writes[0].requestId).toEqual(expect.any(String));
    expect(writes[0]).not.toHaveProperty("actorId");
    expect(writes[0]).not.toHaveProperty("paidApiAllowed");
  });

  it("retains the request identity after an uncertain queue response and an explicit reload", async () => {
    const writes: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          writes.push(JSON.parse(init.body as string));
          if (writes.length === 1) throw new Error("Connection interrupted");
          return response(body(run()));
        }
        return response(body());
      }),
    );
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    await load();
    approve();
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and queue research" }),
    );
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Refresh research" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Approve and queue research" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and queue research" }),
    );
    await screen.findByText("Queued", { exact: true });
    expect(writes).toHaveLength(2);
    expect(writes[0].requestId).toBe(writes[1].requestId);
  });

  it("requires renewed consent after changing the approved research limits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(body())),
    );
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    await load();
    approve();
    fireEvent.change(screen.getByLabelText("Maximum research turns"), {
      target: { value: "4" },
    });
    expect(
      screen.getByRole("checkbox", { name: /I approve public research/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Approve and queue research" }),
    ).toBeDisabled();
  });

  it("uses a new request identity for newly approved research after cancellation", async () => {
    const writes: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init?.method) return response(body());
        const command = JSON.parse(init.body as string);
        writes.push(command);
        return response(
          body(run(command.action === "cancel" ? "cancelled" : "queued")),
        );
      }),
    );
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    await load();
    approve();
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and queue research" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel research request" }),
    );
    fireEvent.click(await screen.findByText("Approve a new research request"));
    fireEvent.change(
      screen.getByLabelText("Allowed public website domains — one per line"),
      { target: { value: "EXAMPLE.COM\ndocs.example.com" } },
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I approve public research/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and queue research" }),
    );
    await screen.findByText("Queued", { exact: true });
    expect(writes).toHaveLength(3);
    expect(writes[0].requestId).not.toBe(writes[2].requestId);
  });

  it.each(["queued", "running"] as const)(
    "cancels a %s request through the same owner route",
    async (state) => {
      const writes: unknown[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: RequestInit) => {
          if (init?.method === "POST")
            writes.push(JSON.parse(init.body as string));
          return response(
            body(run(init?.method === "POST" ? "cancelled" : state)),
          );
        }),
      );
      render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
      fireEvent.click(
        screen.getByRole("button", { name: "Load research requests" }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Cancel research request" }),
      );
      await screen.findByText("Cancelled", { exact: true });
      expect(writes).toEqual([
        { action: "cancel", taskId, expectedRevision: 1, runId },
      ]);
    },
  );

  it("shows saved partial proposals and checkpoints without promoting them into lifecycle truth", async () => {
    const partial = run("partial");
    partial.checkpoint = {
      sequence: 2,
      summary: "One candidate source has been found.",
      nextStep: "Decide which customer segment to examine.",
      sourceIds: ["source-1"],
      toolCalls: 1,
      turnsUsed: 2,
    };
    partial.result = {
      schemaVersion: 1,
      kind: "untrusted_research_proposal",
      summary: "A small experiment may help.",
      sources: [
        {
          id: "source-1",
          label: "Candidate report",
          reference: "https://example.com/report",
          kind: "primary",
          independenceGroup: "publisher",
          limitations: ["Commercial incentives are unclear."],
          capturedAt: now,
        },
      ],
      claims: [
        {
          id: "claim-1",
          statement: "Customers may prefer shorter forms.",
          classification: "hypothesis",
          sourceIds: ["source-1"],
          counterEvidenceIds: [],
          confidence: "low",
          limitations: ["No direct customer test."],
        },
      ],
      openDecisions: ["Which customers should the experiment serve?"],
      options: [
        {
          title: "Run a smaller experiment",
          benefits: ["Faster feedback"],
          risks: ["Demand remains uncertain"],
        },
      ],
      proposedBrief: null,
    };
    const fetchMock = vi.fn(async () => response(body(partial)));
    vi.stubGlobal("fetch", fetchMock);
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load research requests" }),
    );
    await screen.findByText("Partial findings", { exact: true });
    expect(
      screen.getByRole("region", { name: "Saved research checkpoint" }),
    ).toHaveTextContent("One candidate source");
    expect(
      screen.getByRole("region", { name: "Research proposals for review" }),
    ).toHaveTextContent("awaiting your review");
    expect(
      screen.getByText("Customers may prefer shorter forms."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/do not become verified facts/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Approve.*brief/ }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retries only the existing current authority and never creates build consent", async () => {
    const writes: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST")
          writes.push(JSON.parse(init.body as string));
        return response(
          body(run(init?.method === "POST" ? "queued" : "blocked")),
        );
      }),
    );
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load research requests" }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Retry within the approved research boundaries",
      }),
    );
    await screen.findByText("Queued", { exact: true });
    expect(writes).toEqual([
      { action: "retry", taskId, expectedRevision: 1, runId },
    ]);
  });

  it("retains saved findings on a conflict and offers a fresh idea read", async () => {
    const refreshIdea = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? response({ error: "This idea changed." }, 409)
          : response(body(run("blocked"))),
      ),
    );
    render(
      <MissionResearch
        taskId={taskId}
        lifecycle={lifecycle()}
        onRefreshIdea={refreshIdea}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Load research requests" }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Retry within the approved research boundaries",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The idea or run changed",
    );
    expect(screen.getByText("Blocked", { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Retry within the approved research boundaries",
      }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh the saved idea" }),
    );
    expect(refreshIdea).toHaveBeenCalledOnce();
  });

  it("keeps stale authority historical and blocks a request when authorisation is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(body(run("blocked"), false, false))),
    );
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load research requests" }),
    );
    await screen.findByText(/Research authorisation needs operator attention/);
    expect(
      screen.getByText(/no longer matches the current idea/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Retry within the approved research boundaries",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve and queue research" }),
    ).toBeDisabled();
  });

  it.each(["cancelled", "completed"] as const)(
    "requires a new explicit authority after %s rather than retrying",
    async (state) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => response(body(run(state)))),
      );
      render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
      fireEvent.click(
        screen.getByRole("button", { name: "Load research requests" }),
      );
      await screen.findByText(
        state === "cancelled" ? "Cancelled" : "Research completed",
        { exact: true },
      );
      expect(
        screen.queryByRole("button", {
          name: "Retry within the approved research boundaries",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Approve a new research request"),
      ).toBeInTheDocument();
    },
  );

  it("requires a new bounded request when previous subscription usage cannot be reconciled", async () => {
    const blocked = run("blocked");
    blocked.error = {
      code: "usage_unknown",
      message: "Prior turn usage could not be reconciled.",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(body(blocked))),
    );
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load research requests" }),
    );
    await screen.findByText(/A new bounded research request is required/);
    expect(
      screen.queryByRole("button", {
        name: "Retry within the approved research boundaries",
      }),
    ).not.toBeInTheDocument();
  });

  it("offers recovery for an expired running researcher without retrying automatically", async () => {
    const expired = {
      ...run("running"),
      lease: { runnerId: "researcher-1", expiresAt: "2020-01-01T00:00:00Z" },
    };
    const fetchMock = vi.fn(async () => response(body(expired)));
    vi.stubGlobal("fetch", fetchMock);
    render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load research requests" }),
    );
    await screen.findByText(/The researcher stopped responding/);
    expect(
      screen.getByRole("button", {
        name: "Retry within the approved research boundaries",
      }),
    ).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("polls active status using reads only and stops after completion", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      response(body(run("running"))),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    try {
      await act(async () => {
        render(<MissionResearch taskId={taskId} lifecycle={lifecycle()} />);
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Load research requests" }),
        );
      });
      expect(screen.getByText("Running", { exact: true })).toBeInTheDocument();
      fetchMock.mockResolvedValue(response(body(run("completed"))));
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(
        screen.getByText("Research completed", { exact: true }),
      ).toBeInTheDocument();
      const count = fetchMock.mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(20000);
      });
      expect(fetchMock).toHaveBeenCalledTimes(count);
      expect(fetchMock.mock.calls.every(([, init]) => !init?.method)).toBe(
        true,
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
