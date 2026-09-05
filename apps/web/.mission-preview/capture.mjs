import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

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
  const routes = await navigation
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute("href"),
        label: link.textContent.trim(),
      })),
    );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const sidebarOpen =
      (await page.locator("aside").first().boundingBox()).width > 100;
    if ((width < 768 && sidebarOpen) || (width >= 768 && !sidebarOpen))
      await page.keyboard.press("Control+Backslash");
    for (const route of routes) {
      await navigation
        .getByRole("link", { name: route.label, exact: true })
        .click();
      await navigation
        .locator(`a[href="${route.href}"][aria-current="page"]`)
        .waitFor();
      await page.locator("main h1").waitFor();
      await page.waitForTimeout(350);
      const result = {
        href: route.href,
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
  }
  await page.goto(home);
  await page
    .getByLabel("Your idea", { exact: true })
    .fill("Preview-only smoke check");
  await page
    .getByRole("button", { name: "Prepare my mission", exact: true })
    .click();
  await page
    .getByRole("article", { name: "Selected mission" })
    .getByRole("heading", { name: "Preview-only smoke check", exact: true })
    .waitFor();
  results.push({ check: "Sample mission preparation", pass: true });
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
