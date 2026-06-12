---
type: wiki
updated: 2026-05-14
---

# Command Center — External Reference Survey (2026-05-14)

Visual reference for the Unite-Group CEO Command Center redesign. Pure visual reference — no code proposals. Brand constraint: Gun Metal #1a1a1a + Candy Red #dc143c, custom geometric marks (no Lucide), real-data density (no AI-slop gradient hero or glass-morphism).

---

## Category 1 — Mission Control / Military C2

### 1.1 NASA Christopher C. Kraft Mission Control Center (MCC-21 / Houston)
- Source: https://en.wikipedia.org/wiki/Christopher_C._Kraft_Jr._Mission_Control_Center
- Layout primer: https://www.loc.gov/resource/hhh.tx1182.sheet/?sp=3 (Library of Congress floor plan — public domain)
- Big-Boards explainer: https://apollo11space.com/how-mission-controls-big-displays-worked-a-look-at-nasas-big-boards/
- Recent MCC-21 / Artemis Science Evaluation Room: https://www.nasa.gov/blogs/missions/2025/06/13/nasas-artemis-science-team-inaugurates-flight-control-room/
- Visual primitives: rows-of-consoles facing a single shared "world view" projection wall; per-role console retains a private flat-panel cluster; SER adopts a touchscreen "scrum table" centre with U-shape "trench" of specialists behind. Heritage colour cue: subdued ambient room light, glow comes from the screens, never overheads.
- Unite-Group remix: top-strip "world view" tile (portfolio-wide live status) above per-business console-tiles; one focal projection per session, never two competing focal points.

### 1.2 SpaceX Crew Dragon flight-control surface
- Cockpit-side UI breakdown: https://www.shanemielke.com/work/spacex/crew-dragon-displays/
- Recreation case study: https://uxdesign.cc/how-i-recreated-crew-dragons-ui-15877eddf3ed
- Recreation deep-dive: https://dillonbaird.io/articles/mutantdragon/
- Visual primitives: pure black background + single-accent (white/cyan); side-menu spine, top status strip, central 3D globe with live trajectory line; the SAME code runs on the ground console — flight crew and ground crew see the identical surface. Typography is geometric sans, fractional/decimal data uses fixed-width digits.
- Unite-Group remix: single live 3D/2D portfolio map as the focal centre; CEO and any senior agent dashboard look identical — operator/observer parity.

### 1.3 US Navy Combat Information Center (CIC)
- Wikipedia anchor: https://en.wikipedia.org/wiki/Combat_information_center
- JHU APL "CIC of the Future" paper: https://secwww.jhuapl.edu/techdigest/content/techdigest/pdf/V35-N02/35-02-Reggia.pdf
- USS Oklahoma City interior: https://www.okieboat.com/CIC.html
- Visual primitives: low ambient light + green-phosphor screens; PPI radar (polar plot with own-ship at centre, contacts as vectors); separate-but-aligned plots (surface vs air) that can be union-merged; vertical plotting board with hand-written reverse-text. Stations grouped by warfare function (surface / air / EW) physically clustered.
- Unite-Group remix: portfolio "PPI" — concentric rings = time-horizon (today / this week / this month), vectors = pipeline items moving toward closure. The radial pulse is more legible than a Kanban for "what's incoming".

### 1.4 Air-traffic control surface
- FAA color palette standard (PDF): https://hf.tc.faa.gov/publications/2010-moving-toward-an-air-traffic-control-display-standard/full_text.pdf
- TC-FAA guidelines: https://www.tc.faa.gov/its/worldpac/techrpt/ar99-52.pdf
- EIZO ATC monitor specs (visual ref): https://www.eizoglobal.com/solutions/atc/
- Visual primitives: green = ambient/un-owned traffic, white = "mine / owned", red = alert (CA/LA), blinking red reserved for collision-imminent. Datablock = compact 3-line tag attached to an icon (callsign / altitude / speed). Background is near-black; every pixel of colour means something.
- Unite-Group remix: portfolio "datablock" attached to every business tile — name / KPI / delta — pinned to a moving dot on a timeline plane.

---

## Category 2 — Financial trading floors

