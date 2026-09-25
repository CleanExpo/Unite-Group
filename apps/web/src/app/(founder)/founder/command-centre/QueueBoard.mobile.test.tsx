import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/command-centre/realtime", () => ({
  subscribeToQueue: (
    _client: unknown,
    _reload: unknown,
    status: (value: string) => void,
  ) => {
    status("SUBSCRIBED");
    return () => undefined;
  },
}));

import { QueueBoard } from "./QueueBoard";

const task = {
  id: "task-1",
  title: "Release Mission Control",
  objective: "Ship the reviewed change",
  status: "awaiting_approval",
  priority: "high",
  risk_level: "high",
  origin: "founder",
  project_key: "UNI",
  updated_at: "2026-09-05T00:00:00.000Z",
};

function response(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("QueueBoard mobile founder controls", () => {
  it("starts through the existing session lifecycle without creating another executor", async () => {
    const queuedTask = { ...task, status: "queued" };
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = input.toString();
      calls.push({ url, init });
      if (url.includes("/sessions")) return response({ sessions: [] });
      return response({ tasks: [queuedTask] });
    });

    render(<QueueBoard />);
    const lane = await screen.findByTestId("queue-lane-queued");
    fireEvent.click(lane.querySelector("summary")!);
    fireEvent.click(screen.getByRole("button", { name: "Start", exact: true }));

    await waitFor(() =>
      expect(calls.some((call) => call.url === "/api/command-centre/sessions" && call.init?.method === "POST")).toBe(true),
    );
    expect(calls.some((call) => call.url.includes("execute") || call.url.includes("runner"))).toBe(false);
  });

  it("records merge and deploy as dormant edit approvals, never execution requests", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = input.toString();
      calls.push({ url, init });
      if (!init?.method) return response({ tasks: [task] });
      return response({ approval: {}, task }, true);
    });

    render(<QueueBoard />);
    const lane = await screen.findByTestId("queue-lane-awaiting_approval");
    fireEvent.click(lane.querySelector("summary")!);
    fireEvent.click(
      screen.getByRole("button", { name: "Request merge approval" }),
    );
    await waitFor(() =>
      expect(
        calls.some((call) =>
          String(call.init?.body).includes("merge approval"),
        ),
      ).toBe(true),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Request deploy approval" }),
    );
    await waitFor(() =>
      expect(
        calls.some((call) =>
          String(call.init?.body).includes("deploy approval"),
        ),
      ).toBe(true),
    );

    const mutations = calls.filter((call) => call.init?.method);
    expect(mutations).toHaveLength(2);
    for (const call of mutations) {
      expect(call.url).toBe("/api/command-centre/queue/task-1/approve");
      expect(JSON.parse(String(call.init?.body))).toMatchObject({
        decision: "edit",
      });
    }
    expect(
      screen.getByText(/Merge and deploy requests do not execute/),
    ).toBeInTheDocument();
  });

  it("records a redirect note through the existing approval ledger", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      calls.push({ url: input.toString(), init });
      if (!init?.method) return response({ tasks: [task] });
      return response({ approval: {}, task });
    });

    render(<QueueBoard />);
    const lane = await screen.findByTestId("queue-lane-awaiting_approval");
    fireEvent.click(lane.querySelector("summary")!);
    fireEvent.click(screen.getByRole("button", { name: "Redirect" }));
    fireEvent.change(screen.getByLabelText("New direction"), {
      target: { value: "Send back for exact-version review" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Record redirect request" }),
    );

    await waitFor(() => {
      const mutation = calls.find((call) => call.init?.method === "POST");
      expect(JSON.parse(String(mutation?.init?.body))).toEqual({
        decision: "edit",
        note: "Founder redirect requested: Send back for exact-version review",
      });
    });
  });

  it("pauses the real active session selected from the existing sessions API", async () => {
    const runningTask = { ...task, status: "running" };
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = input.toString();
      calls.push({ url, init });
      if (url.includes("/sessions?")) {
        return response({
          sessions: [
            {
              id: "session-7",
              surface: "nexus-runner",
              status: "running",
              started_at: task.updated_at,
            },
          ],
        });
      }
      if (url.includes("/sessions/session-7"))
        return response({ session: { status: "paused" } });
      return response({ tasks: [runningTask] });
    });

    render(<QueueBoard />);
    const lane = await screen.findByTestId("queue-lane-running");
    fireEvent.click(lane.querySelector("summary")!);
    fireEvent.click(screen.getByRole("button", { name: "Pause", exact: true }));

    await waitFor(() => {
      const pause = calls.find((call) =>
        call.url.endsWith("/sessions/session-7"),
      );
      expect(pause?.init?.method).toBe("PATCH");
      expect(JSON.parse(String(pause?.init?.body))).toEqual({
        action: "pause",
      });
    });
  });
});
