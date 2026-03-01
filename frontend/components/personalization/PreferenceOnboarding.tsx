"use client";

import { useEffect, useState } from "react";
import {
  DeliveryCadence,
  getUserPreferences,
  parseCommaList,
  saveUserPreferences
} from "@/lib/personalization/preferences";

export function PreferenceOnboarding() {
  const [visible, setVisible] = useState(false);
  const [topicsInput, setTopicsInput] = useState("");
  const [companiesInput, setCompaniesInput] = useState("");
  const [riskInput, setRiskInput] = useState("");
  const [cadence, setCadence] = useState<DeliveryCadence>("daily");

  useEffect(() => {
    const existing = getUserPreferences();
    setVisible(!existing);
  }, []);

  if (!visible) {
    return null;
  }

  const completeOnboarding = () => {
    saveUserPreferences({
      topics: parseCommaList(topicsInput),
      companies: parseCommaList(companiesInput),
      riskDomains: parseCommaList(riskInput),
      deliveryCadence: cadence
    });
    setVisible(false);
  };

  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary/90 p-5">
      <h2 className="text-lg font-semibold text-textPrimary">Set Your Monitoring Preferences</h2>
      <p className="mt-1 text-sm text-textSecondary">
        Choose what matters first. We will use this to prioritize your feed and brief cadence.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-textSecondary">
          Topics (comma-separated)
          <input
            value={topicsInput}
            onChange={(event) => setTopicsInput(event.target.value)}
            placeholder="agentic ai, model releases, regulation"
            className="mt-1 w-full rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm text-textPrimary outline-none ring-accentPrimary transition focus:ring"
          />
        </label>
        <label className="text-sm text-textSecondary">
          Companies (comma-separated)
          <input
            value={companiesInput}
            onChange={(event) => setCompaniesInput(event.target.value)}
            placeholder="OpenAI, Anthropic, NVIDIA"
            className="mt-1 w-full rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm text-textPrimary outline-none ring-accentPrimary transition focus:ring"
          />
        </label>
        <label className="text-sm text-textSecondary md:col-span-2">
          Risk Domains (comma-separated)
          <input
            value={riskInput}
            onChange={(event) => setRiskInput(event.target.value)}
            placeholder="security, compliance, data leakage"
            className="mt-1 w-full rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm text-textPrimary outline-none ring-accentPrimary transition focus:ring"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { value: "realtime", label: "Realtime" },
          { value: "hourly", label: "Hourly" },
          { value: "daily", label: "Daily" }
        ].map((option) => {
          const active = cadence === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setCadence(option.value as DeliveryCadence)}
              className={`motion-press rounded-md border px-3 py-2 text-sm transition ${
                active
                  ? "border-accentPrimary/60 bg-accentPrimary/15 text-accentPrimary"
                  : "border-borderSoft bg-bgTertiary text-textSecondary hover:bg-bgPrimary hover:text-textPrimary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={completeOnboarding}
          className="motion-press rounded-md border border-accentPrimary/60 bg-accentPrimary/15 px-3 py-2 text-sm font-medium text-accentPrimary transition hover:bg-accentPrimary/20"
        >
          Save Preferences
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
        >
          Skip for now
        </button>
      </div>
    </section>
  );
}

