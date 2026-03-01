import { FeedSkeletonGrid } from "@/components/feed/FeedSkeletonGrid";

export default function AppLoading() {
  return (
    <section className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <div className="skeleton-block h-8 w-56" />
        <div className="mt-3 skeleton-block h-4 w-80 max-w-full" />
      </div>
      <FeedSkeletonGrid />
    </section>
  );
}
