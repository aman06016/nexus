type FeedSkeletonGridProps = {
  count?: number;
};

export function FeedSkeletonGrid({ count = 9 }: FeedSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={`skeleton-${index}`}
          className="rounded-card border border-borderSoft bg-bgSecondary/75 p-5"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="skeleton-block h-6 w-20 rounded-full" />
            <div className="skeleton-block h-4 w-24" />
            <div className="skeleton-block h-4 w-16" />
          </div>
          <div className="space-y-2">
            <div className="skeleton-block h-6 w-full" />
            <div className="skeleton-block h-6 w-11/12" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="skeleton-block h-4 w-full" />
            <div className="skeleton-block h-4 w-10/12" />
            <div className="skeleton-block h-4 w-8/12" />
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="skeleton-block h-6 w-20 rounded-full" />
            <div className="flex gap-2">
              <div className="skeleton-block h-9 w-20" />
              <div className="skeleton-block h-9 w-20" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
