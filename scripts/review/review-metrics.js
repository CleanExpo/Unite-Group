#!/usr/bin/env node
/**
 * Review Metrics Reporter — SYN-591
 * Reads .review-metrics.jsonl and produces a trend report.
 *
 * Usage: node scripts/review/review-metrics.js [--last 30d] [--specialist security]
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const lastWindow = getArg("--last") || "30d";
const filterSpecialist = getArg("--specialist");
const metricsLog = getArg("--log") || ".review-metrics.jsonl";

// ─── Parse time window ────────────────────────────────────────────────────────
function parseWindow(window) {
  const match = window.match(/^(\d+)([dh])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const [, num, unit] = match;
  const ms = parseInt(num) * (unit === "d" ? 86400000 : 3600000);
  return ms;
}

// ─── Load entries ─────────────────────────────────────────────────────────────
function loadEntries() {
  if (!fs.existsSync(metricsLog)) {
    console.log(`No metrics log found at ${metricsLog}`);
    return [];
  }

  const windowMs = parseWindow(lastWindow);
  const cutoff = Date.now() - windowMs;

  return fs
    .readFileSync(metricsLog, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry && new Date(entry.timestamp).getTime() >= cutoff);
}

// ─── Generate report ──────────────────────────────────────────────────────────
function generateReport(entries) {
  if (entries.length === 0) {
    console.log(`No review data found for the last ${lastWindow}.`);
    return;
  }

  const total = entries.length;
  const approvals = entries.filter((e) => e.verdict === "APPROVE").length;
  const requestChanges = entries.filter((e) => e.verdict === "REQUEST_CHANGES").length;

  // Specialist frequency
  const specialistCounts = {};
  for (const entry of entries) {
    for (const specialist of entry.specialists_run || []) {
      specialistCounts[specialist] = (specialistCounts[specialist] || 0) + 1;
    }
  }

  // Finding counts by specialist
  const specialistFindings = {};
  for (const entry of entries) {
    const counts = entry.finding_counts || {};
    for (const specialist of entry.top_finding_types || []) {
      if (!specialistFindings[specialist]) {
        specialistFindings[specialist] = { total: 0, critical: 0, high: 0 };
      }
      specialistFindings[specialist].total++;
    }
  }

  // Risk tier distribution
  const tierCounts = {};
  for (const entry of entries) {
    const tier = entry.risk_tier || "unknown";
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  }

  // Format report
  console.log(`\n## Review Board Metrics — Last ${lastWindow}\n`);
  console.log(`**Total PRs reviewed:** ${total}`);
  console.log(`**Approve rate:** ${Math.round((approvals / total) * 100)}% (${approvals}/${total})`);
  console.log(`**Request Changes rate:** ${Math.round((requestChanges / total) * 100)}% (${requestChanges}/${total})\n`);

  console.log("### Verdict Distribution");
  console.log("| Verdict | Count | % |");
  console.log("|---|---|---|");
  console.log(`| APPROVE | ${approvals} | ${Math.round((approvals / total) * 100)}% |`);
  console.log(`| REQUEST_CHANGES | ${requestChanges} | ${Math.round((requestChanges / total) * 100)}% |\n`);

  console.log("### Risk Tier Distribution");
  console.log("| Tier | Count |");
  console.log("|---|---|");
  for (const [tier, count] of Object.entries(tierCounts).sort(([, a], [, b]) => b - a)) {
    console.log(`| ${tier.toUpperCase()} | ${count} |`);
  }

  console.log("\n### Specialist Run Frequency");
  console.log("| Specialist | Times Run |");
  console.log("|---|---|");
  for (const [specialist, count] of Object.entries(specialistCounts).sort(([, a], [, b]) => b - a)) {
    if (!filterSpecialist || specialist === filterSpecialist) {
      console.log(`| ${specialist} | ${count} |`);
    }
  }

  console.log("\n_Metrics source: .review-metrics.jsonl_");
}

const entries = loadEntries();
generateReport(entries);