### 2.1 Bloomberg Terminal
- Bloomberg engineering on hiding complexity: https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/
- Accessibility colour palette: https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/
- HN deep thread (operator perspective): https://news.ycombinator.com/item?id=19153875
- VS Code "Berg" theme port: https://github.com/jx22/berg
- Visual primitives: amber-on-black + cyan-on-black heritage palette; Matthew Carter-commissioned proprietary monospace with finance-specific glyphs (1/64 fraction marks, basis-point sigils); 4-panel grid heritage now tabbed; the four-letter command bar (`EQS<GO>`, `TOP<GO>`) is the navigation — UI is text-first, mouse-second. Sub-second click-to-data latency is the design KPI.
- Unite-Group remix: command-palette FIRST (Cmd-K) — keyboard always faster than mouse; monospace tabular numerals everywhere a number lives; tile colour is information, never decoration.

### 2.2 Refinitiv Eikon / LSEG Workspace
- Eikon developer App Studio: https://docs-developers.refinitiv.com/1566285590353/73368/book/en/sections/introduction/2-introduction-app-studio.html
- Charcoal vs Pearl theme system (Eikon design guide reference): https://www.refinitiv.com/en/products/eikon-trading-software/eikon-app-api-innovation/eikon-data-api
- Visual primitives: two named themes only — Charcoal (default, dark) + Pearl (paper); app library with consistent chrome so every third-party app feels native; widget-as-app composition.
- Unite-Group remix: one theme only — Gun Metal — but the "every-tile-is-an-app" composition pattern is gold for a portfolio holding-company surface.

### 2.3 Interactive Brokers TWS / IEX trader-style terminals
- IB TWS hotkey grid: https://www.ibkrguides.com/traderworkstation/hot-keys.htm
- Hot-key configuration lesson: https://www.interactivebrokers.com/campus/trading-lessons/configuring-tws-hotkeys/
- Visual primitives: every order action mappable to a single keystroke; status colour-flag per row (working / filled / cancelled / partial); blotter is a paginated grid with frozen header columns.
- Unite-Group remix: full keyboard map overlay (press `?` to reveal) for every primary CEO action.

---

## Category 3 — Enterprise observability / SOC

### 3.1 Datadog (dark-mode dashboards)
- Dark-mode launch: https://www.datadoghq.com/blog/introducing-datadog-darkmode/
- Navigation redesign: https://www.datadoghq.com/blog/datadog-navigation-redesign/
- Visual primitives: high-contrast left rail, hue-encoded service tiles, dense small-multiples on the same time axis, "live tail" log ticker pinned to the bottom of every screen. Failure mode: default rainbow service-colour palette = visual noise.
- Unite-Group remix: ADOPT the time-axis-aligned small-multiples + the bottom live ticker. REJECT the rainbow palette — single accent only.

### 3.2 Splunk Enterprise Security 8 — SOC Operations
- SOC Operations dashboard: https://help.splunk.com/en/splunk-enterprise-security-8/user-guide/8.0/analytics/soc-operations-dashboard
- ES 7.0 redesign notes: https://www.splunk.com/en_us/blog/security/refined-user-experience-new-executive-visibility-and-enhanced-cloud-monitoring-with-splunk-enterprise-security-7-0.html
- Dashboard catalogue: https://help.splunk.com/en/splunk-enterprise-security-8/user-guide/8.0/analytics/available-dashboards-in-splunk-enterprise-security
- Visual primitives: KPI strip across the top (new / active / closed); MTTA / MTTC mean-time numbers stamped large; severity columns coloured but with shape redundancy (circle / triangle / diamond) for colour-blind safety.
- Unite-Group remix: copy the KPI-strip-across-the-top pattern — Pipeline / Cash / Bots-Up / Health-Score / Burn — same fixed 5 slots, always.

