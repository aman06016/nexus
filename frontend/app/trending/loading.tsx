import { FeedSkeletonGrid } from "@/components/feed/FeedSkeletonGrid";

export default function TrendingLoading() {
  return (
    <section className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <div className="skeleton-block h-8 w-44" />
        <div className="mt-3 skeleton-block h-4 w-72 max-w-full" />
      </div>
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <div className="skeleton-block h-6 w-52" />
        <div className="mt-3 space-y-2">
          <div className="skeleton-block h-4 w-full" />
          <div className="skeleton-block h-4 w-10/12" />
        </div>
      </div>
      <FeedSkeletonGrid />
    </section>
  );
}
