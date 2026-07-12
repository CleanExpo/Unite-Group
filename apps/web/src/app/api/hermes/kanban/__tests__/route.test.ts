import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/integrations/linear", () => ({ fetchIssuesByLabel: vi.fn() }));

import { fetchIssuesByLabel } from "@/lib/integrations/linear";
import { getUser } from "@/lib/supabase/server";
import { GET, POST, __test__ } from "../route";

const missingHermes = Object.assign(new Error("spawn hermes ENOENT"), {
  code: "ENOENT",
});

function post(body: string) {
  return POST(
    new Request("http://localhost/api/hermes/kanban", {
      method: "POST",
      body,
    }),
  );
}

describe("Hermes Kanban read-only projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: "founder-1" } as never);
    __test__.resetExecFileForTest();
  });

  it("keeps GET and POST founder-authenticated", async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    await expect(GET()).resolves.toMatchObject({ status: 401 });
    await expect(post('{"action":"create"}')).resolves.toMatchObject({
      status: 401,
    });
  });

  it("parses and summarises read-only Hermes task rows", () => {
    expect(
      __test__.parseTaskLine(
        "▶ t_01f3c9ea  ready     (unassigned)         Founder-approved work",
      ),
    ).toEqual({
      id: "t_01f3c9ea",
      status: "ready",
      assignee: null,
      title: "Founder-approved work",
    });
    expect(
      __test__.summarise([
        { id: "t_1", status: "ready", assignee: null, title: "one" },
        { id: "t_2", status: "ready", assignee: "default", title: "two" },
        { id: "t_3", status: "done", assignee: "default", title: "three" },
      ]),
    ).toEqual({ ready: 2, done: 1 });
  });

  it("returns the local Hermes board as visibility-only data", async () => {
    const execMock = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "Current board: default\n", stderr: "" })
      .mockResolvedValueOnce({
        stdout:
          "▶ t_ready01  ready     default               Read-only projection\n",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          comments: [
            {
              body: "Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/test",
            },
          ],
        }),
        stderr: "",
      });
    __test__.setExecFileForTest(execMock);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      source: "hermes-kanban",
      mode: "cli",
      authority: "crm-cc_tasks",
      readOnly: true,
      tasks: [
        {
          id: "t_ready01",
          linearLink: {
            identifier: "UNI-777",
            url: "https://linear.app/unite-group/issue/UNI-777/test",
          },
        },
      ],
    });
  });

  it("uses the legacy Linear projection only as an honest read-only fallback", async () => {
    __test__.setExecFileForTest(vi.fn().mockRejectedValue(missingHermes));
    vi.mocked(fetchIssuesByLabel).mockResolvedValue([
      {
        id: "issue-id",
        identifier: "UNI-777",
        title: "Legacy projection",
        url: "https://linear.app/unite-group/issue/UNI-777/test",
        state: { type: "backlog" },
      },
    ] as never);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      source: "linear",
      mode: "linear",
      authority: "crm-cc_tasks",
      readOnly: true,
      tasks: [{ id: "UNI-777", status: "scheduled" }],
    });
  });

  it("does not misreport a failed legacy projection query as an empty configured board", async () => {
    __test__.setExecFileForTest(vi.fn().mockRejectedValue(missingHermes));
    vi.mocked(fetchIssuesByLabel).mockRejectedValue(new Error("Linear unavailable"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      configured: false,
      authority: "crm-cc_tasks",
      readOnly: true,
      error: "Linear unavailable",
    });
  });

  it.each([
    '{"action":"create","title":"unsafe"}',
    '{"action":"complete","taskId":"t_ready01"}',
    '{"action":"linkLinear","taskId":"t_ready01"}',
    "not-json",
    "",
  ])("returns the same body-blind 410 tombstone for former mutation input %j", async (body) => {
    const execMock = vi.fn();
    __test__.setExecFileForTest(execMock);

    const response = await post(body);

    expect(response.status).toBe(410);
    expect(response.headers.get("allow")).toBe("GET");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "hermes_projection_mutation_retired",
      authority: "crm-cc_tasks",
      mode: "read-only",
      intake: "/api/command-centre/work-packet",
    });
    expect(execMock).not.toHaveBeenCalled();
    expect(fetchIssuesByLabel).not.toHaveBeenCalled();
  });
});
