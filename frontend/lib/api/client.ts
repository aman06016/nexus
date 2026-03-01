const isServer = typeof window === "undefined";
const serverDefaultBase = process.env.BACKEND_URL ?? "http://localhost:8080";
const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ??
  (isServer ? serverDefaultBase : "");
const API_BASE_URL = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "";
const DEFAULT_TIMEOUT_MS = 10_000;

export type Article = {
  id: string;
  url?: string;
  title: string;
  summary?: string;
  publishedAt?: string;
  impactScore?: number;
  category?: string;
  source?: { name?: string; domain?: string };
  stats?: { likes?: number; saves?: number; views?: number; shares?: number };
};

export type InteractionToggleResponse = {
  active: boolean;
  totalCount: number;
};

export type InteractionState = {
  saved: boolean;
  liked: boolean;
};

export type InteractionStateResponse = {
  states: Record<string, InteractionState>;
};

export type AdminSourceSummary = {
  id: string;
  name: string;
  domain?: string;
  tier?: string;
  status: string;
  lastSuccess?: string;
  successRate?: number;
  articlesPerDay?: number;
};

export type AdminOverview = {
  timestamp: string;
  totalArticles: number;
  publishedArticles: number;
  totalSources: number;
  activeSources: number;
  pausedSources: number;
  sources: AdminSourceSummary[];
};

export type AdminActionResponse = {
  triggeredAt: string;
  activeSourcesProcessed?: number;
  updatedArticles?: number;
};

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    const reason = errorBody ? ` - ${errorBody.slice(0, 180)}` : "";
    throw new Error(`Request failed: ${res.status}${reason}`);
  }
  return (await res.json()) as T;
}

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchArticles(page = 0, limit = 20): Promise<Article[]> {
  const res = await request(buildUrl(`/api/v1/articles?page=${page}&limit=${limit}`), { cache: "no-store" });
  return parse<Article[]>(res);
}

export async function fetchTrending(page = 0, limit = 20): Promise<Article[]> {
  const res = await request(buildUrl(`/api/v1/trending?page=${page}&limit=${limit}`), { cache: "no-store" });
  return parse<Article[]>(res);
}

export async function fetchDigest(limit = 10): Promise<Article[]> {
  const res = await request(buildUrl(`/api/v1/digest?limit=${limit}`), { cache: "no-store" });
  return parse<Article[]>(res);
}

export async function fetchSearchResults(
  query: string,
  opts?: { category?: string; company?: string; page?: number; limit?: number }
): Promise<Article[]> {
  const page = opts?.page ?? 0;
  const limit = opts?.limit ?? 20;
  const params = new URLSearchParams({ q: query, page: String(page), limit: String(limit) });

  if (opts?.category) {
    params.set("category", opts.category);
  }
  if (opts?.company) {
    params.set("company", opts.company);
  }

  const res = await request(buildUrl(`/api/v1/search?${params.toString()}`), { cache: "no-store" });
  return parse<Article[]>(res);
}

async function postInteraction(url: string, sessionId: string): Promise<InteractionToggleResponse> {
  const res = await request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId
    }
  });

  return parse<InteractionToggleResponse>(res);
}

async function post<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await request(url, {
    method: "POST",
    ...init
  });
  return parse<T>(res);
}

export async function toggleLike(articleId: string, sessionId: string): Promise<InteractionToggleResponse> {
  return postInteraction(buildUrl(`/api/v1/articles/${articleId}/like`), sessionId);
}

export async function toggleSave(articleId: string, sessionId: string): Promise<InteractionToggleResponse> {
  return postInteraction(buildUrl(`/api/v1/articles/${articleId}/save`), sessionId);
}

export async function fetchSavedArticles(sessionId: string, page = 0, limit = 20): Promise<Article[]> {
  const res = await request(buildUrl(`/api/v1/saved?page=${page}&limit=${limit}`), {
    cache: "no-store",
    headers: {
      "X-Session-Id": sessionId
    }
  });
  return parse<Article[]>(res);
}

export async function fetchPersonalizedFeed(sessionId: string, page = 0, limit = 20): Promise<Article[]> {
  const res = await request(buildUrl(`/api/v1/feed/personalized?page=${page}&limit=${limit}`), {
    cache: "no-store",
    headers: {
      "X-Session-Id": sessionId
    }
  });
  return parse<Article[]>(res);
}

export async function fetchInteractionState(sessionId: string, articleIds: string[]): Promise<InteractionStateResponse> {
  if (articleIds.length === 0) {
    return { states: {} };
  }

  const params = new URLSearchParams();
  for (const articleId of articleIds) {
    if (articleId) {
      params.append("articleId", articleId);
    }
  }

  const res = await request(buildUrl(`/api/v1/articles/state?${params.toString()}`), {
    cache: "no-store",
    headers: {
      "X-Session-Id": sessionId
    }
  });

  return parse<InteractionStateResponse>(res);
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await request(buildUrl("/api/v1/admin/overview"), { cache: "no-store" });
  return parse<AdminOverview>(res);
}

export async function triggerAdminScrapeRun(): Promise<AdminActionResponse> {
  return post<AdminActionResponse>(buildUrl("/api/v1/admin/scrape/run"));
}

export async function triggerAdminTrendingRecompute(): Promise<AdminActionResponse> {
  return post<AdminActionResponse>(buildUrl("/api/v1/admin/trending/recompute"));
}

export async function pauseAdminSource(sourceId: string): Promise<void> {
  await post(buildUrl(`/api/v1/admin/sources/${sourceId}/pause`));
}

export async function resumeAdminSource(sourceId: string): Promise<void> {
  await post(buildUrl(`/api/v1/admin/sources/${sourceId}/resume`));
}

export async function rescrapeAdminSource(sourceId: string): Promise<void> {
  await post(buildUrl(`/api/v1/admin/sources/${sourceId}/rescrape`));
}
