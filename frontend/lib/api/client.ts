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
