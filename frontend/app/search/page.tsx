import { FeedGrid } from "@/features/feed/FeedGrid";
import { fetchSearchResults } from "@/lib/api/client";
import { SearchFiltersForm } from "@/components/SearchFiltersForm";
import { DiscoveryAssistant } from "@/components/discovery/DiscoveryAssistant";
import { ContextualEmptyState } from "@/components/empty/ContextualEmptyState";
import { filterSearchQuality } from "@/lib/quality/articleQuality";

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
  const rawResults = hasFilters
    ? await fetchSearchResults(query || "ai", {
        category: category || undefined,
        company: company || undefined,
        page: 0,
        limit: 20
      }).catch(() => [])
    : [];
  const quality = filterSearchQuality(rawResults, query || "ai");
  const results = quality.accepted;
  const filteredOutCount =
    quality.rejected.stale +
    quality.rejected.lowImpact +
    quality.rejected.lowRelevance +
    quality.rejected.invalidDate;

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="mt-2 text-textSecondary">Full-text and entity search via Elasticsearch index.</p>
        {hasFilters ? (
          <p className="mt-2 text-xs text-textSecondary">
            Quality guardrails: last 12 months, impact &gt; 0, and query-topic relevance.
            {filteredOutCount > 0 ? ` Filtered ${filteredOutCount} low-signal result${filteredOutCount === 1 ? "" : "s"}.` : ""}
          </p>
        ) : null}

        <SearchFiltersForm initialQuery={query} initialCategory={category} initialCompany={company} />
      </div>

      {!hasFilters ? (
        <ContextualEmptyState
          title="Start with a Topic or Filter"
          description="Enter at least one value to query indexed AI articles."
          guidance={[
            "Try broad themes first, then tighten with category and company filters.",
            "Use advanced filters only when you need precision."
          ]}
          actions={[
            { href: "/search?q=agentic%20ai", label: "Try: agentic ai" },
            { href: "/search?q=model%20release&company=Anthropic", label: "Try: model release + Anthropic" }
          ]}
        />
      ) : results.length === 0 ? (
        <ContextualEmptyState
          title="No high-signal results found"
          description={
            rawResults.length > 0
              ? "Results were found, but none met freshness, impact, and relevance guardrails."
              : "Your current filters are too narrow for indexed content."
          }
          guidance={[
            "Try a broader query or remove either category or company.",
            "If you need historical research, use Trending or Digest and relax filters manually.",
            "Search by a broader theme such as security, policy, or model.",
            "Use Trending to discover active topics, then return to refine."
          ]}
          actions={[
            { href: "/trending", label: "Explore Trending" },
            { href: "/search", label: "Reset Search" }
          ]}
        />
      ) : (
        <>
          <DiscoveryAssistant
            articles={results}
            query={`${query} ${category} ${company}`.trim()}
            scopeLabel="your search results"
          />
          <FeedGrid articles={results} />
        </>
      )}
    </section>
  );
}
