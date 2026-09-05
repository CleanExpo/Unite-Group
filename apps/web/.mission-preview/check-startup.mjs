import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const output = new URL("./artifacts/startup/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
async function check(page, name, expected, screenshot) {
  const pass = (await page.getByText(expected, { exact: true }).count()) > 0;
  results.push({ name, pass });
  await page.screenshot({ path: fileURLToPath(new URL(screenshot, output)) });
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.route("**/main.tsx*", (route) => route.abort());
  await page.goto("http://127.0.0.1:4178/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", {
      name: "Mission Control could not start",
      exact: true,
    })
    .waitFor();
  await check(
    page,
    "Blocked entry shows recovery",
    "Mission Control could not start",
    "blocked-entry.png",
  );
  await page.unroute("**/main.tsx*");
  await page
    .getByRole("button", { name: "Reload Mission Control", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Start a mission with Margot" })
    .waitFor();
  await page
    .getByRole("heading", {
      name: "Your vision. A clear path forward.",
      exact: true,
    })
    .waitFor();
  results.push({ name: "Manual reload recovers healthy home", pass: true });
  await page.route("**/main.tsx*", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("function Preview() {"))
      throw new Error("Expected preview render function unavailable");
    const headers = { ...response.headers(), "cache-control": "no-store" };
    delete headers.etag;
    await route.fulfill({
      response,
      headers,
      body: source.replace(
        "function Preview() {",
        'function Preview() { throw new Error("Local render verification fixture");',
      ),
    });
  });
  await page.goto("http://127.0.0.1:4178/founder/command-centre", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", {
      name: "Mission Control encountered a problem",
      exact: true,
    })
    .waitFor();
  await check(
    page,
    "Render exception shows recovery",
    "Mission Control encountered a problem",
    "render-error.png",
  );
  await page.unroute("**/main.tsx*");
  await page
    .getByRole("button", { name: "Reload Mission Control", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Start a mission with Margot" })
    .waitFor();
  await page
    .getByRole("heading", {
      name: "Your vision. A clear path forward.",
      exact: true,
    })
    .waitFor();
  results.push({ name: "Manual reload recovers render failure", pass: true });
  await page
    .getByRole("navigation", { name: "Mission Control workspaces" })
    .getByRole("link", { name: "Businesses", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Businesses & projects", exact: true })
    .waitFor();
  results.push({
    name: "Healthy subroute stays distinct from home",
    pass:
      (await page
        .getByRole("region", { name: "Start a mission with Margot" })
        .count()) === 0,
  });
  await page.screenshot({
    path: fileURLToPath(new URL("healthy-subroute.png", output)),
  });
  await page.clock.install();
  let release, entered, handled;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const entryStarted = new Promise((resolve) => {
    entered = resolve;
  });
  const entryHandled = new Promise((resolve) => {
    handled = resolve;
  });
  let entryRequests = 0;
  await page.route("**/main.tsx*", async (route) => {
    entryRequests++;
    entered();
    await held;
    await route.abort();
    handled();
  });
  await page.goto("http://127.0.0.1:4178/", { waitUntil: "domcontentloaded" });
  await entryStarted;
  await check(
    page,
    "Initial HTML loading panel is visible",
    "Loading Mission Control",
    "initial-loading.png",
  );
  await page.clock.runFor(10001);
  await check(
    page,
    "Stalled entry shows manual recovery",
    "Mission Control is taking longer to open",
    "stalled-entry.png",
  );
  results.push({
    name: "Stall never causes automatic reload",
    pass: entryRequests === 1,
  });
  release();
  await entryHandled;
  await page.unroute("**/main.tsx*");
  await page.clock.resume();
  await page
    .getByRole("button", { name: "Reload Mission Control", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Start a mission with Margot" })
    .waitFor();
  await page
    .getByRole("heading", {
      name: "Your vision. A clear path forward.",
      exact: true,
    })
    .waitFor();
  results.push({ name: "Manual reload recovers stalled entry", pass: true });
} finally {
  await writeFile(
    new URL("results.json", output),
    JSON.stringify({ observedAt: new Date().toISOString(), results }, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(results));
if (results.some((result) => !result.pass)) process.exitCode = 1;
