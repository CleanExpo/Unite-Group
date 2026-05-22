import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260523103000_crm_contacts_opportunities.sql",
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("CRM contacts/opportunities migration draft", () => {
  it("creates canonical contacts with identity, privacy, consent, and safe service-role access", () => {
    const sql = readMigration();

    expect(sql).toContain("create table if not exists public.crm_contacts");
    expect(sql).toContain("display_name text not null");
    expect(sql).toContain("primary_email text");
    expect(sql).toContain("linked_lead_id uuid references public.crm_leads(id) on delete set null");
    expect(sql).toContain("privacy_scope text not null default 'lead_scoped'");
    expect(sql).toContain("marketing_consent boolean not null default false");
    expect(sql).toContain("additional_data jsonb not null default '{}'::jsonb");
    expect(sql).toContain("constraint crm_contacts_status_check check");
    expect(sql).toContain("constraint crm_contacts_privacy_scope_check check");
    expect(sql).toContain("alter table public.crm_contacts enable row level security");
    expect(sql).toContain("create policy crm_contacts_service_role_all");
    expect(sql).toContain("create index if not exists crm_contacts_dedupe_email_key_idx");
  });

  it("creates opportunities as forecast-only pipeline records with approval guard fields", () => {
    const sql = readMigration();

    expect(sql).toContain("create table if not exists public.crm_opportunities");
    expect(sql).toContain("stage text not null default 'new_signal'");
    expect(sql).toContain("status text not null default 'open'");
    expect(sql).toContain("value_amount numeric");
    expect(sql).toContain("probability integer");
    expect(sql).toContain("linked_contact_id uuid references public.crm_contacts(id) on delete set null");
    expect(sql).toContain("approval_required boolean not null default false");
    expect(sql).toContain("approval_status text not null default 'not_required'");
    expect(sql).toContain("constraint crm_opportunities_stage_check check");
    expect(sql).toContain("constraint crm_opportunities_probability_check check");
    expect(sql).toContain("alter table public.crm_opportunities enable row level security");
    expect(sql).toContain("create policy crm_opportunities_service_role_all");
    expect(sql).toContain("create index if not exists crm_opportunities_stage_idx");
  });

  it("documents sandbox-first and non-production safety boundaries in the migration itself", () => {
    const sql = readMigration();

    expect(sql).toContain("Draft-only CRM contacts/opportunities schema");
    expect(sql).toContain("Apply to sandbox first via scripts/sandbox-wizard.sh");
    expect(sql).toContain("not billing truth");
    expect(sql).toContain("No secrets, tokens, payment details, unapproved sensitive PII, or cross-client notes belong in additional_data");
  });
});
