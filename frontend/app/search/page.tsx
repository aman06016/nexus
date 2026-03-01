import { FeedGrid } from "@/features/feed/FeedGrid";
import { fetchSearchResults } from "@/lib/api/client";

type SearchPageProps = {
  searchParams?: {
    q?: string;
    category?: string;
    company?: string;
  };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams?.q?.trim() ?? "";
  const category = searchParams?.category?.trim() ?? "";
  const company = searchParams?.company?.trim() ?? "";

  const hasFilters = query.length > 0 || category.length > 0 || company.length > 0;
  const results = hasFilters
    ? await fetchSearchResults(query || "ai", {
        category: category || undefined,
        company: company || undefined,
        page: 0,
        limit: 20
      }).catch(() => [])
    : [];

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="mt-2 text-textSecondary">Full-text and entity search via Elasticsearch index.</p>

        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3" method="GET" action="/search">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search topic"
            className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none"
          />
          <input
            name="category"
            defaultValue={category}
            placeholder="Category (optional)"
            className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none"
          />
          <input
            name="company"
            defaultValue={company}
            placeholder="Company (optional)"
            className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none"
          />
        </form>
      </div>

      {!hasFilters ? (
        <section className="rounded-card border border-borderSoft bg-bgSecondary p-6 text-textSecondary">
          Enter a query or filter to search indexed AI articles.
        </section>
      ) : results.length === 0 ? (
        <section className="rounded-card border border-borderSoft bg-bgSecondary p-6 text-textSecondary">
          No matching results found.
        </section>
      ) : (
        <FeedGrid articles={results} />
      )}
    </section>
  );
}
