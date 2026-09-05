import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { MISSION_CONTROL_ROUTES } from "../src/lib/navigation/mission-control.ts";

const output = new URL("./artifacts/capture/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
let completed = false;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4178/");
  await page
    .getByRole("heading", {
      name: "Your vision. A clear path forward.",
      exact: true,
    })
    .waitFor();
  const home = page.url();
  const navigation = page.getByRole("navigation", {
    name: "Mission Control workspaces",
  });
  const routes = MISSION_CONTROL_ROUTES;
  assert.equal(routes.length, 12, "All twelve workspace destinations remain in the manifest");
  assert.equal(routes.filter(route => route.primary).length, 5);
  const more = navigation.locator("details").filter({ hasText: "More workspaces" });
  const summary = more.locator("summary");
  assert.equal(await more.count(), 1);
  assert.equal(await navigation.getByRole("link").count(), 5, "Only five primary links are initially exposed");
  await summary.focus();
  await summary.press("Enter");
  assert.equal(await navigation.getByRole("link").count(), 12, "Keyboard opening exposes all twelve destinations");
  assert.deepEqual((await navigation.getByRole("link").evaluateAll(links => links.map(link => link.getAttribute("href")))).sort(), routes.map(route => route.href).sort());
  await summary.press("Enter");
  results.push({ check: "Five primary and seven keyboard-accessible additional workspaces", pass: true });
  for (const width of [1440, 1024, 390]) {
    await page.goto(home);
    await page.getByRole("heading", { name: "Your vision. A clear path forward.", exact: true }).waitFor();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const sidebarOpen =
      (await page.locator("aside").first().boundingBox()).width > 100;
    if ((width < 768 && sidebarOpen) || (width >= 768 && !sidebarOpen))
      await page.keyboard.press("Control+Backslash");
    for (const route of routes) {
      if (!route.primary && !(await more.evaluate(element => element.open))) {
        await summary.getByText("More workspaces", { exact: true }).click();
      }
      await navigation
        .getByRole("link", { name: route.label, exact: true })
        .click();
      await navigation
        .locator(`a[href="${route.href}"][aria-current="page"]`)
        .waitFor({ state: "attached" });
      assert.equal(new URL(page.url()).pathname, route.href);
      if (await more.evaluate(element => element.open)) await summary.getByText("More workspaces", { exact: true }).click();
      assert.equal(await navigation.getByRole("link").count(), 5);
      assert.equal(await more.getAttribute("data-active"), String(!route.primary));
      if (!route.primary) assert((await summary.innerText()).includes(route.label), "Collapsed disclosure identifies the active technical workspace");
      await page.locator("main h1").waitFor();
      await page.waitForTimeout(350);
      const result = {
        href: route.href,
        secondary: !route.primary,
        activeWorkspaceIdentifiable: true,
        width,
        headings: await page.locator("main h1").allTextContents(),
        overflow: await page
          .locator("main")
          .first()
          .evaluate((element) => element.scrollWidth > element.clientWidth),
      };
      results.push(result);
      assert.equal(result.headings.length, 1);
      assert.equal(result.overflow, false);
      assert.equal(await page.getByTestId("deck-feel-toggle").count(), 1);
      assert.equal(await page.locator("[data-topbar-actions]").count(), 1);
      assert.equal(
        await page
          .getByRole("region", { name: "Start a mission with Margot" })
          .count(),
        new URL(home).pathname === route.href ? 1 : 0,
      );
      await page
        .locator("main")
        .first()
        .evaluate((element) => element.scrollTo(0, 0));
      await page.screenshot({
        path: fileURLToPath(
          new URL(`${route.href.split("/").at(-1)}-${width}.png`, output),
        ),
      });
    }
    await page.goto(home);
    await page.getByRole("heading", { name: "Your vision. A clear path forward.", exact: true }).waitFor();
    const consoleRegion = page.getByRole("region", { name: "Start a mission with Margot" });
    await consoleRegion.getByRole("button", { name: /^Review & approval/ }).waitFor();
    const catalogue = await page.evaluate(async () => (await fetch("/api/command-centre/missions")).json());
    assert(catalogue.presets.length > 0);
    for (const preset of catalogue.presets) {
      const label = preset.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert(await consoleRegion.getByRole("button", { name: new RegExp(`^${label} `) }).isVisible(), `${preset.label} is visible before any expansion`);
    }
    await page.screenshot({ path: fileURLToPath(new URL(`visible-capabilities-${width}.png`, output)) });
    const chosen = catalogue.presets.filter(preset => ["Review & approval", "Activity history"].includes(preset.label));
    assert.equal(chosen.length, 2);
    for (const preset of chosen) {
      const button = consoleRegion.getByRole("button", { name: new RegExp(`^${preset.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} `) });
      await button.click();
      assert.equal(await button.getAttribute("aria-pressed"), "true");
    }
    const draft = page.getByRole("complementary", { name: "Your draft specification" });
    for (const requirement of chosen.flatMap(preset => preset.requirements)) assert((await draft.innerText()).includes(requirement));
    await page.getByLabel("Your idea", { exact: true }).fill("Make Mission Control clear enough for the business owner to understand who acts next, review the proposed work and follow each saved idea without technical assistance.");
    await page.getByRole("button", { name: "Prepare my mission", exact: true }).click();
    const selected = page.getByRole("article", { name: "Selected mission" });
    await selected.waitFor();
    const mission = await page.evaluate(async () => {
      const data = await (await fetch("/api/command-centre/missions")).json();
      return data.missions.find(item => item.taskId === new URL(window.location.href).searchParams.get("mission"));
    });
    assert(mission?.nextAction?.owner, "Sample mission supplies an actual next-action owner");
    await selected.getByRole("heading", { name: mission.title, exact: true }).waitFor();
    const nextStep = selected.getByRole("status").filter({ hasText: "Next step" });
    assert((await nextStep.innerText()).includes(mission.nextAction.label));
    const owner = nextStep.getByText(/Responsible:/);
    await owner.waitFor();
    const expectedOwner = mission.nextAction.owner;
    assert((await owner.innerText()).includes(expectedOwner), "Next-step owner matches the returned mission rather than an invented SPM assignment");
    const detailBounds = await selected.boundingBox();
    const mainWidth = await page.locator("main").first().evaluate(element => element.clientWidth);
    assert(detailBounds.width >= Math.min(560, mainWidth - 100), "Mission detail retains readable width");
    assert(await selected.evaluate(element => element.scrollWidth <= element.clientWidth));
    assert(await page.locator("main").first().evaluate(element => element.scrollWidth <= element.clientWidth));
    await selected.evaluate(element => element.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: fileURLToPath(new URL(`mission-walkthrough-${width}.png`, output)) });
    await selected.screenshot({ path: fileURLToPath(new URL(`mission-detail-${width}.png`, output)) });
    results.push({ check: "Owner mission walkthrough", width, capabilitiesVisibleBeforeExpansion: true, selectedCapabilities: chosen.map(preset => preset.id), sampleMission: true, nextActionOwner: mission.nextAction.owner, displayedOwner: await owner.innerText(), detailWidth: detailBounds.width, mainWidth, overflow: false, pass: true });
  }
  const before = await page
    .getByTestId("deck-feel-toggle")
    .getAttribute("aria-pressed");
  await page.getByTestId("deck-feel-toggle").click();
  assert.notEqual(
    await page.getByTestId("deck-feel-toggle").getAttribute("aria-pressed"),
    before,
  );
  results.push({ check: "Shared theme toggle", pass: true });
  assert.equal(errors.length, 0, errors.join("\n"));
  completed = true;
} finally {
  await writeFile(
    new URL("results.json", output),
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        completed,
        results,
        errors,
        scope:
          "Local preview; sample missions; authenticated business APIs unavailable",
      },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(
  JSON.stringify({
    completed,
    checks: results.length,
    errors,
    output: fileURLToPath(output),
  }),
);
