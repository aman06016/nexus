import Link from "next/link";

const links = [
  { href: "/", label: "Latest" },
  { href: "/trending", label: "Trending" },
  { href: "/saved", label: "Saved" },
  { href: "/digest", label: "Digest" },
  { href: "/admin", label: "Admin" }
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-borderSoft bg-bgPrimary/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-wide text-accentSecondary">
          NEXUS AI
        </Link>

        <nav className="flex items-center gap-2 text-sm text-textSecondary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 transition hover:bg-bgSecondary hover:text-textPrimary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto w-full max-w-xl">
          <input
            aria-label="Search articles"
            placeholder="Search AI news, models, companies..."
            className="w-full rounded-lg border border-borderSoft bg-bgSecondary px-3 py-2 text-sm text-textPrimary outline-none ring-accentPrimary transition focus:ring"
          />
        </div>
      </div>
    </header>
  );
}
