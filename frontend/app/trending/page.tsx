import { fetchTrending } from "@/lib/api/client";
import { FeedGrid } from "@/features/feed/FeedGrid";

export default async function TrendingPage() {
  const articles = await fetchTrending(0, 20).catch(() => []);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Trending</h1>
      <FeedGrid articles={articles} />
    </section>
  );
}