### 3.3 Microsoft Sentinel — investigation graph
- Investigation graph docs: https://learn.microsoft.com/en-us/azure/sentinel/investigate-incidents
- Overview dashboard deep-dive: https://techcommunity.microsoft.com/blog/microsoftsentinelblog/deep-dive-into-microsoft-sentinel%E2%80%99s-new-overview-dashboard/3860688
- SOC-metric guidance: https://learn.microsoft.com/en-us/azure/sentinel/manage-soc-with-incident-metrics
- Visual primitives: node-edge graph view of entities (user → host → IP → alert) with severity-tinted nodes and active connection lines that animate when data flows; one-click drill from node to raw evidence.
- Unite-Group remix: portfolio relationship graph — businesses as nodes, shared customers / shared tooling / capital flows as edges. Replaces the static "5 cards in a row" layout that hides cross-business reality.

### 3.4 Palantir Gotham / Foundry
- Gotham platform overview: https://www.palantir.com/platforms/gotham/
- Foundry analytical dashboards: https://www.palantir.com/docs/foundry/analytics/dashboards
- Workshop layout primitives: https://www.palantir.com/docs/foundry/workshop/concepts-layouts
- Visual primitives: ontology-first navigation (every screen pivots from the same canonical object model); Workshop's left-rail + tabbed canvas + right-panel-detail is the durable 3-pane pattern. Heavy use of small map insets, multi-entity stacked timelines, and "graph of everything" canvases.
- Unite-Group remix: portfolio "ontology" — the underlying object graph is shared (Business → Project → Mandate → Agent → Incident) and every surface is a different facet of that one model.

### 3.5 Grafana custom dashboards + Astro UXDS theme
- Astro UXDS Grafana theme plugin: https://github.com/RocketCommunicationsInc/grafana-theme
- Astro Grafana plugin (marketplace): https://grafana.com/grafana/plugins/rocketcom-astrotheme-panel/
- Visual primitives: composable panel grid with per-panel time-range overrides, alert annotations rendered as vertical "now / event" lines across every time series simultaneously, threshold bands shaded behind line charts.
- Unite-Group remix: "annotation lines" across the top-level KPI strip — a stripe drops vertically through every chart at the moment of a board decision, deploy, or incident.

---

## Category 4 — CRM-specialised Command Centers

### 4.1 Salesforce Genie / Customer 360
- Service Console + Genie: https://www.salesforceben.com/service-cloud-genie/
- Real-time CRM announcement: https://www.salesforce.com/news/press-releases/2022/09/20/genie-news/
- Headless 360 (workflow inlines into Slack/Teams/WhatsApp): https://www.salesforce.com/news/stories/salesforce-headless-360-announcement/
- Visual primitives: customer-360 = single record canvas with surrounding context strips (interactions, predicted next action, engagement feed); "real-time" badge per data source; Einstein Next-Best-Action card always pinned top-right.
- Unite-Group remix: "Business-360" canvas — each portfolio business gets the same record shape, including a Next-Best-Action card the Pi-CEO Board fills.

### 4.2 Gainsight Customer 360 + Scorecards
- Scorecard documentation: https://support.gainsight.com/gainsight_nxt/05Scorecards/03User_Guides/View_and_Update_Scorecards_in_360
- C360 overview: https://www.gainsight.com/customer-success/customer-360-health/
- Quantifying scorecards: https://www.gainsight.com/blog/scorecards-quantifying-customer-health/
- Visual primitives: encircled current-score + trend arrow (up / flat / down) — the score-arrow pairing is the single most repeated primitive across all of CS-ops; RYG (red-yellow-green) shape-coded for accessibility; "measure groups" that roll-up to overall score with drill-down.
- Unite-Group remix: every Business tile carries an encircled health score + trend arrow. Roll-up: Empire health = weighted business healths. Drill: click the score → which measure caused the move.

### 4.3 Linear (modern ops-ish CRM aesthetic)
- Redesign retrospective: https://linear.app/now/how-we-redesigned-the-linear-ui
- Linear-style design analysis: https://blog.logrocket.com/ux-design/linear-design/
- Theme system: https://linear.app/changelog/2020-12-04-themes
- Visual primitives: near-black background, Inter sans, three-variable theme (base / accent / contrast) generated in LCH; status-pill + assignee-avatar + cycle-bar as the canonical row primitive; `Cmd-K` everywhere; micro-motion only — never decorative animation. Information density via tight 14-15px text and 1-line rows.
- Unite-Group remix: LCH theme generation locked to Gun Metal + Candy Red; row primitive (status-pill + owner-avatar + delta-spark) reused across every list surface.

