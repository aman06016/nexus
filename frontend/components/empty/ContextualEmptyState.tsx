import Link from "next/link";

type EmptyStateAction = {
  href: string;
  label: string;
};

type ContextualEmptyStateProps = {
  title: string;
  description: string;
  guidance?: string[];
  actions?: EmptyStateAction[];
};

function EmptyStateIllustration() {
  return (
    <div className="mb-4 inline-flex rounded-xl border border-borderSoft bg-bgTertiary/80 p-3">
      <svg
        width="120"
        height="72"
        viewBox="0 0 120 72"
        aria-hidden="true"
        className="text-textSecondary"
      >
        <rect x="4" y="10" width="46" height="54" rx="8" fill="currentColor" opacity="0.18" />
        <rect x="54" y="4" width="62" height="64" rx="10" fill="currentColor" opacity="0.12" />
        <rect x="14" y="22" width="26" height="4" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="14" y="30" width="20" height="4" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="64" y="20" width="42" height="5" rx="2.5" fill="currentColor" opacity="0.55" />
        <rect x="64" y="30" width="34" height="5" rx="2.5" fill="currentColor" opacity="0.4" />
        <rect x="64" y="40" width="26" height="5" rx="2.5" fill="currentColor" opacity="0.3" />
        <circle cx="102" cy="52" r="8" fill="currentColor" opacity="0.22" />
      </svg>
    </div>
  );
}

export function ContextualEmptyState({
  title,
  description,
  guidance = [],
  actions = []
}: ContextualEmptyStateProps) {
  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
      <EmptyStateIllustration />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-textSecondary">{description}</p>

      {guidance.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-textSecondary">
          {guidance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
