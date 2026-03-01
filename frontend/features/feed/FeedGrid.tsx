import { Article } from "@/lib/api/client";
import { ArticleCard } from "@/components/ArticleCard";

export function FeedGrid({ articles }: { articles: Article[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
