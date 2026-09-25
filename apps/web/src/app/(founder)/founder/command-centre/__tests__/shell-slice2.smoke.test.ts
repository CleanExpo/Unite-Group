// src/app/(founder)/founder/command-centre/__tests__/shell-slice2.smoke.test.ts
//
// UNI-2339 slice 2 — canvas migration regression gate. Source-contract style
// (mirrors shell-slice1.smoke.test.ts): the pages are Server Components with
// async data loaders, so they are asserted against their source. Covers the
// Operate launch-pad, the read-only PipelineBoard revival, the Approvals
// (Task Queue) + Agent fleet migration, the deck-ground flip, and the
// contrast pins for every token the flip re-points.
//
// UNI-2378 (calm cockpit): the dense tiles relocated wholesale onto four
// sub-routes (operations / portfolio / providers / knowledge). Assertions
// follow the tiles to their new page sources — none are weakened.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const dir = join(process.cwd(), 'src/app/(founder)/founder/command-centre');
const pageSrc = readFileSync(join(dir, 'page.tsx'), 'utf8');
const founderDeskSrc =
  readFileSync(join(dir, 'FounderDesk.tsx'), 'utf8') +
  readFileSync(join(dir, 'MissionControlShell.tsx'), 'utf8');
const operationsSrc =
  readFileSync(join(dir, 'operations/page.tsx'), 'utf8') +
  readFileSync(join(dir, 'operations/OperationsView.tsx'), 'utf8');
const portfolioSrc =
  readFileSync(join(dir, 'portfolio/page.tsx'), 'utf8') +
  readFileSync(join(dir, 'portfolio/PortfolioView.tsx'), 'utf8');
const providersSrc =
  readFileSync(join(dir, 'providers/page.tsx'), 'utf8') +
  readFileSync(join(dir, 'providers/ProvidersView.tsx'), 'utf8');
const knowledgeSrc =
  readFileSync(join(dir, 'knowledge/page.tsx'), 'utf8') +
  readFileSync(join(dir, 'knowledge/KnowledgeView.tsx'), 'utf8');
const shellCss = readFileSync(join(dir, 'shell.module.css'), 'utf8');
const deckCss = readFileSync(join(dir, 'command-deck.module.css'), 'utf8');
const stepsCss = readFileSync(join(dir, 'CommandSteps.module.css'), 'utf8');
const boardSrc = readFileSync(
  join(
    process.cwd(),
    'src/components/command-centre/pipeline/PipelineBoard.tsx',
  ),
  'utf8',
);
const hubSrc = readFileSync(
  join(process.cwd(), 'src/components/founder/dashboard/HubStatusWidget.tsx'),
  'utf8',
);
const coachSrc = readFileSync(
  join(process.cwd(), 'src/components/founder/dashboard/CoachBriefs.tsx'),
  'utf8',
);

const allPageSources = [
  pageSrc,
  operationsSrc,
  portfolioSrc,
  providersSrc,
  knowledgeSrc,
];
const routeManifest = readFileSync(
  join(process.cwd(), 'src/lib/navigation/mission-control.ts'),
  'utf8',
);

