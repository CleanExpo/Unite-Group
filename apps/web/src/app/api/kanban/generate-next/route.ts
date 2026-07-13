import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai/client";
import { ANTHROPIC_MODELS } from "@/lib/anthropic/models";
import {
  appendTaskEvent,
  createTaskOnce,
  type CreateTaskInput,
  type TaskPriority,
} from "@/lib/command-centre/tasks";
import { sanitiseError } from "@/lib/error-reporting";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MODEL = ANTHROPIC_MODELS.SONNET;
const PROJECT = {
  name: "Unite-Group Nexus — Mission Control",
  description:
    "A single-founder command centre that orchestrates AI agents across the Unite-Group portfolio. CRM cc_tasks is the mission authority; Hermes and Linear are read-only projections.",
};

const STAGE_INTENT: Record<string, string> = {
  today:
    "small, shippable proposals for founder review that could unblock the current session",
  hot: "urgent proposals and blockers that should be reviewed before lower-priority work",
  pipeline: "near-term proposed work for review after current work clears",
  someday: "future opportunities worth capturing without scheduling or execution",
};

interface GeneratedTask {
  title: string;
  context: string;
  acceptance: string[];
}

function parseTasks(text: string): GeneratedTask[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const array = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(array)) return [];
    return array
      .filter(
        (task): task is { title: string } =>
          Boolean(task) &&
          typeof (task as { title?: unknown }).title === "string" &&
          (task as { title: string }).title.trim().length > 0,
      )
      .map((task) => {
        const raw = task as {
          title: string;
          context?: unknown;
          acceptance?: unknown;
        };
        const acceptance = (
          Array.isArray(raw.acceptance)
            ? raw.acceptance.map((value) => String(value).trim())
            : typeof raw.acceptance === "string"
              ? [raw.acceptance.trim()]
              : []
        )
          .filter(Boolean)
          .map((value) => value.slice(0, 300))
          .slice(0, 6);
        return {
          title: raw.title.trim().slice(0, 200),
          context: String(raw.context ?? "")
            .trim()
            .slice(0, 600),
          acceptance,
        };
      })
      .slice(0, 5);
  } catch {
    return [];
  }
}

function externalRef(column: string, task: GeneratedTask): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        column,
        title: task.title.trim().toLowerCase(),
        context: task.context.trim(),
      }),
    )
    .digest("hex");
  return `generated-next:${column}:${digest}`;
}

function taskPriority(column: string): TaskPriority {
  if (column === "hot") return "P1";
  if (column === "today") return "P2";
  return "P3";
}

function taskInput(
  founderId: string,
  column: string,
  generatedAt: string,
  task: GeneratedTask,
): CreateTaskInput {
  const validationRequired = task.acceptance.length
    ? task.acceptance
    : [task.context || "Founder review confirms the proposed outcome."];
  const objective = [
    task.context || task.title,
    "",
    "## Acceptance Criteria",
    ...validationRequired.map((requirement) => `- ${requirement}`),
  ].join("\n");
  return {
    founderId,
    externalRef: externalRef(column, task),
    title: task.title,
    objective,
    projectKey: "unite-group",
    priority: taskPriority(column),
    status: "proposed",
    agentOwner: "Nexus",
    riskLevel: "medium",
    executionMode: "advisory",
    origin: "board-review",
    humanApprovalRequired: false,
    validationRequired,
    metadata: {
      nexusGeneratedNext: {
        schema: "crm.generated-next.v1",
        source: "founder-kanban-propose",
        column,
        generatedAt,
      },
      tags: ["source:founder-kanban", "nexus-generated"],
    },
  };
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let column = "today";
  let existingTitles: string[] = [];
  try {
    const body = (await request.json()) as {
      column?: string;
      existingTitles?: string[];
    };
    if (body.column && STAGE_INTENT[body.column]) column = body.column;
    if (Array.isArray(body.existingTitles)) {
      existingTitles = body.existingTitles
        .slice(0, 40)
        .map((title) => String(title).slice(0, 120));
    }
  } catch {
    // Safe defaults retain proposal-only behavior.
  }

  const prompt = [
    `Project: ${PROJECT.name}`,
    `What it does: ${PROJECT.description}`,
    "",
    `Generate the NEXT CRM proposals for the "${column.toUpperCase()}" review stage.`,
    `Stage intent: ${STAGE_INTENT[column]}.`,
    existingTitles.length
      ? `Already visible — do not duplicate:\n- ${existingTitles.join("\n- ")}`
      : "No existing titles were supplied.",
    "",
    "Propose 3–5 bounded, verifiable tasks. Nothing is queued or sent to Hermes or Linear by this operation.",
    'Return ONLY JSON: [{"title":"…","context":"…","acceptance":["…"]}]',
  ].join("\n");

  let text: string;
  try {
    const response = await getAIClient().messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, "AI generation failed") },
      { status: 502 },
    );
  }

  const tasks = parseTasks(text);
  if (tasks.length === 0) {
    return NextResponse.json(
      { error: "The model did not return usable proposals — try again." },
      { status: 502 },
    );
  }

  const generatedAt = new Date().toISOString();
  const created: Array<{ id: string; title: string; status: "proposed" }> = [];
  const skippedExisting: Array<{
    id: string;
    title: string;
    status: "proposed";
  }> = [];
  const failures: Array<{ title: string; error: "persistence_failed" }> = [];

  for (const task of tasks) {
    try {
      const result = await createTaskOnce(
        taskInput(user.id, column, generatedAt, task),
      );
      const summary = {
        id: result.task.id,
        title: result.task.title,
        status: "proposed" as const,
      };
      if (!result.created) {
        skippedExisting.push(summary);
        continue;
      }
      await appendTaskEvent({
        founderId: user.id,
        taskId: result.task.id,
        type: "created",
        actor: "nexus",
        payload: {
          source: "founder-kanban-propose",
          column,
          mode: "proposal-only",
        },
      });
      created.push(summary);
    } catch {
      failures.push({ title: task.title, error: "persistence_failed" });
    }
  }

  if (created.length === 0 && skippedExisting.length === 0) {
    return NextResponse.json(
      {
        error: "crm_persistence_failed",
        generated: tasks.length,
        failures,
        linearCreated: 0,
        hermesCreated: 0,
      },
      { status: 500 },
    );
  }

  const partial = failures.length > 0;
  return NextResponse.json(
    {
      source: "crm-cc_tasks",
      authority: "cc_tasks",
      mode: "crm-proposal-only",
      column,
      generated: tasks.length,
      createdCount: created.length,
      skippedExistingCount: skippedExisting.length,
      failedCount: failures.length,
      partial,
      created,
      skippedExisting,
      failures,
      reviewPath: "/founder/command-centre",
      linearCreated: 0,
      hermesCreated: 0,
    },
    {
      status: partial ? 207 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export const __test__ = { parseTasks, externalRef, taskInput };
