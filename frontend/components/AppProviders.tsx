"use client";

import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { IncidentRadarEngine } from "@/components/radar/IncidentRadarEngine";
import { EventShockwaveEngine } from "@/components/radar/EventShockwaveEngine";
import { shouldSuppressRealtime } from "@/lib/runtime/realtime";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [suppressRealtime, setSuppressRealtime] = useState(false);

  useEffect(() => {
    setSuppressRealtime(shouldSuppressRealtime());
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        {!suppressRealtime ? <IncidentRadarEngine /> : null}
        {!suppressRealtime ? <EventShockwaveEngine /> : null}
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}
