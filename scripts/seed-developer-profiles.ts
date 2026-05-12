// scripts/seed-developer-profiles.ts
// Run with: npx tsx scripts/seed-developer-profiles.ts
// Idempotent — uses upsert on primary_email.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, serviceKey);

interface DeveloperProfileSeed {
  display_name: string;
  primary_email: string;
  git_author_emails: string[];
  github_login: string;
  onepassword_vault: string;
  role: string;
  country: string;
  timezone: string;
  hired_at: string;
  active: boolean;
  notes: string;
}

async function main(): Promise<void> {
  const profiles: DeveloperProfileSeed[] = [
    {
      display_name: "Rana Muzamil",
      primary_email: "ranamuzamil1199@gmail.com",
      git_author_emails: ["ranamuzamil1199@gmail.com"],
      github_login: "rana-muzamil", // confirm via gh api users/rana-muzamil — adjust if wrong
      onepassword_vault: "Developers",
      role: "contract-engineer",
      country: "PK",
      timezone: "Asia/Karachi",
      hired_at: "2025-11-01", // approximate — fix when 1Password tracks the start date
      active: true,
      notes: "Pakistan-based; primary repos: CCW-CRM (712 commits), CARSI (18 commits)",
    },
  ];

  for (const p of profiles) {
    const { error } = await sb
      .from("developer_profile")
      .upsert(p, { onConflict: "primary_email" });
    if (error) {
      console.error(`upsert ${p.primary_email} failed:`, error);
      process.exit(1);
    }
    console.log(`OK ${p.display_name} (${p.primary_email})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
