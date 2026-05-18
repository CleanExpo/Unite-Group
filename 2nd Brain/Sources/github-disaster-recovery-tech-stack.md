---
title: "disaster-recovery Tech Stack"
source: "https://github.com/CleanExpo/DR-Sandbox"
repo: "CleanExpo/DR-Sandbox"
file_type: "tech-stack"
captured: "2026-05-18"
tags:
  - clippings
  - github
  - dr-sandbox
---

# disaster-recovery — Tech Stack

## package.json
```
{
  "name": "dr-sandbox",
  "version": "0.1.0",
  "private": true,
  "description": "Safe experimentation space for Disaster Recovery work, isolated from disasterrecovery.com.au production.",
  "repository": {
    "type": "git",
    "url": "https://github.com/CleanExpo/DR-Sandbox.git"
  },
  "type": "module",
  "scripts": {
    "hello": "echo 'DR-Sandbox is alive.'",
    "council": "tsx experiments/council/run.ts",
    "autoresearch": "tsx experiments/autoresearch-lite/runner.ts",
    "score": "tsx scorer/baseline.ts",
    "proposals": "tsx generator/proposals.ts",
    "expand": "tsx expander/run.ts",
    "watch": "tsx watcher/run.ts",
    "voice:server": "tsx voice/server.ts",
    "sync:linear-ids": "tsx scripts/sync-pi-dev-ops-linear-ids.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@vitest/coverage-v8": "^4.1.4",
    "fast-glob": "^3.3.3",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^4.1.4"
  },
  "engines": {
    "node": ">=20"
  }
}
```
