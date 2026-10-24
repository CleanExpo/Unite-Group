# See-Pick-Tweak loop controls

Run 24/10/2026 14:20 AEST on Phills-Mac-mini. Each check is broken on purpose (must FAIL), then restored (must PASS).

### 1a. Pixel: accent colour changed by one step (#e55a2b to #e55a2c)
expected: fail · got: FAIL (exit 1) · OK
```
39037 pixels (ratio 0.01 of all image pixels) are different.
- 39037 pixels (ratio 0.01 of all image pixels) are different.
- 39037 pixels (ratio 0.01 of all image pixels) are different.
41153 pixels (ratio 0.03 of all image pixels) are different.
- 41153 pixels (ratio 0.03 of all image pixels) are different.
- 41153 pixels (ratio 0.03 of all image pixels) are different.
```

### 1b. Pixel: colour restored
expected: pass · got: PASS (exit 0) · OK
```
78 passed (1.4m)
```

### 2a. Pressed: all pressed states removed from the list
expected: fail · got: FAIL (exit 1) · OK
```
+   "src/app/cards/order/order.module.css:87 \".navLink:active\" (active) is styled but never screenshotted",
+   "src/app/cards/order/order.module.css:124 \".primary:active\" (active) is styled but never screenshotted",
+   "src/app/cards/order/order.module.css:144 \".secondary:active\" (active) is styled but never screenshotted",
+   "src/app/cards/order/order.module.css:251 \".playButton:active\" (active) is styled but never screenshotted",
+   "src/app/cards/order/order.module.css:352 \".thumb:active .thumbImg\" (active) is styled but never screenshotted",
40 |     .map((s) => `${s.file}:${s.line} "${s.selector}" (${s.states.join(', ')}) is styled but never screenshotted`)
```

### 2b. Pressed: list restored
expected: pass · got: PASS (exit 0) · OK
```
78 passed (57.8s)
```

### 3a. Styling code: new .statement:hover rule with no screenshot
expected: fail · got: FAIL (exit 1) · OK
```
+   "src/app/cards/order/order.module.css:627 \".statement:hover\" (hover) is styled but never screenshotted",
40 |     .map((s) => `${s.file}:${s.line} "${s.selector}" (${s.states.join(', ')}) is styled but never screenshotted`)
1 failed
77 passed (56.6s)
```

### 3b. Styling code: rule removed
expected: pass · got: PASS (exit 0) · OK
```
78 passed (57.9s)
```

### 4a. Tailwind hover: variant added to the page source
expected: fail · got: FAIL (exit 1) · OK
```
+   "src/app/cards/order/order-view.tsx:146 Tailwind state variant \"\"hover:text-white\" cannot be traced to a screenshot; style it in the CSS module",
40 |     .map((s) => `${s.file}:${s.line} "${s.selector}" (${s.states.join(', ')}) is styled but never screenshotted`)
1 failed
77 passed (57.9s)
```

### 4b. Tailwind hover: removed
expected: pass · got: PASS (exit 0) · OK
```
78 passed (56.7s)
```

### 5a. Hidden match: state rule on a hidden element only
expected: fail · got: FAIL (exit 1) · OK
```
+   "src/app/cards/order/order.module.css:627 \".probe[data-probe='on']\" ([data-probe='on']) is styled but never screenshotted",
40 |     .map((s) => `${s.file}:${s.line} "${s.selector}" (${s.states.join(', ')}) is styled but never screenshotted`)
1 failed
77 passed (1.5m)
```

### 5b. Mutant: recorder counts any DOM match (old behaviour), probe still planted
expected: pass · got: PASS (exit 0) · OK
```
78 passed (57.9s)
```

### 5c. Probe removed, recorder restored
expected: pass · got: PASS (exit 0) · OK
```
78 passed (1.5m)
```

## Stability (24/10/2026, Mini)

- Flake: mobile hero-primary-hover failed 2-3 in 20 (5-6 in 60), always the same alternate image (1-level edge anti-aliasing). Cause: Chromium partial re-raster after hover. Fix: `--disable-partial-raster` in playwright.visual.config.ts; then 60/60 identical.
- Under that flag 6 pressed-state baselines were regenerated (hero-secondary, hero-play, buy-play; desktop and mobile); each change is at most 2 colour levels.
- Proof after regeneration: every state x5 = 380/380; fresh-build run 78/78, then a no-change run 78/78.
- Flake: form-error intermittently matched Next's route announcer (also role="alert"). The locator is now scoped to the form's own alert text; form-error x20 on both viewports = 40/40.
- Capture timeout raised to 20 s (capture time only; tolerance stays zero) after one 5 s timeout under load.
- Codex review r1 (595f1d8) P1: coverage counted hidden or off-screen matches. The recorder now counts a match only when a matching element is visible (checkVisibility with opacity and visibility) and its box intersects the captured area. Control 5 above proves it: same build, old recorder PASS, new recorder FAIL. Note: apps/web/tsconfig.json does not include e2e/, so e2e/visual is transpiled by Playwright and not type-checked by `tsc`.
