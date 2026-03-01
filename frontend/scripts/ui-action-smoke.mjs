const frontendBaseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const backendBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.BACKEND_URL ??
  "http://localhost:8080"
).replace(/\/+$/, "");
const sessionId = process.env.SMOKE_SESSION_ID ?? `smoke_${Date.now()}`;
const skipApiChecks = process.env.SMOKE_SKIP_API === "1";

const pagesToCheck = ["/", "/trending", "/saved", "/digest", "/search?q=claude", "/admin"];

async function requestJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(`Network failure for ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const text = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`Request failed ${response.status} for ${url}: ${text.slice(0, 240)}`);
  }

  return body;
}

async function assertPageLoads(pathname) {
  const url = `${frontendBaseUrl}${pathname}`;
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Page request failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Page failed to load (${response.status}): ${url}`);
  }
}

async function run() {
  console.log(`Smoke check starting. frontend=${frontendBaseUrl} backend=${backendBaseUrl}`);

  for (const pathname of pagesToCheck) {
    await assertPageLoads(pathname);
    console.log(`OK page ${pathname}`);
  }

  if (skipApiChecks) {
    console.log("Skipping API action checks because SMOKE_SKIP_API=1.");
    console.log("Smoke check completed successfully.");
    return;
  }

  const articles = await requestJson(`${backendBaseUrl}/api/v1/articles?page=0&limit=3`, {
    headers: { Accept: "application/json" }
  });
  if (!Array.isArray(articles) || articles.length === 0 || !articles[0]?.id) {
    throw new Error("No articles returned for action checks.");
  }

  const articleId = articles[0].id;
  await requestJson(`${backendBaseUrl}/api/v1/articles/${articleId}/like`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Session-Id": sessionId
    }
  });
  await requestJson(`${backendBaseUrl}/api/v1/articles/${articleId}/save`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Session-Id": sessionId
    }
  });
  console.log(`OK interaction actions for article ${articleId}`);

  const overview = await requestJson(`${backendBaseUrl}/api/v1/admin/overview`, {
    headers: { Accept: "application/json" }
  });
  const sourceId = overview?.sources?.[0]?.id;
  if (!sourceId) {
    throw new Error("No source available for admin action checks.");
  }

  await requestJson(`${backendBaseUrl}/api/v1/admin/scrape/run`, { method: "POST" });
  await requestJson(`${backendBaseUrl}/api/v1/admin/trending/recompute`, { method: "POST" });
  await requestJson(`${backendBaseUrl}/api/v1/admin/sources/${sourceId}/pause`, { method: "POST" });
  await requestJson(`${backendBaseUrl}/api/v1/admin/sources/${sourceId}/resume`, { method: "POST" });
  await requestJson(`${backendBaseUrl}/api/v1/admin/sources/${sourceId}/rescrape`, { method: "POST" });
  console.log(`OK admin actions for source ${sourceId}`);

  console.log("Smoke check completed successfully.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
