# Project Integration Manifests -> RANA Work Packets

Date: 2026-06-16
Owner: RANA / Mission Control
Scope: metadata-only project manifests consumed by Unite-Group Command Centre

## Purpose

Project manifests let Mission Control see whether each portfolio spoke is connected, ready, mocked, blocked, or unknown. This runbook defines when a manifest row becomes a RANA takeover packet.

## Inputs

- Registry: `apps/web/data/command-centre/projects.json`
- API: `GET /api/command-centre/project-integrations`
- Manifest row fields:
  - `source`
  - `generatedAt`
  - `connections[].id`
  - `connections[].label`
  - `connections[].state`
  - `connections[].safeForMissionControl`
  - `connections[].detail`
  - `connections[].endpoint`
  - `connections[].nextAction`

## Triage Rules

- `connected`: observe/report only unless `nextAction` names a concrete gap.
- `ready`: create a candidate work packet if `safeForMissionControl=true`.
- `mock`: replace with live evidence before production work.
- `blocked`: do not execute; convert blocker into an approval, credential, or platform packet.
- `unknown` or endpoint error: create a health-check ticket, not a build takeover.

## Work Packet Mapping

- `projectName` maps to the registry project and Linear prefix.
- `connection.nextAction` becomes the packet outcome.
- `state=blocked` usually means `nextActionOwner=phill` or `external_provider`.
- Any CRM write, production write, credential request, or regulated action sets `approvalRequired=true` and `riskLevel=high`.
- Labels must use the existing packet contract:
  - `pi-dev:autonomous`
  - `mesh:auto`

## Required RANA Packet Fields

Each packet must include:

- Source manifest URL and `generatedAt` freshness.
- Exact connection `id`, `label`, and `state`.
- Evidence path or PR/route reference.
- Human approval requirement, if any.
- Forbidden data boundary: no secrets, raw email, TFNs, payment details, or regulated data.
- Validation commands from the registry.
- Stop conditions.
- Definition of done.

## First Candidates After PR #245

1. Add metadata-only manifests for RestoreAssist and Synthex.
2. Convert Dimitri-ITR `blocked` or `mock` rows into work packets only after approval routing is confirmed.
3. Add freshness and last-success requirements before treating old manifests as live work.
