#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { BASE_SHA, CASE_IDS } from "../test/fixtures/fake-gh.mjs";
export { BASE_SHA, CASE_IDS };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export async function verifyEvidence({
  dir = process.env.MCP_RUNTIME_EVIDENCE_DIR ?? join(tmpdir(), "pi-ceo-mcp-runtime-evidence"),
  beforeClose = false,
} = {}) {
  const expected = beforeClose ? CASE_IDS.filter((id) => id !== "CLOSE-01") : CASE_IDS;
  const files = (await readdir(dir))
    .filter((name) => name.endsWith(".json") && (!beforeClose || name !== "CLOSE-01.json"))
    .sort();
  const receipts = [];
  const rawByFile = new Map();
  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf8");
    const parsed = JSON.parse(raw);
    const { receipt_sha256, ...body } = parsed;
    if (receipt_sha256 !== sha256(JSON.stringify(body))) throw new Error(`corrupt receipt: ${file}`);
    rawByFile.set(file, raw);
    receipts.push(parsed);
  }
  const ids = receipts.map((receipt) => receipt.case_id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`duplicate receipts: ${[...new Set(duplicates)].join(",")}`);
  const missing = expected.filter((id) => !ids.includes(id));
  const unexpected = ids.filter((id) => !expected.includes(id));
  if (missing.length || unexpected.length) {
    throw new Error(`receipt set mismatch; missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}`);
  }
  for (const receipt of receipts) {
    if (receipt.status !== "pass" || receipt.exit_code !== 0 || receipt.timed_out || receipt.skipped) {
      throw new Error(`failed or skipped receipt: ${receipt.case_id}`);
    }
    if (!Number.isInteger(receipt.count) || receipt.count <= 0 || !Number.isInteger(receipt.assertions) || receipt.assertions <= 0) {
      throw new Error(`zero-count receipt: ${receipt.case_id}`);
    }
    if (receipt.base_sha !== BASE_SHA) throw new Error(`stale receipt: ${receipt.case_id}`);
    if (!receipt.identity || !Array.isArray(receipt.argv) || !receipt.logs_sha256) {
      throw new Error(`incomplete receipt: ${receipt.case_id}`);
    }
  }
  const sums = files.map((file) => `${sha256(rawByFile.get(file))}  ${file}`);
  await writeFile(join(dir, "SHA256SUMS"), `${sums.join("\n")}\n`, { mode: 0o600 });
  return { count: receipts.length, ids: expected, dir: resolve(dir), sha256s: sums };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const dirIndex = process.argv.indexOf("--dir");
  const dir = dirIndex >= 0 ? process.argv[dirIndex + 1] : undefined;
  verifyEvidence({ dir, beforeClose: process.argv.includes("--before-close") })
    .then((result) => console.log(JSON.stringify({ status: "pass", ...result })))
    .catch((error) => {
      console.error(`CLOSE-01: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
