import Link from "next/link";
import { Article } from "@/lib/api/client";
import { buildDiscoveryInsights } from "@/lib/discovery/insights";

type DiscoveryAssistantProps = {
  articles: Article[];
  query?: string;
  scopeLabel?: string;
};

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function DiscoveryAssistant({
  articles,
  query = "",
  scopeLabel = "this feed"
}: DiscoveryAssistantProps) {
  const insights = buildDiscoveryInsights(articles, query, scopeLabel);

  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI Discovery Copilot</h2>
          <p className="mt-2 text-sm text-textSecondary">{insights.summary}</p>
        </div>
        <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-xs font-medium text-textSecondary">
          Assisted Discovery
        </span>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-textSecondary">
        {insights.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-borderSoft bg-bgTertiary p-4">
          <h3 className="text-sm font-semibold text-textPrimary">Why This Is Trending</h3>
          {insights.trendReasons.length === 0 ? (
            <p className="mt-2 text-sm text-textSecondary">Not enough ranking signal yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-textSecondary">
              {insights.trendReasons.map((reason) => {
                const external = isExternalHref(reason.href);
                return (
                  <li key={reason.articleId}>
                    <p className="font-medium text-textPrimary">
                      {external ? (
                        <a
                          href={reason.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="transition hover:text-accentSecondary"
                        >
                          {reason.title}
                        </a>
                      ) : (
                        <Link href={reason.href} className="transition hover:text-accentSecondary">
                          {reason.title}
                        </Link>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-textSecondary">{reason.reason}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-borderSoft bg-bgTertiary p-4">
          <h3 className="text-sm font-semibold text-textPrimary">Semantic Query Suggestions</h3>
          <p className="mt-2 text-xs text-textSecondary">
            Fast follow-ups generated from active themes and source velocity.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {insights.suggestions.map((suggestion) => (
              <Link
                key={suggestion}
                href={`/search?q=${encodeURIComponent(suggestion)}`}
                className="motion-press rounded-md border border-borderSoft bg-bgPrimary px-2.5 py-1.5 text-xs text-textSecondary transition hover:text-textPrimary"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
