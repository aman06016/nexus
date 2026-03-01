export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
      <h1 className="text-2xl font-semibold">Article: {params.slug}</h1>
      <p className="mt-2 text-textSecondary">Detailed article rendering, related content, and CTA actions are in the next slice.</p>
    </section>
  );
}
