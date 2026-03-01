"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format/date";
import { getShockwaveAlerts, ShockwaveAlert, subscribeShockwaveAlerts } from "@/lib/radar/shockwave";

function severityTone(severity: ShockwaveAlert["severity"]): string {
  if (severity === "severe") {
    return "alert-warm";
  }
  if (severity === "high") {
    return "border-accentPrimary/50 bg-accentPrimary/10 text-accentPrimary";
  }
  return "border-borderSoft bg-bgTertiary text-textSecondary";
}

export function ShockwaveAlertsPanel() {
  const [alerts, setAlerts] = useState<ShockwaveAlert[]>([]);

  useEffect(() => {
    const refresh = () => setAlerts(getShockwaveAlerts(6));
    refresh();
    return subscribeShockwaveAlerts(refresh);
  }, []);

  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-textPrimary">Event Shockwave Detector</h2>
        <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-xs text-textSecondary">
          Real-time
        </span>
      </div>
      <p className="mt-1 text-sm text-textSecondary">
        Detects abnormal source velocity with cross-source confirmation and posts actionable alerts.
      </p>

      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <p className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm text-textSecondary">
            No shockwave alerts yet. Monitoring live feed velocity.
          </p>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className="rounded-md border border-borderSoft bg-bgTertiary/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-textPrimary">{alert.topic}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${severityTone(alert.severity)}`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-xs text-textSecondary">
                Velocity {alert.velocityRatio.toFixed(1)}x • {alert.sourceCount} confirming sources • {formatRelativeTime(alert.createdAt)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-textSecondary">{alert.impactForecast}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {alert.affectedEntities.length > 0 ? (
                  alert.affectedEntities.map((entity) => (
                    <span
                      key={`${alert.id}-${entity}`}
                      className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5 text-[11px] text-textSecondary"
                    >
                      {entity}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-textTertiary">Affected entities still resolving.</span>
                )}
              </div>

              <div className="mt-2 space-y-1">
                {alert.recommendedActions.map((action) => (
                  <p key={`${alert.id}-${action}`} className="text-xs text-textSecondary">
                    • {action}
                  </p>
                ))}
              </div>

              {alert.supportingTitles[0] ? (
                <p className="mt-2 text-[11px] text-textTertiary">Lead signal: {alert.supportingTitles[0]}</p>
              ) : null}
            </article>
          ))
        )}
      </div>

      <div className="mt-3">
        <Link
          href="/radar"
          className="motion-press inline-flex rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-xs text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
        >
          Open Incident Radar
        </Link>
      </div>
    </section>
  );
}
