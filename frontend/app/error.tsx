"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-textSecondary">
        We could not complete this request. Try again, or refresh the page.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-4 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
        >
          Retry
        </button>
        <a
          href="/"
          className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-4 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
        >
          Go to Latest
        </a>
      </div>
    </section>
  );
}
