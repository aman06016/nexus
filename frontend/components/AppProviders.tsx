"use client";

import { ToastProvider } from "@/components/feedback/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { IncidentRadarEngine } from "@/components/radar/IncidentRadarEngine";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <IncidentRadarEngine />
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}
