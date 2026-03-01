import { FeedSkeletonGrid } from "@/components/feed/FeedSkeletonGrid";

export default function SearchLoading() {
  return (
    <section className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <div className="skeleton-block h-8 w-36" />
        <div className="mt-3 skeleton-block h-4 w-80 max-w-full" />
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="skeleton-block h-10 w-full" />
          <div className="skeleton-block h-10 w-28" />
          <div className="skeleton-block h-10 w-36" />
        </div>
      </div>
      <FeedSkeletonGrid />
    </section>
  );
}