describe('command-centre shell slice 2 — canvas migration regression gate', () => {
  it('renders the Operate launch-pad from the static BUSINESSES registry (no invented fields)', () => {
    expect(portfolioSrc).toContain(
      "import { BUSINESSES } from '@/lib/businesses'",
    );
    expect(portfolioSrc).toContain('id="operate-launch-pad"');
    expect(portfolioSrc).toContain('{BUSINESSES.map((business) =>');
    // The registry has no purpose/description field — the tile shows only
    // name, type · status and the repo link. No other business copy exists.
    expect(portfolioSrc).toContain('{business.name}');
    expect(portfolioSrc).toContain('{business.type} · {business.status}');
    expect(portfolioSrc).toContain('href={business.repoUrl}');
  });

  it('revives PipelineBoard READ-ONLY: server-side read model, no mutation handler wired', () => {
    expect(portfolioSrc).toContain(
      "import { PipelineBoard } from '@/components/command-centre/pipeline/PipelineBoard'",
    );
    expect(portfolioSrc).toContain(
      "import { loadPipelineOpportunities } from '@/lib/command-centre/pipeline-opportunities'",
    );
    expect(portfolioSrc).toContain('id="pipeline"');
    // Read-only contract: the board's only interactive prop is never passed
    // (the '=' matters — the page comment names the prop to explain why not).
    expect(portfolioSrc).not.toContain('onSelectOpportunity=');
    // Honest provenance: the badge label names the system of record.
    expect(portfolioSrc).toContain('sourceLabel="crm_opportunities"');
  });

  it('keeps Approvals and the fail-closed portfolio control plane on the canvas register', () => {
    // Heads carry the glass chrome; ids stay (relocated to the operations deck).
    for (const id of ['task-queue', 'agent-fleet']) {
      expect(operationsSrc).toContain(
        '${shell.canvasScope} ${shell.glassSectionHead}',
      );
      expect(operationsSrc).toContain(`id="${id}"`);
    }
    // The portfolio tile owns the agent-fleet slot (#1079); it remains read-only.
    expect(operationsSrc).toContain('<QueueBoard />');
    expect(operationsSrc).toContain('<PortfolioControlPlaneTile />');
    // UNI-2760: the mesh heartbeat tile returns only as unverified diagnostic
    // detail under its own id AFTER the control plane — never in the
    // agent-fleet slot the signed control plane owns.
    const fleetSlot = operationsSrc.indexOf('id="agent-fleet"');
    const controlPlane = operationsSrc.indexOf('<PortfolioControlPlaneTile />');
    const meshSlot = operationsSrc.indexOf('id="mesh-fleet"');
    const meshTile = operationsSrc.indexOf('<MeshFleetTile />');
    expect(fleetSlot).toBeGreaterThan(-1);
    expect(controlPlane).toBeGreaterThan(fleetSlot);
    expect(meshSlot).toBeGreaterThan(controlPlane);
    expect(meshTile).toBeGreaterThan(meshSlot);
    expect(operationsSrc.split('<MeshFleetTile />').length).toBe(2);
  });

  it('leaves no section on the retired light-deck head register (all five deck pages)', () => {
    for (const src of allPageSources) {
      expect(src).not.toContain('styles.sectionHead');
      expect(src).not.toContain('styles.sectionLabel');
      expect(src).not.toContain('styles.sectionCaption');
    }
  });

  it('keeps every pre-existing section anchor id intact on its relocated deck (UNI-2378)', () => {
    // Main page: the ⌘K palette anchors land on the distilled domain links.
    expect(pageSrc).toContain("import { FounderDesk } from './FounderDesk'");
    expect(pageSrc).toContain('<FounderDesk');
    for (const id of ['portfolio', 'capability-bus']) {
      expect(founderDeskSrc).toContain(`'${id}'`);
    }
    // Operations deck.
    for (const id of [
      'operations-visibility',
      'task-queue',
      'crm-autonomy',
      'agent-fleet',
      'os-health',
      'evidence-stream',
      'action-queue',
      'blocked-lanes',
      'in-progress-prs',
    ]) {
      expect(operationsSrc).toContain(`id="${id}"`);
    }
    // Portfolio deck.
    for (const id of [
      'operate-launch-pad',
      'pipeline',
      'portfolio',
      'project-integrations',
      'founder-cockpit',
    ]) {
      expect(portfolioSrc).toContain(`id="${id}"`);
    }
    // Knowledge deck.
    for (const id of ['wiki-knowledge-base', 'capability-bus']) {
      expect(knowledgeSrc).toContain(`id="${id}"`);
    }
  });

  it('links every relocated deck through the shared Mission Control navigation', () => {
    expect(pageSrc).toContain('<FounderDesk');
    for (const route of ['operations', 'portfolio', 'providers', 'knowledge']) {
      expect(routeManifest).toContain(`/${route}`);
    }
    for (const src of [
      operationsSrc,
      portfolioSrc,
      providersSrc,
      knowledgeSrc,
    ]) {
      expect(src).toContain('<MissionControlShell');
    }
    expect(founderDeskSrc).toContain('MISSION_CONTROL_ROUTES.map');
    expect(routeManifest).toContain(
      "MISSION_CONTROL_HOME = '/founder/command-centre'",
    );
  });

  it('keeps backdrop-filter guard/declaration parity in shell.module.css (perf auto-degrade)', () => {
    const supportsGuards =
      shellCss.match(
        /@supports \(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\) \{/g,
      ) ?? [];
    const backdropDecls =
      shellCss.match(/(?<!-webkit-)backdrop-filter: var\(--blur/g) ?? [];
    expect(supportsGuards.length).toBeGreaterThan(0);
    expect(backdropDecls.length).toBe(supportsGuards.length);
    // The launch tiles are deliberately solid --surface-3 (no new backdrop use).
    const tileBlock = shellCss.match(/\.launchTile \{[^}]*\}/)?.[0] ?? '';
    expect(tileBlock).toContain('background: var(--surface-3)');
    expect(tileBlock).not.toContain('backdrop-filter');
  });

  it('flips the deck ground to the canvas register (Gun Metal, not candy light)', () => {
    const deckBlock = deckCss.match(/\.deck \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(deckBlock).toContain('background-color: #0e1014');
    expect(deckBlock).not.toContain('#fffdf7');
    expect(deckBlock).not.toContain('#ffffff');
  });

  it('re-points every deck TEXT token to a computed AA pairing on the dark grounds', () => {
    // UNI-2769 Pi-Dev-Ops palette. Ratios computed against --deck-panel-hi
    // #232934 (worst-case: top of every panel gradient), --deck-panel #191e26
    // and the #0e1014 canvas. WCAG relative-luminance math, not eyeballed:
    //   --deck-text  #f4f5f7 → 13.38:1 panel-hi / 15.34:1 panel / 17.45:1 canvas
    //   --deck-muted #a7adba →  6.49:1 panel-hi /  7.43:1 panel /  8.46:1 canvas
    //   --deck-cyan-text  #ff5c77 → 4.90:1 panel-hi
    //   --deck-amber-text #ff8a1f → 6.19:1 panel-hi
    //   --deck-abort-text #f87171 → 5.28:1 panel-hi
    //   --cc-ink-hush #9aa3b1 → 5.73:1 panel-hi / 7.48:1 on --cc-bg-soft #0e1014
    expect(deckCss).toContain('--deck-text: #f4f5f7');
    expect(deckCss).toContain('--deck-muted: #a7adba');
    expect(deckCss).toContain('--deck-cyan-text: #ff5c77');
    expect(deckCss).toContain('--deck-amber-text: #ff8a1f');
    expect(deckCss).toContain('--deck-abort-text: #f87171');
    expect(deckCss).toContain('--cc-ink-hush: #9aa3b1');
    // Panels resolve from the flipped tokens — no hard-coded light card left.
    expect(deckCss).toContain('--deck-panel: #191e26');
    expect(deckCss).toContain('--deck-panel-hi: #232934');
    expect(deckCss).toContain('--cc-bg-soft: #0e1014');
    expect(deckCss).not.toContain('#fff7ec');
  });

  it('keeps dark-on-light text off the dark canvas (CommandSteps head is token-driven)', () => {
    // The 1-2-3 hero head sits directly on the deck ground; its old literals
    // (#14241b / #5a6b62) would be ~1.6:1 on #0e1014. The white step CARDS
    // below keep their own opaque ground and stay dark-on-light.
    const titleBlock = stepsCss.match(/\.title \{[^}]*\}/)?.[0] ?? '';
    const subBlock = stepsCss.match(/\.sub \{[^}]*\}/)?.[0] ?? '';
    expect(titleBlock).toContain('color: var(--deck-text');
    expect(subBlock).toContain('color: var(--deck-muted');
    expect(stepsCss).toContain('background: #ffffff');
  });

  it('pins the launch-tile text pairings on their solid --surface-3 ground', () => {
    // --ink #f4f5f7 on #232934 → 13.38:1; --ink-dim #a7adba → 6.49:1;
    // --green-txt #00d97e (repo link) → 7.81:1. Computed, all AA (UNI-2769).
    const nameBlock = shellCss.match(/\.launchName \{[^}]*\}/)?.[0] ?? '';
    const metaBlock = shellCss.match(/\.launchMeta \{[^}]*\}/)?.[0] ?? '';
    const linkBlock = shellCss.match(/\.launchLink \{[^}]*\}/)?.[0] ?? '';
    expect(nameBlock).toContain('color: var(--ink)');
    expect(metaBlock).toContain('color: var(--ink-dim)');
    expect(linkBlock).toContain('color: var(--green-txt)');
  });

  it('surfaces the rollup-excluded count in the pipeline head — no silent under-report (RA-1109)', () => {
    // The read model drops terminal/parked rows by design; the page must say
    // so whenever the drop is non-zero, next to the provenance label.
    expect(portfolioSrc).toContain('pipeline.excludedCount > 0');
    expect(portfolioSrc).toContain('lost/parked excluded');
  });

  it('keeps the empty-state copy honest per source — degraded never claims "connected"', () => {
    expect(boardSrc).toContain(
      'Pipeline source degraded — opportunity data unavailable.',
    );
    // The "connected" line must be the connected-empty branch, gated on source,
    // not the unconditional fallback for every empty render.
    expect(boardSrc).toMatch(
      /source === 'degraded'\s*\?\s*'Pipeline source degraded[\s\S]*?The pipeline is connected but holds no open opportunities/,
    );
  });

  it('keeps cockpit section headers readable on the deck ground (deck tokens with off-deck fallback)', () => {
    // HubStatusWidget / CoachBriefs headers sit directly on the #0e1014 deck
    // (outside their light cards, outside canvasScope). They must read the
    // deck tokens (17.11:1 / 8.60:1 on the canvas) and fall back to their
    // original colours anywhere else.
    expect(hubSrc).toContain('var(--deck-text, var(--color-text-primary))');
    expect(hubSrc).toContain('var(--deck-muted, var(--color-text-muted))');
    expect(hubSrc).toContain('var(--deck-muted, var(--color-text-disabled))');
    expect(coachSrc).toContain('var(--deck-text, #52525b)');
    expect(coachSrc).toContain('var(--deck-muted, var(--color-text-muted))');
    // The old dark-on-dark literal class must be gone from the coach header.
    expect(coachSrc).not.toContain('text-[#52525b]');
  });

  it('re-points the app-global muted ink inside canvas scope (tiles imported unchanged)', () => {
    // --color-text-muted is #5f5f66 app-wide (~2.4:1 on --surface-2); tiles
    // that use it (ActionQueue error, Blocked Lanes, In-Progress PRs) now sit
    // in canvas glass, so the scope resolves it to --ink-dim (7.18:1).
    const scopeBlock =
      shellCss.match(/\.canvasScope \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(scopeBlock).toContain('--color-text-muted: var(--ink-dim)');
  });

  it('bridges every Mission Control TEXT alias to a contrast-safe mission text shade, never a fill (UNI-2769)', () => {
    // Fills (#ff3b5c, #15803d, #a16207, #e5484d …) drop below 4.5:1 as text on the
    // raised surfaces; the --mission-*-text shades clear it on every surface.
    const bridge = deckCss.match(/\.missionTokens \{[\s\S]*?\n\}/)?.[0] ?? '';
    const textAliases = [...bridge.matchAll(/(--(?:deck-[a-z]+-text|cc-signal-text|tile-[a-z]+-txt)):\s*([^;]+);/g)];
    expect(textAliases.map(([, name]) => name).sort()).toEqual([
      '--cc-signal-text',
      '--deck-abort-text',
      '--deck-amber-text',
      '--deck-cyan-text',
      '--tile-amber-txt',
      '--tile-green-txt',
      '--tile-red-txt',
    ]);
    for (const [, name, value] of textAliases) {
      expect(`${name}: ${value}`).toMatch(/: var\(--mission-[a-z]+-text\)$/);
    }
    expect(deckCss).toContain('.missionTokens :is(.plink, .projectName) { color: var(--mission-blue-text); }');

    // No Mission Control source sets a text colour straight from a fill token.
    const fillAsText =
      /(?<![-\w])color\s*:\s*['"]?var\(\s*--(?:mission-(?:blue|danger|attention|success)|deck-(?:cyan|go|amber|abort)|cc-signal)\s*[,)]/;
    const walk = (root: string): string[] =>
      readdirSync(root, { withFileTypes: true }).flatMap((e) => {
        const p = join(root, e.name);
        if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
        return /\.(css|tsx|ts)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
      });
    const offenders = [dir, join(process.cwd(), 'src/components/command-centre')]
      .flatMap(walk)
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => ({ file, line, n: i + 1 }))
          .filter(({ line }) => fillAsText.test(line)),
      )
      .map(({ file, n }) => `${relative(process.cwd(), file)}:${n}`);
    expect(offenders).toEqual([]);

    // Status dots are fills: the email tile's dot takes the fill token, its label the text shade.
    const emailTile = readFileSync(
      join(process.cwd(), 'src/components/command-centre/email-accounts/EmailAccountsTile.tsx'),
      'utf8',
    );
    expect(emailTile).toContain("background: stateDot(p.state)");
    expect(emailTile).toContain("if (state === 'connected') return 'var(--deck-go, #2dbb57)'");

    const shellBridge = shellCss.match(/:global\(\[data-mission-control\]\) \.canvasScope \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shellBridge).toContain('--green-txt: var(--mission-success-text);');
    expect(shellBridge).toContain('--amber-txt: var(--mission-attention-text);');
  });

  it('routes INDIRECT status text (a tone value later painted as color/fg) through the text shades (UNI-2769)', () => {
    // The direct-pattern sweep above cannot see a fill token stored in a map or
    // helper and painted as text later. These pin the consumers that did that.
    const gatewayKit = readFileSync(join(dir, 'operator-gateway/_components.tsx'), 'utf8');
    const gatewayView = readFileSync(join(dir, 'operator-gateway/OperatorGatewayView.tsx'), 'utf8');
    const hermesView = readFileSync(join(dir, 'hermes-control-panel/HermesControlPanelView.tsx'), 'utf8');
    const stageBoard = readFileSync(join(dir, 'StageBoardTile.tsx'), 'utf8');

    // Operator gateway: Pill / StatCard value / group summary paint toneSwatch.fg as text.
    expect(gatewayKit).not.toMatch(/fg: 'var\(--mission-(?:blue|danger|attention|success)\)'/);
    for (const fg of ['success', 'danger', 'attention', 'blue']) {
      expect(gatewayKit).toContain(`fg: 'var(--mission-${fg}-text)'`);
    }
    // StatCard's accent border takes the fill (rail), its value the text shade (fg).
    expect(gatewayKit).toContain('borderLeft: `3px solid ${rail}`');
    // theme.ok/warn/warnAlt/bad stay fills (borders, dots and glows elsewhere);
    // every text use in the gateway goes through the *Text shades.
    expect(gatewayKit).toContain("okText: 'var(--mission-success-text)'");
    expect(gatewayKit).toContain("warnText: 'var(--mission-attention-text)'");
    expect(gatewayKit).toContain("warnAltText: 'var(--mission-attention-text)'");
    expect(gatewayKit).toContain("badText: 'var(--mission-danger-text)'");
    expect(gatewayKit + gatewayView).not.toMatch(/color: [^,}]*theme\.(?:ok|warn|warnAlt|bad)\b/);

    // Hermes control panel: okText and the risk badge text.
    expect(hermesView).toContain("const okText = 'var(--mission-blue-text)'");
    expect(hermesView).toContain("none: ['rgba(45, 187, 87, 0.12)', 'var(--mission-blue-text)',");
    expect(hermesView).toContain("low: ['rgba(244, 130, 15, 0.12)', 'var(--mission-attention-text)',");
    expect(hermesView).toContain("high: ['rgba(229, 72, 77, 0.12)', 'var(--mission-attention-text)',");
    expect(hermesView).not.toMatch(/\[[^\]]*'var\(--mission-(?:blue|danger|attention|success)\)'/);

    // Stage board: the rail keeps the fill, the stage word takes the text shade.
    expect(stageBoard).toContain("Research: 'var(--deck-cyan-text, #22d3ee)'");
    expect(stageBoard).toContain('color: STAGE_TEXT[team.stage]');
    expect(stageBoard).not.toContain('color: STAGE_COLOUR[');
  });
});
