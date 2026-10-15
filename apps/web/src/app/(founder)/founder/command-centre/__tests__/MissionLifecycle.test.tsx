import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  applyLifecycleCommand,
  createIdeaLifecycle,
  toLifecycleView,
} from "@/lib/command-centre/idea-lifecycle";
import {
  IdeaCapture,
  MissionLifecycle,
  currencyAmountToMinor,
  currencyMinorToAmount,
  stripeAmountToMinor,
  stripeMinorToAmount,
} from "../MissionLifecycle";

const taskId = "00000000-0000-4000-8000-000000000001";
const actorId = "00000000-0000-4000-8000-000000000002";
function packet() {
  const lifecycle = createIdeaLifecycle(
    {
      rawIdea: "A local service idea",
      title: "Customer intake",
      requestId: "00000000-0000-4000-8000-000000000003",
    },
    { actorId, now: "2026-10-15T00:00:00Z" },
  );
  return {
    taskId,
    lifecycle,
    progress: toLifecycleView(lifecycle),
    handoff: null,
    source: "supabase",
  };
}
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
beforeEach(() => {
  vi.restoreAllMocks();
});

describe('internal factory use view', () => {
  it.each([
    ['not_connected', false, 'Internal-use evidence is not connected.'],
    ['unavailable', false, 'Internal-use evidence could not be confirmed. Refresh before relying on it.'],
    ['available', false, 'First internal value confirmed: an approved research handoff was persisted.'],
    ['available', true, 'No confirmed internal first-value event for this mission.'],
  ] as const)('keeps %s internal use separate from customer outcomes, withdrawn=%s', async (status, withdrawn, message) => {
    const entry = { id: taskId, occurredAt: '2026-10-15T00:00:00.000Z', admittedAt: '2026-10-15T00:00:01.000Z', briefHash: 'a'.repeat(64), revision: 1, releaseId: 'dpl_PreviousRuntime', environment: 'production', withdrawn }
    const initial = packet()
    initial.lifecycle.revision = 9
    const fetchMock = vi.fn(async () => response({ ...initial, factoryActivation: { status, classification: 'internal_factory_use', scope: 'this_mission', history: status === 'available' ? [entry] : [], firstValue: status === 'available' && !withdrawn ? entry : null } }))
    vi.stubGlobal('fetch', fetchMock)
    render(<MissionLifecycle taskId={taskId} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open research and outcome workbench' }))
    const section = await screen.findByRole('region', { name: 'Internal factory use' })
    expect({ message: within(section).queryByText(message) !== null, separation: section.textContent?.includes('separate from its customers, payments and paying-client count.'), historicalRevision: status === 'available' ? section.textContent?.includes('revision 1') : true, withdrawal: status === 'available' && withdrawn ? section.textContent?.includes('Evidence withdrawn') : true, time: section.querySelector('time')?.getAttribute('datetime') ?? null, writes: fetchMock.mock.calls.length }).toEqual({ message: true, separation: true, historicalRevision: true, withdrawal: true, time: status === 'available' ? entry.occurredAt : null, writes: 1 })
  })
})

describe("research-only idea capture", () => {
  it("saves raw input to the research capture route without invoking paid preparation", async () => {
    const onCaptured = vi.fn();
    const mission = { taskId };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      response({ ...packet(), mission }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<IdeaCapture onCaptured={onCaptured} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Idea title"), {
      target: { value: "My first idea" },
    });
    fireEvent.change(screen.getByLabelText("Rough idea"), {
      target: { value: "  Preserve rough notes\nwith unknowns.  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save idea for research" }),
    );
    await waitFor(() => expect(onCaptured).toHaveBeenCalledWith(mission));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/command-centre/missions/lifecycle",
    );
    expect(
      JSON.parse(fetchMock.mock.calls[0][1]!.body as string),
    ).toMatchObject({
      action: "capture",
      rawIdea: "  Preserve rough notes\nwith unknowns.  ",
      title: "My first idea",
    });
    expect(
      JSON.parse(fetchMock.mock.calls[0][1]!.body as string),
    ).not.toHaveProperty("paidApiAllowed");
  });

  it("retains input and the same request identity after uncertain save", async () => {
    const writes: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        writes.push(JSON.parse(init.body as string));
        throw new Error("Connection interrupted");
      }),
    );
    render(<IdeaCapture onCaptured={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Idea title"), {
      target: { value: "A service" },
    });
    fireEvent.change(screen.getByLabelText("Rough idea"), {
      target: { value: "Unknowns are acceptable" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save idea for research" }),
    );
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Rough idea")).toHaveValue(
      "Unknowns are acceptable",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save idea for research" }),
    );
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[0].requestId).toBe(writes[1].requestId);
  });
});

