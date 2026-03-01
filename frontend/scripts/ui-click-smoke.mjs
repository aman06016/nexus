const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

async function run() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    throw new Error(
      "Playwright is not installed. Install with `npm i -D playwright` and run `npx playwright install chromium`."
    );
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/?smoke=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.setItem("nexus:disable-realtime", "1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  const click = async (label, locator) => {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    await locator.click({ timeout: 15000 });
    console.log(`OK click ${label}`);
  };

  await click("Header search submit", page.getByRole("button", { name: "Search" }).first());
  await click("Command palette trigger", page.getByRole("button", { name: "Cmd/Ctrl+K" }));
  await click("Command palette close", page.getByRole("button", { name: "Esc" }));
  await click("Adaptive refresh", page.getByRole("button", { name: /Refresh Recommendations/i }).first());

  await page.goto(`${baseUrl}/search?q=agentic%20ai&smoke=1`, { waitUntil: "domcontentloaded" });
  await click("Apply filters", page.getByRole("button", { name: /Apply Filters/i }));

  await page.goto(`${baseUrl}/admin?smoke=1`, { waitUntil: "domcontentloaded" });
  await click("Run Scrape Cycle", page.getByRole("button", { name: /Run Scrape Cycle/i }));
  await click("Recompute Trending", page.getByRole("button", { name: /Recompute Trending/i }));

  await page.goto(`${baseUrl}/radar?smoke=1`, { waitUntil: "domcontentloaded" });
  await click("Save Rule", page.getByRole("button", { name: /Save Rule/i }));
  await click("Run Scan Now", page.getByRole("button", { name: /Run Scan Now/i }));

  await browser.close();
  console.log("UI click smoke completed successfully.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

