import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const proposalPath = join(
  process.cwd(),
  "docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql",
);

function readProposal(): string {
  return readFileSync(proposalPath, "utf8");
}

describe("tasks & voice_command_sessions sandbox migration proposal", () => {
  it("proposal file exists at the expected docs path", () => {
    expect(existsSync(proposalPath)).toBe(true);
  });

  describe("sandbox-only safety language", () => {
    it("declares sandbox-first intent", () => {
      const sql = readProposal();
      expect(sql).toMatch(/sandbox[- ]first/i);
    });

    it("references sandbox-wizard apply script", () => {
      const sql = readProposal();
      expect(sql).toContain("scripts/sandbox-wizard.sh");
    });

    it("requires Board approval for production promotion", () => {
      const sql = readProposal();
      expect(sql).toMatch(/board\s+approval/i);
    });

    it("does not claim production / prod / live has been applied", () => {
      const sql = readProposal().toLowerCase();
      expect(sql).not.toContain("production applied");
      expect(sql).not.toContain("prod applied");
      expect(sql).not.toContain("live in production");
    });
  });

  describe("no destructive operations", () => {
    it("does not contain destructive DDL", () => {
      const sql = readProposal().toLowerCase();
      const destructivePatterns = [
        /drop\s+table/,
        /drop\s+column/,
        /truncate\s+table/,
        /alter\s+column\s+\w+\s+type/,
        /alter\s+column\s+\w+\s+set\s+not\s+null/,
        /rename\s+to/,
      ];

      for (const pattern of destructivePatterns) {
        expect(sql).not.toMatch(pattern);
      }
    });
  });

  describe("tasks table proposal", () => {
    it("creates tasks table with idempotent DDL", () => {
      const sql = readProposal().toLowerCase();
      expect(sql).toContain("create table if not exists public.tasks");
    });

    it("includes all route-required columns", () => {
      const sql = readProposal();
      const requiredColumns = [
        "workspace_id",
        "title",
        "description",
        "status",
        "priority",
        "assignee_type",
        "assignee_name",
        "tags",
        "position",
        "obsidian_path",
        "obsidian_synced_at",
        "created_at",
        "updated_at",
      ];
      for (const col of requiredColumns) {
        expect(sql).toContain(col);
      }
    });

    it("defines indexes for workspace, status, priority, and updated_at", () => {
      const sql = readProposal();
      expect(sql).toMatch(/create index if not exists \w+tasks\w*workspace/i);
      expect(sql).toMatch(/create index if not exists \w+tasks\w*status/i);
      expect(sql).toMatch(/create index if not exists \w+tasks\w*priority/i);
      expect(sql).toMatch(/create index if not exists \w+tasks\w*updated_at/i);
    });

    it("enables row level security", () => {
      const sql = readProposal();
      expect(sql).toMatch(/alter table public\.tasks enable row level security/i);
    });

    it("notes that RLS policies must be validated in sandbox before prod", () => {
      const sql = readProposal();
      expect(sql).toMatch(/polic(y|ies)[\s\S]{0,120}sandbox/i);
    });
  });

  describe("voice_command_sessions table proposal", () => {
    it("creates voice_command_sessions table with idempotent DDL", () => {
      const sql = readProposal().toLowerCase();
      expect(sql).toContain("create table if not exists public.voice_command_sessions");
    });

    it("includes all route-required columns", () => {
      const sql = readProposal();
      const requiredColumns = [
        "org_id",
        "user_id",
        "transcript",
        "parsed_intent",
        "created_task_id",
        "created_at",
        "updated_at",
      ];
      for (const col of requiredColumns) {
        expect(sql).toContain(col);
      }
    });

    it("references tasks(id) with on delete set null for created_task_id", () => {
      const sql = readProposal();
      expect(sql).toMatch(/created_task_id[\s\S]{0,80}references public\.tasks\(id\)[\s\S]{0,40}on delete set null/i);
    });

    it("defines indexes for org_id, user_id, and created_at", () => {
      const sql = readProposal();
      expect(sql).toMatch(/create index if not exists \w+voice_command_sessions\w*org/i);
      expect(sql).toMatch(/create index if not exists \w+voice_command_sessions\w*user/i);
      expect(sql).toMatch(/create index if not exists \w+voice_command_sessions\w*created_at/i);
    });

    it("enables row level security", () => {
      const sql = readProposal();
      expect(sql).toMatch(/alter table public\.voice_command_sessions enable row level security/i);
    });

    it("notes that RLS policies must be validated in sandbox before prod", () => {
      const sql = readProposal();
      expect(sql).toMatch(/voice_command_sessions[\s\S]{0,500}sandbox/i);
    });
  });
});