### 4.4 HubSpot Operations Hub + Pipedrive Insights
- HubSpot dashboards: https://www.hubspot.com/products/operations
- Pipedrive Insights: https://www.pipedrive.com/en/features/insights-and-reports
- Visual primitives: pipeline column-board (deal cards moving horizontally between stages) with weighted column totals at top — the canonical "sales-stage" surface. Pipedrive specifically uses a single horizontal motion line, not Kanban-style vertical cards.
- Unite-Group remix: client-onboarding 7-stage column board, dropping straight out of `playbook_client_onboarding_7stage.md`.

### 4.5 Height (CRM/Project hybrid)
- Height.app: https://height.app
- Visual primitives: tableau-density flat list + inline edit, plus AI-as-a-row-action (e.g. an agent badge attached to a task) — closest existing reference to "agent-shipped this".

---

## Category 5 — Cinematic / FUI (the wow-factor layer)

### 5.1 Jayse Hansen — Iron Man HUD, Avengers, Hunger Games, Star Wars
- Portfolio: https://jayse.tv/v2/ and https://jayse.io/
- Iron Man HUD work specifically: https://jayse.tv/v2/?portfolio=hud-2-2
- The Next Web interview: https://thenextweb.com/news/jayse-hansen-on-creating-tools-the-avengers-use-to-fight-evil-touch-interfaces-and-project-glass
- VFX blog oral history of Iron Man HUD: https://vfxblog.com/ironman/
- Sci-fi interfaces HUD breakdown: https://scifiinterfaces.com/2015/07/01/iron-man-hud-a-breakdown/
- Visual primitives: radial / circular diagnostic widget as a "Swiss-army knife" that expands and collapses by tier; reticle as a functional lens; dual-mode radar (2D synthetic-aperture vs 3D detail); design rule — graphics enhance the actor (or in our case the operator) rather than distract.
- Unite-Group remix: a radial expander widget for "tier of detail" (1-click expands the business tile from KPI-only → full instrument panel). The "graphics serve the operator" rule is the brand-guardian test for every motion decision.

### 5.2 Mark Coleran — Tomb Raider, Bourne, MI:3, The Island, Westworld S4
- Behance: https://www.behance.net/markcoleran
- Coleran.com FUI gallery: http://coleran.com/gallery-category/fui/
- Pushing Pixels interview: https://www.pushing-pixels.org/2021/12/21/pragmatic-futurism-and-screen-graphics-interview-with-mark-coleran.html
- Westworld S4 phones: https://www.behance.net/gallery/150001421/Westworld-s4-Phones
- Visual primitives: "pragmatic futurism" — every element looks like it COULD work; thin stroke weights (0.5-1px hairlines), tiny labels, generous negative space, dense corner annotations / index numbers. Coleran coined "FUI" and his stencil/tick-mark vocabulary is the genre's default.
- Unite-Group remix: hairline strokes for tile borders, corner index labels (e.g. `01 / DR`, `02 / RA`) in monospace caps — earns the "this is real ops, not a SaaS template" feel.

### 5.3 Chris Kieffer — Westworld FUI
- Personal site: https://www.chriskieffer.com/posts/2016/12/16/westworld-fui
- DESK feature: https://vanschneider.com/blog/behind-the-scenes-of-the-westworld-ui/
- D&AD interview: https://www.dandad.org/en/d-ad-things-we-learnt-about-how-design-fantasy-features-opinions/
- Visual primitives: tri-fold tablet layouts (split-screen 3-pane), live wireframe head/body skeletons over photographic plates, fixed UI chrome around a live "scene" — chrome is steady while content changes. Specifically: GRAY + accent-red colourway dominates Westworld's host-control screens.
- Unite-Group remix: gray + red is on-brand by accident — directly relevant. The "stable chrome, live content centre" pattern is the right shape for a CEO surface where ONE thing changes at a time.

