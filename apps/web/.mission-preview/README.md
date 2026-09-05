# Mission Control local design preview

This is a local preview of the real shared Mission Control shell and page components. It is separate from the authenticated Next.js application. Mission preparation and approval use in-memory sample data; nothing is shipped or submitted to a business service. Reloading resets sample missions and may discard unsaved drafts.

The mission list includes explicitly labelled **Sample HOLD** and **Sample REJECTED** Board-review fixtures. These let you inspect the actual sample verdict, rationale and unresolved-concern notice before the existing branch-consent control. Their Board decisions and specifications are fictional UI examples, with no live Board review or release authority. The original sample missions remain available.

Use the repository's supported Node 24 runtime and existing installed web dependencies. From the repository root:

```sh
pnpm --dir apps/web exec vite --config .mission-preview/vite.config.mjs
```

Open http://127.0.0.1:4178/. Stop that terminal with Ctrl+C when finished. The server binds only to loopback and requires port 4178 to be free; it will not silently choose another port.

## GitHub and service boundaries

The repository selector retrieves real names using the locally authenticated `gh` CLI, server-side, through read-only `GET user/repos` calls. It includes repositories readable by that identity, including private, archived, collaborator and organisation repositories, with pagination. No credentials or inventory are embedded in the preview source. Local CLI access does not establish deployed account access or grant write authority.

If `gh` is missing, disconnected, rate limited or unavailable, the selector reports that condition. All other authenticated API requests return explicit HTTP 503 JSON. Static registry/seed panels retain their source labels. The preview does not load production credentials, server execution flags or authenticated business loaders.

## Build and check

Keep the preview server running for the browser checks. These commands use existing dependencies and an already available Playwright Chromium installation:

```sh
pnpm --dir apps/web exec vite build --config .mission-preview/vite.config.mjs
node apps/web/.mission-preview/check-startup.mjs
node apps/web/.mission-preview/capture.mjs
```

The build writes `.mission-preview/dist/`. Browser results and screenshots write `.mission-preview/artifacts/`. Both directories are ignored; do not force-add them. Paths are derived from each script's location, so the scripts do not depend on a particular machine or checkout path.

`check-startup.mjs` tests blocked/stalled entry loading, a browser-injected render exception, manual retry and healthy home/subroute rendering. It does not add fault flags to application source or create an automatic reload loop. `capture.mjs` verifies all twelve destinations, including the seven in the keyboard-accessible More workspaces disclosure, at 1440, 1024 and 390 pixels. It also checks capability buttons before expansion, selected requirements in the draft, a sample mission's actual next-step owner, readable detail width and the shared theme control. Both sample Board verdicts are opened at every width: their rationale and unresolved notice must precede branch consent, the next step must ask the owner to review concerns, and there must be no horizontal overflow. Local-only consent checks assert that ordinary and concern-bearing missions each submit exactly one approval with the selected mission and specification version; unresolved Board concerns remain visible afterwards. Representative Board screenshots and the request receipts are saved with the results. These checks do not establish authenticated preparation, SPM assignment or shipment.

Each Board case saves a viewport at the concerns, a close-up of the concern region, and a viewport scrolled to the consent button. DOM order and measured element bounds establish the reading order; the separate screenshots illustrate it without claiming to show the entire scrolling mission at once.

The initial HTML has a visible loading/reload panel. Failed imports, a ten-second stall and React render failures show explicit recovery controls. This protects those failure modes; it does not diagnose unrelated browser, network or production outages.