describe("mission lifecycle workbench", () => {
  it.each([
    ["AUD", "12.34", 1234],
    ["JPY", "1234", 1234],
    ["KWD", "12.345", 12345],
  ] as const)(
    "converts %s amounts without assuming cents",
    (currency, amount, minor) => {
      expect(currencyAmountToMinor(amount, currency)).toBe(minor);
      expect(currencyMinorToAmount(minor, currency)).toBe(amount);
    },
  );

  it("rejects unsupported currencies and excess precision without rounding", () => {
    expect(() => currencyAmountToMinor("1.1", "JPY")).toThrow(
      "0 decimal places",
    );
    expect(() => currencyAmountToMinor("1.2345", "KWD")).toThrow(
      "3 decimal places",
    );
    expect(() => currencyAmountToMinor("1.235", "AUD")).toThrow(
      "2 decimal places",
    );
    expect(() => currencyAmountToMinor("1.00", "ZZZ")).toThrow("supported");
  });

  it.each(["ISK", "UGX"])(
    "preserves the distinct Stripe payment and ISO budget representation for %s",
    (currency) => {
      expect(currencyAmountToMinor("5", currency)).toBe(5);
      expect(currencyMinorToAmount(5, currency)).toBe("5");
      expect(stripeAmountToMinor("5", currency)).toBe(500);
      expect(stripeMinorToAmount(500, currency)).toBe("5");
      expect(() => stripeAmountToMinor("5.1", currency)).toThrow(
        "whole-currency amounts",
      );
      expect(() => stripeMinorToAmount(501, currency)).toThrow(
        "not a whole-currency amount",
      );
    },
  );

  it.each([
    ["AUD", "12.34", 1234],
    ["JPY", "1234", 1234],
    ["KWD", "12.345", 12345],
  ] as const)(
    "retains Stripe ordinary %s representation",
    (currency, amount, minor) => {
      expect(stripeAmountToMinor(amount, currency)).toBe(minor);
      expect(stripeMinorToAmount(minor, currency)).toBe(amount);
    },
  );

  it.each(["ISK", "UGX"])(
    "creates a %s payment target using Stripe charge representation",
    async (currency) => {
      const initial = packet();
      const writes: Array<Record<string, unknown>> = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: RequestInit) => {
          if (init?.method === "POST")
            writes.push(JSON.parse(init.body as string));
          return response(initial);
        }),
      );
      render(<MissionLifecycle taskId={taskId} />);
      fireEvent.click(
        screen.getByRole("button", {
          name: "Open research and outcome workbench",
        }),
      );
      await screen.findByText("Saved revision 1 · captured");
      fireEvent.click(
        screen.getByText("Launch, onboarding and paying-client target"),
      );
      const fields = within(
        screen.getByText("Commercial outcome contract").closest("fieldset")!,
      );
      for (const [label, input] of [
        ["Outcome repository (owner/repository)", "CleanExpo/Unite-Group"],
        ["Live Stripe account identifier", "acct_fixture"],
        ["Payment product identifier", "prod_fixture"],
        ["First valuable customer action (activation event)", "first_value"],
        ["Required distinct paying clients", "1"],
        ["Payment currency", currency],
        [`Minimum net payment per client (${currency})`, "5"],
        [
          "Measurement starts (include timezone, e.g. 2026-10-15T09:00:00+10:00)",
          "2026-10-15T00:00:00Z",
        ],
        ["Measurement ends (include timezone)", "2026-10-16T00:00:00Z"],
      ])
        fireEvent.change(fields.getByLabelText(label), {
          target: { value: input },
        });
      fireEvent.click(
        fields.getByRole("button", { name: "Save commercial target" }),
      );
      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0]).toMatchObject({
        action: "set_outcome",
        outcome: { currency, minimumNetMinor: 500 },
      });
    },
  );

  it.each(["ISK", "UGX"])(
    "reads a saved %s payment target in whole major units",
    async (currency) => {
      const initial = packet();
      initial.lifecycle = applyLifecycleCommand(
        initial.lifecycle,
        {
          action: "set_outcome",
          taskId,
          expectedRevision: 1,
          outcome: {
            repository: "CleanExpo/Unite-Group",
            baseBranch: "main",
            productId: "prod_fixture",
            stripeAccountId: "acct_fixture",
            activationEvent: "first_value",
            requiredClients: 1,
            currency,
            minimumNetMinor: 500,
            windowStart: "2026-10-15T00:00:00Z",
            windowEnd: "2026-10-16T00:00:00Z",
          },
        },
        { actorId, now: "2026-10-15T00:00:00Z" },
      );
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => response(initial)),
      );
      render(<MissionLifecycle taskId={taskId} />);
      fireEvent.click(
        screen.getByRole("button", {
          name: "Open research and outcome workbench",
        }),
      );
      await screen.findByText("Saved revision 2 · captured");
      fireEvent.click(
        screen.getByText("Launch, onboarding and paying-client target"),
      );
      const fields = within(
        screen.getByText("Commercial outcome contract").closest("fieldset")!,
      );
      expect(
        fields.getByLabelText(`Minimum net payment per client (${currency})`),
      ).toHaveValue("5");
    },
  );

  it("renders a saved KWD target correctly and does not silently convert it on a currency change", async () => {
    const initial = packet();
    initial.lifecycle = applyLifecycleCommand(
      initial.lifecycle,
      {
        action: "set_outcome",
        taskId,
        expectedRevision: 1,
        outcome: {
          repository: "CleanExpo/Unite-Group",
          baseBranch: "main",
          productId: "prod_fixture",
          stripeAccountId: "acct_fixture",
          activationEvent: "first_value",
          requiredClients: 1,
          currency: "KWD",
          minimumNetMinor: 12345,
          windowStart: "2026-10-15T00:00:00Z",
          windowEnd: "2026-10-16T00:00:00Z",
        },
      },
      { actorId, now: "2026-10-15T00:00:00Z" },
    );
    const fetchMock = vi.fn(async () => response(initial));
    vi.stubGlobal("fetch", fetchMock);
    render(<MissionLifecycle taskId={taskId} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open research and outcome workbench",
      }),
    );
    await screen.findByText("Saved revision 2 · captured");
    fireEvent.click(
      screen.getByText("Launch, onboarding and paying-client target"),
    );
    const fields = within(
      screen.getByText("Commercial outcome contract").closest("fieldset")!,
    );
    expect(
      fields.getByLabelText("Minimum net payment per client (KWD)"),
    ).toHaveValue("12.345");
    fireEvent.change(fields.getByLabelText("Payment currency"), {
      target: { value: "JPY" },
    });
    expect(
      fields.getByLabelText("Minimum net payment per client (JPY)"),
    ).toHaveValue("12.345");
    fireEvent.click(
      fields.getByRole("button", { name: "Save commercial target" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "JPY supports 0 decimal places",
    );
    expect(
      fields.getByRole("button", { name: "Save commercial target" }),
    ).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("loads only on request and shows honest milestone and knowledge gaps", async () => {
    const fetchMock = vi.fn(async () => response(packet()));
    vi.stubGlobal("fetch", fetchMock);
    render(<MissionLifecycle taskId={taskId} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open research and outcome workbench",
      }),
    );
    await screen.findByText("Saved revision 1 · captured");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/command-centre/missions/lifecycle?taskId=${taskId}`,
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
    expect(
      screen.getByRole("heading", { name: "Need your decision" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Assumed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Need to research" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Availability and remaining subscription allowance are not confirmed/),
    ).toBeInTheDocument();
    const milestones = screen.getByRole("list", {
      name: "Evidence milestones",
    });
    expect(within(milestones).getByText("Merged to main")).toBeInTheDocument();
    expect(
      within(milestones).getAllByText("not connected").length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      screen.queryByRole("button", { name: "Approve this research brief" }),
    ).not.toBeInTheDocument();
  });

  it("writes the current revision and keeps knowledge distinct from provider proof", async () => {
    const initial = packet();
    const writes: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST")
          writes.push(JSON.parse(init.body as string));
        return response(initial);
      }),
    );
    render(<MissionLifecycle taskId={taskId} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open research and outcome workbench",
      }),
    );
    await screen.findByText("Saved revision 1 · captured");
    fireEvent.click(
      screen.getByText("Sources, claims and consequential decisions"),
    );
    fireEvent.change(screen.getByLabelText("Statement"), {
      target: { value: "Customers may prefer phone access" },
    });
    fireEvent.change(screen.getByLabelText("Knowledge classification"), {
      target: { value: "hypothesis" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add statement" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      action: "record_research",
      taskId,
      expectedRevision: 1,
      claims: [
        {
          statement: "Customers may prefer phone access",
          classification: "hypothesis",
          sourceIds: [],
          counterEvidenceIds: [],
          confidence: "low",
        },
      ],
    });
    expect(writes[0]).not.toHaveProperty("observations");
  });

  it("retains previous evidence and blocks decisions after a stale read until refresh", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ++calls === 1
          ? response(packet())
          : response({ error: "Connection is unavailable" }, false),
      ),
    );
    render(<MissionLifecycle taskId={taskId} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open research and outcome workbench",
      }),
    );
    await screen.findByText("Saved revision 1 · captured");
    fireEvent.click(screen.getByRole("button", { name: "Refresh lifecycle" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Saved revision 1 · captured")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Check connected delivery and payment evidence",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Refresh lifecycle" }),
    ).toBeEnabled();
  });

  it("hands the exact reviewed mission to the existing delivery path only on a separate action", async () => {
    const initial = packet();
    const context = { actorId, now: "2026-10-15T00:00:00Z" };
    const proposed = applyLifecycleCommand(
      initial.lifecycle,
      {
        action: "propose_brief",
        taskId,
        expectedRevision: 1,
        brief: {
          objective: "A reviewable intake",
          user: "Founder",
          payer: "Founder",
          nonGoals: [],
          acceptanceCriteria: [
            {
              id: "one",
              criterion: "Save notes",
              validation: "Read back notes",
            },
          ],
          outputs: Array.from({ length: 13 }, (_, index) => ({
            id: index + 1,
            status: "blocked" as const,
            content: "Needs research before execution.",
          })),
          design: { summary: "Accessible form", sourceIds: [] },
          target: { repository: "CleanExpo/Unite-Group", baseBranch: "main" },
          risks: [],
          openDecisions: [],
        },
      },
      context,
    );
    const approved = applyLifecycleCommand(
      proposed,
      {
        action: "approve_brief",
        taskId,
        expectedRevision: proposed.revision,
        briefHash: proposed.brief!.hash,
      },
      context,
    );
    const fetchMock = vi.fn(async () =>
      response({
        ...initial,
        lifecycle: approved,
        progress: toLifecycleView(approved),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const prepare = vi.fn();
    render(<MissionLifecycle taskId={taskId} onPrepareReviewed={prepare} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open research and outcome workbench",
      }),
    );
    const button = await screen.findByRole("button", {
      name: "Prepare reviewed brief for build",
    });
    expect(prepare).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(prepare).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
