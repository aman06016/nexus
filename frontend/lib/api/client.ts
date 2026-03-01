const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type Article = {
  id: string;
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

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchArticles(page = 0, limit = 20): Promise<Article[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/articles?page=${page}&limit=${limit}`, { cache: "no-store" });
  return parse<Article[]>(res);
}

export async function fetchTrending(page = 0, limit = 20): Promise<Article[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/trending?page=${page}&limit=${limit}`, { cache: "no-store" });
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

  const res = await fetch(`${API_BASE_URL}/api/v1/search?${params.toString()}`, { cache: "no-store" });
  return parse<Article[]>(res);
}

async function postInteraction(url: string, sessionId: string): Promise<InteractionToggleResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId
    }
  });

  return parse<InteractionToggleResponse>(res);
}

export async function toggleLike(articleId: string, sessionId: string): Promise<InteractionToggleResponse> {
  return postInteraction(`${API_BASE_URL}/api/v1/articles/${articleId}/like`, sessionId);
}

export async function toggleSave(articleId: string, sessionId: string): Promise<InteractionToggleResponse> {
  return postInteraction(`${API_BASE_URL}/api/v1/articles/${articleId}/save`, sessionId);
}

export async function fetchSavedArticles(sessionId: string, page = 0, limit = 20): Promise<Article[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/saved?page=${page}&limit=${limit}`, {
    cache: "no-store",
    headers: {
      "X-Session-Id": sessionId
    }
  });
  return parse<Article[]>(res);
}

export async function fetchPersonalizedFeed(sessionId: string, page = 0, limit = 20): Promise<Article[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/feed/personalized?page=${page}&limit=${limit}`, {
    cache: "no-store",
    headers: {
      "X-Session-Id": sessionId
    }
  });
  return parse<Article[]>(res);
}
