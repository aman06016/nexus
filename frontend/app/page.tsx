import { fetchArticles } from "@/lib/api/client";
import { FeedGrid } from "@/features/feed/FeedGrid";

export default async function HomePage() {
  const articles = await fetchArticles(0, 20).catch(() => []);

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Latest AI News</h1>
        <p className="mt-2 text-textSecondary">Live feed from the NEXUS ingestion pipeline.</p>
      </div>
      <FeedGrid articles={articles} />
    </section>
  );
}