### 5.4 Territory Studio — Blade Runner 2049, Ex Machina, Prometheus, Avengers Infinity War
- Studio + BR2049 project: https://territorystudio.com/project/blade-runner-2049/
- HUDs+GUIS BR2049 breakdown: https://www.hudsandguis.com/home/2018/blade-runner-2049
- Behance gallery: https://www.behance.net/gallery/58594455/BLADE-RUNNER-2049-UI
- Pond5 / Territory feature: https://blog.pond5.com/54667-computer-screen-design-territory-films/
- Visual primitives: glitch / ghosting / chromatic-aberration as a deliberate aesthetic for "old systems still running"; analog-derived textures (cine projector grain, lens distortion) layered over digital UI to escape the "blue glow" sci-fi cliché.
- Unite-Group remix: very subtle CRT-scanline texture and slight chromatic edge bleed on the focal screen ONLY — gives "this is a real ops surface that has been running for years", not a fresh template.

### 5.5 The Expanse — Rocinante UI (Rhys Yorke + motion team)
- HUDS+GUIS Expanse breakdown: https://www.hudsandguis.com/home/2021/theexpanse
- Rhys Yorke ArtStation Rocinante: https://www.artstation.com/artwork/q9Am1L
- Fuzzy Math sci-fi UI essay: https://fuzzymath.com/blog/sci-fi-ui-what-three-spaceships-can-teach-us-about-the-future-of-user-interfaces/
- Tristan Hoffmann analysis: https://medium.com/@Tristan_22975/ui-ux-design-in-the-expanse-9b0084142be7
- Visual primitives: red / green / yellow ONLY (Martian-ship narrative excuse for red dominance — directly transferable to Candy Red brand); "command-line front-end" — text-heavy, low-decoration; built for crew not consumers — every pixel earns a function.
- Unite-Group remix: The Expanse is the closest cinematic reference in palette terms. Red-as-primary + green-as-confirm + yellow-as-warn maps 1:1 onto Candy Red + a low-saturation success green + low-saturation amber.

### 5.6 Minority Report / Oblong g-speak (John Underkoffler)
- TED speaker page: https://www.ted.com/speakers/john_underkoffler
- Engadget interview: https://www.engadget.com/2010-05-07-minority-report-ui-designer-john-underkoffler-talks-about-the-fu.html
- Microsoft Research talk: https://www.microsoft.com/en-us/research/video/hands-and-pixels-from-the-minority-report-interface-to-a-full-stack-spatial-computing-platform/
- Visual primitives: spatial multi-screen continuous canvas — data physically slides between regions; gestural drag-to-pin; data-as-physical-object metaphor. Less directly transferable to a 2D screen — but the "data-as-object you grab and place" mental model is worth carrying.
- Unite-Group remix: drag-to-pin tiles from any source onto a persistent CEO board; tiles remember their position across sessions.

### 5.7 NOTE on Hollywood-UI heritage
- "Four Legends of FUI" stage talk (Hansen / Coleran / Kieffer / Sheldon Hicks): https://cgnews.com/21102/four-legends-of-fui-one-stage/
- HUDS+GUIS overview site (the canonical FUI archive): https://www.hudsandguis.com/
- Sci-fi interfaces archive: https://scifiinterfaces.com/

---

## Category 6 — Real-time agent / autonomous-system surfaces

### 6.1 Anthropic Claude Code — Agent View (v2.1.139, May 11 2026)
- TestingCatalog launch coverage: https://www.testingcatalog.com/anthropic-adds-agent-view-for-claude-code-for-parralel-work/
- The New Stack analysis: https://thenewstack.io/claude-code-agent-view/
- Visual primitives: per-session status pill (running / blocked-on-you / done); one screen lists every session across machines; inline reply without switching context; token-flow and tool-call ticker per-session.
- Unite-Group remix: the CEO surface is essentially Agent View ONE LEVEL UP — sessions become businesses, businesses become Boards, Boards become senior agents. Same three states (running / blocked-on-you / done) the whole way down.

