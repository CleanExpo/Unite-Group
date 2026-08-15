import { skybridge } from "skybridge/vite";
// defineConfig from "vitest/config", NOT from "vite": the plain Vite helper does
// not type the `test` key, so the block below would be a type error there while
// still silently working at runtime.
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [skybridge()],
  test: {
    // Windows-only intermittent failure, observed on PR #1002:
    //   test/view/portfolio-health.test.tsx > VIEW-03 — "Test timed out in
    //   5000ms", having actually run 10,079ms. The same job passed on other
    //   branches minutes later, and the Linux and Alpine runs of the same
    //   suite passed in the same workflow.
    //
    // It is NOT a defect in VIEW-03 and NOT a performance regression. Every
    // case calls recordCase() from test/fixtures/fake-gh.mjs, which does a
    // real mkdir + writeFile of a runtime-evidence receipt into the OS temp
    // directory. That write is infrastructure for the evidence contract that
    // verify:mcp-runtime-evidence checks — it is not what any of these tests
    // assert. On the hosted Windows runner that temp-directory write can stall
    // for seconds (cold FS, Defender scanning, 31 cases writing into the same
    // directory), and vitest charges the stall against the default 5s
    // testTimeout of whichever case happens to be holding it.
    //
    // 31 tests across the contract, view and alpic suites call recordCase, so
    // all of them carry this exposure — VIEW-03 simply lost the lottery. That
    // is why the timeout is set package-wide here rather than on the four view
    // cases: a per-test fix would have left the other 27 exposed and the flake
    // would have resurfaced somewhere else.
    //
    // No assertion is weakened, skipped or quarantined: every expect() still
    // runs and still has to pass. This only stops filesystem latency from being
    // scored as an assertion failure. 20s stays far below the job's own budget,
    // so a genuine hang still fails the run rather than sitting there.
    testTimeout: 20_000,
  },
});
