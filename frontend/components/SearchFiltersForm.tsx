"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import { emitActivityEvent } from "@/lib/collaboration/activity";

type SearchFiltersFormProps = {
  initialQuery: string;
  initialCategory: string;
  initialCompany: string;
};

export function SearchFiltersForm({ initialQuery, initialCategory, initialCompany }: SearchFiltersFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [company, setCompany] = useState(initialCompany);
  const [showAdvanced, setShowAdvanced] = useState(
    initialCategory.trim().length > 0 || initialCompany.trim().length > 0
  );
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    setQuery(initialQuery);
    setCategory(initialCategory);
    setCompany(initialCompany);
    setShowAdvanced(initialCategory.trim().length > 0 || initialCompany.trim().length > 0);
  }, [initialCategory, initialCompany, initialQuery]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const trimmedCategory = category.trim();
    const trimmedCompany = company.trim();

    if (!trimmedQuery && !trimmedCategory && !trimmedCompany) {
      notify("Enter at least one search value", "error");
      setStatusMessage("Search validation failed. Enter at least one value.");
      return;
    }

    const params = new URLSearchParams();
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }
    if (trimmedCategory) {
      params.set("category", trimmedCategory);
    }
    if (trimmedCompany) {
      params.set("company", trimmedCompany);
    }

    setStatusMessage("Applying filters...");
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
      emitActivityEvent("workspace-update", "Search filters applied");
      setStatusMessage("Filters applied.");
    });
  };

  const onReset = () => {
    setQuery("");
    setCategory("");
    setCompany("");
    setStatusMessage("Resetting search filters...");
    startTransition(() => {
      router.push("/search");
      emitActivityEvent("workspace-update", "Search filters reset");
      setStatusMessage("Filters reset.");
    });
  };

  const hasValues = query.trim().length > 0 || category.trim().length > 0 || company.trim().length > 0;
  const activeAdvancedFilters =
    Number(category.trim().length > 0) + Number(company.trim().length > 0);

  return (
    <form className="mt-4 space-y-3" onSubmit={onSubmit}>
      <p aria-live="polite" className="sr-only">
        {statusMessage}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search topic"
          className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
        />
        <button
          type="submit"
          disabled={isPending}
          className="motion-press min-h-11 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary disabled:opacity-60"
        >
          {isPending ? "Applying..." : "Apply Filters"}
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="motion-press min-h-11 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          aria-expanded={showAdvanced}
          aria-controls="advanced-search-filters"
        >
          {showAdvanced ? "Hide Advanced" : "Advanced Filters"}
          {activeAdvancedFilters > 0 ? ` (${activeAdvancedFilters})` : ""}
        </button>
      </div>

      {!showAdvanced && activeAdvancedFilters > 0 ? (
        <p className="text-xs text-textSecondary">
          {activeAdvancedFilters} advanced filter{activeAdvancedFilters === 1 ? "" : "s"} active.
        </p>
      ) : null}

      {showAdvanced ? (
        <div
          id="advanced-search-filters"
          className="motion-fade-up rounded-md border border-borderSoft bg-bgTertiary/60 p-3"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category (optional)"
              className="min-h-10 rounded-md border border-borderSoft bg-bgPrimary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
            />
            <input
              name="company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Company (optional)"
              className="min-h-10 rounded-md border border-borderSoft bg-bgPrimary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
            />
            <button
              type="button"
              disabled={!hasValues}
              onClick={onReset}
              className="motion-press min-h-11 rounded-md border border-borderSoft bg-bgPrimary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgSecondary hover:text-textPrimary disabled:opacity-60"
            >
              Reset All
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
