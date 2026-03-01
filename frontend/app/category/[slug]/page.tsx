export default function CategoryPage({ params }: { params: { slug: string } }) {
  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
      <h1 className="text-2xl font-semibold">Category: {params.slug}</h1>
      <p className="mt-2 text-textSecondary">Category feed is scaffolded and ready to connect to the backend endpoint.</p>
    </section>
  );
}
