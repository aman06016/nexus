import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { BreakingTicker } from "@/components/BreakingTicker";
import { AppProviders } from "@/components/AppProviders";
import { ActivityBar } from "@/components/collaboration/ActivityBar";

export const metadata: Metadata = {
  title: "NEXUS AI",
  description: "Real-time AI intelligence platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="nexus-theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const key = "nexus-theme";
              const stored = window.localStorage.getItem(key);
              const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
              const resolved = preference === "system"
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : preference;
              document.documentElement.dataset.theme = resolved;
              document.documentElement.style.colorScheme = resolved;
            } catch {}
          })();`}
        </Script>
        <AppProviders>
          <BreakingTicker />
          <Suspense
            fallback={
              <div className="border-b border-borderSoft bg-bgPrimary/85">
                <div className="mx-auto h-[61px] w-full max-w-7xl px-4 py-3" />
              </div>
            }
          >
            <NavBar />
          </Suspense>
          <ActivityBar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
