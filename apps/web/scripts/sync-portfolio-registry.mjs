#!/usr/bin/env node

/**
 * Nexus 2.0 — Portfolio registry sync (UNI-2297)
 *
 * Copies the portfolio SSOT (repo-root `.portfolio/PORTFOLIO.yaml`) to an
 * in-tree location (`data/command-centre/portfolio.yaml`) so it is inside
 * apps/web's output-file-tracing root and ships in the Vercel lambda bundle.
 * The root YAML sits two levels above apps/web and is NEVER traced into the
 * serverless bundle, so reading it directly ENOENTs in production.
 *
 * Runs as part of `prebuild`. Fails loudly if the SSOT is missing — a build
 * without the registry would silently blank the Mission Control deck.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(appRoot, "..", "..", ".portfolio", "PORTFOLIO.yaml");
const target = join(appRoot, "data", "command-centre", "portfolio.yaml");
const controlPlaneSource = resolve(
  appRoot,
  "..",
  "..",
  ".portfolio",
  "CONTROL-PLANE.v1.json",
);
const controlPlaneTarget = join(
  appRoot,
  "data",
  "command-centre",
  "control-plane.v1.json",
);

if (!existsSync(source)) {
  console.error(`✖ sync-portfolio-registry: SSOT not found at ${source}`);
  console.error(
    "  The command-centre registry derives from .portfolio/PORTFOLIO.yaml (UNI-2297).",
  );
  console.error(
    "  Refusing to build without it — the deck would ship with an empty registry.",
  );
  process.exit(1);
}

if (!existsSync(controlPlaneSource)) {
  console.error(
    `✖ sync-portfolio-registry: control-plane registry not found at ${controlPlaneSource}`,
  );
  console.error(
    "  Refusing to build without the fail-closed repository and device identity contract.",
  );
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
copyFileSync(controlPlaneSource, controlPlaneTarget);
console.log(`✓ sync-portfolio-registry: copied ${source} → ${target}`);
console.log(
  `✓ sync-portfolio-registry: copied ${controlPlaneSource} → ${controlPlaneTarget}`,
);
