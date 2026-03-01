"use client";

import { useEffect, useState } from "react";
import { connectNewsStream } from "@/lib/ws/news";

export function BreakingTicker() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const socket = connectNewsStream((message) => {
      setItems((current) => [message, ...current].slice(0, 8));
    });

    return () => socket.close();
  }, []);

  return (
    <div className="border-b border-borderSoft bg-bgTertiary px-4 py-2 text-xs text-textSecondary">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="rounded bg-accentDanger/20 px-2 py-0.5 text-accentDanger">LIVE</span>
        <div className="animate-[pulse_2s_infinite] text-textPrimary">
          {items.length > 0 ? items.join("  •  ") : "Waiting for breaking news stream..."}
        </div>
      </div>
    </div>
  );
}
