import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { BreakingTicker } from "@/components/BreakingTicker";

export const metadata: Metadata = {
  title: "NEXUS AI",
  description: "Real-time AI intelligence platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BreakingTicker />
        <NavBar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
