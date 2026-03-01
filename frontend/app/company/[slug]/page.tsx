export default function CompanyPage({ params }: { params: { slug: string } }) {
  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
      <h1 className="text-2xl font-semibold">Company: {params.slug}</h1>
      <p className="mt-2 text-textSecondary">Company hub timeline and filters are queued for the next implementation pass.</p>
    </section>
  );
}