### 6.2 Cursor 3 — Agents Window + Design Mode
- Cursor 3 changelog: https://cursor.com/changelog/3-0
- Cursor 3 walkthrough: https://www.digitalapplied.com/blog/cursor-3-agents-window-design-mode-complete-guide
- Visual primitives: grid of agent tabs running in parallel; per-agent live status badge; Design Mode lets the operator point at a UI element and route feedback to the right agent. Same three-state pattern as Claude Code.
- Unite-Group remix: "point at a tile → ask a Board" affordance — right-click any tile to spawn a Board deliberation about that thing.

### 6.3 Vercel team dashboard
- Geist design system: https://vercel.com/geist
- Vercel design analysis: https://blakecrosley.com/guides/design/vercel
- Visual primitives: pure black background, near-zero accent colour, dynamic favicon mirrors deploy state, optimistic skeleton over spinner. Typography is Geist Sans + Geist Mono — clean geometric.
- Unite-Group remix: dynamic favicon = portfolio health (green/amber/red) — operator sees state without opening the tab. Adopt Vercel's "skeleton, not spinner" rule everywhere.

### 6.4 AWS Console (Cloud Watch + Resource Map)
- CloudWatch dashboards: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html
- Visual primitives: tile composition where every tile is fully scriptable JSON; widget library standardised across services. Boring but the data-density rule (12 metrics on one screen, none decorative) is correct.

### 6.5 Astro UXDS (US Space Force / Rocket Communications)
- Astro UXDS home: https://www.astrouxds.com/
- GitHub: https://github.com/RocketCommunicationsInc/astro
- Visual primitives: explicit component library for mission ops — Status Symbol, Classification Markings, Mission Clock, Timeline, Global Status Bar, Application State, Log, Notification Banner. MIL-STD 1472H compliant. This is the closest open design system to a "real" command center for an autonomous agency.
- Unite-Group remix: borrow the COMPONENT VOCABULARY directly — every CEO surface ships a Mission Clock (UTC + AEST), Global Status Bar, Log tail, Notification Banner. Don't copy the visual style (too military-grey) — borrow the taxonomy.

---

## Distilled design primitives Unite-Group should adopt

1. **Single accent, near-black base.** Vercel + Linear + The Expanse all agree. Gun Metal #1a1a1a + Candy Red #dc143c is already on-brand. Reject the Datadog rainbow tile default.

2. **KPI strip at the top, log ticker at the bottom — always.** Splunk SOC + Datadog + Bloomberg all converge here. Five fixed slots: Pipeline / Cash / Bots-Up / Empire-Health / Burn. Bottom ticker streams every cron heartbeat + Board decision.

3. **Encircled health score + trend arrow as the canonical "business tile".** Gainsight's primitive. Pair RYG colour with shape redundancy (circle / triangle / diamond) for accessibility.

4. **Radial expander widget per tile** (Jayse Hansen Iron Man HUD). One click expands a business tile from KPI-only → full instrument panel. Reject the "drill-down navigation" — drill expands in place.

5. **Command palette first (Cmd-K), mouse second.** Bloomberg + Linear. Every primary CEO action is keyboard-mappable. Press `?` to reveal the full keymap as an overlay (Cursor 3 / Linear pattern).

6. **Live mission clock + connection-state badge in the header.** Astro UXDS taxonomy. Dual time (UTC + AEST). A heartbeat pulse on the badge proves data is live; absence = fail-state.

7. **Animated connection lines on the relationship graph.** Microsoft Sentinel investigation-graph primitive. Portfolio businesses as nodes; shared customers / capital flows / agents as edges. Pulses move along an edge when data flows.

8. **Hairline strokes + corner index labels in monospace caps** (Mark Coleran). `01 / DR`, `02 / RA`. Earns the "real ops surface" feel without decoration.

9. **Tabular-numeral monospace for every numeric cell.** B612 Mono or JetBrains Mono. Bloomberg's accessibility lesson — finance UIs that mix proportional digits look amateur.

10. **Three universal states everywhere: running / blocked-on-you / done** (Claude Code Agent View). Apply at session, project, business, and empire level — same vocabulary, same colour mapping, every surface.

---

## Patterns to deliberately AVOID

1. **Gradient hero banners + glass-morphism cards.** AI-slop template signature. Vercel and Linear both deliberately rejected this.

2. **Lucide icon set.** Per design preferences — custom geometric marks only. Look to Coleran's stencil library, B612 Bureau, or commissioned bespoke marks.

3. **Rainbow service palette** (Datadog default, Grafana default). Every additional hue is information cost. One accent.

4. **Decorative motion** — parallax scrolling, animated background particles that carry no signal. Linear's rule: micro-motion only, every animation must encode state change.

5. **Floating spinner loading indicators.** Vercel's "skeleton screen + optimistic UI" pattern. A spinner is an admission the UI is blocked.

6. **Mixed light/dark "we have both" toggle.** One theme — Gun Metal — locked. Eikon ships two; Vercel locks one. Unite-Group is a CEO surface, not a settings page.

7. **Card-on-card-on-card nesting.** Common in modern SaaS dashboards. Each nesting level adds chrome and removes data. CIC + ATC + Bloomberg all use flat surfaces with hairline separators.

---

## Specific design references to cite in the final proposal

**Designers / studios (annotated)**
- **Jayse Hansen** — https://jayse.io/ — Iron Man HUD, FRIDAY, EDITH. Source for radial expander pattern and "graphics serve the operator" rule.
- **Mark Coleran** (RIP June 2024) — https://www.behance.net/markcoleran and http://coleran.com/gallery-category/fui/ — coined FUI; the canonical thin-stroke / corner-index visual vocabulary.
- **Chris Kieffer** — https://www.chriskieffer.com/posts/2016/12/16/westworld-fui — Westworld's gray + red colourway, on-brand by accident.
- **Territory Studio** — https://territorystudio.com/project/blade-runner-2049/ — analog texture / glitch primitives that escape "blue glow" cliché.
- **Rhys Yorke** — https://www.artstation.com/artwork/q9Am1L — The Expanse Rocinante; red-as-primary precedent.
- **John Underkoffler / Oblong** — https://www.ted.com/speakers/john_underkoffler — data-as-physical-object metaphor.
- **Rocket Communications / Astro UXDS** — https://www.astrouxds.com/ — the only open mission-control design system for autonomous space ops; component taxonomy to mirror.
- **Bloomberg LP Design** — https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/ — the world's most-used dense-data professional UI; keyboard-first benchmark.
- **Linear design team (Karri Saarinen)** — https://linear.app/now/how-we-redesigned-the-linear-ui — modern dark-mode + LCH theme generation.
- **Vercel / Geist (Rauno Freiberg, Evil Rabbit)** — https://vercel.com/geist — pure black baseline + skeleton-not-spinner rule.

**Real C2 / mission-control with public images**
- NASA MCC-21 / Artemis SER — https://www.nasa.gov/blogs/missions/2025/06/13/nasas-artemis-science-team-inaugurates-flight-control-room/
- NASA Shuttle MCC floor plans (Library of Congress, public domain) — https://www.loc.gov/item/tx1182/
- US Navy CIC museum reference — https://wp.nyu.edu/byodintrepid/main-page/gallery-deck/530-combat-information-center/
- SpaceX Crew Dragon cockpit (Shane Mielke) — https://www.shanemielke.com/work/spacex/crew-dragon-displays/

**Canonical FUI archive sites**
- HUDS+GUIS — https://www.hudsandguis.com/ — the curated FUI archive.
- Sci-fi interfaces — https://scifiinterfaces.com/ — long-form analytical breakdowns.
- "Four Legends of FUI" panel (Hansen / Coleran / Kieffer / Hicks) — https://cgnews.com/21102/four-legends-of-fui-one-stage/

**Behance / Dribbble inspiration boards**
- Command Center on Behance — https://www.behance.net/search/projects/command%20center
- Command Center on Dribbble — https://dribbble.com/search/command-center-dashboard
- Bloomberg redesign explorations on Behance — https://www.behance.net/search/projects/bloomberg%20terminals%20redesign

**Typography**
- B612 (Airbus cockpit font, open source) — https://fonts.google.com/specimen/B612 and https://github.com/polarsys/b612 — the legibility benchmark.
- JetBrains Mono — viable B612 Mono alternative for code-cell density.
