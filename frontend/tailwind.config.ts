import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: "var(--bg-primary)",
        bgSecondary: "var(--bg-secondary)",
        bgTertiary: "var(--bg-tertiary)",
        accentPrimary: "var(--accent-primary)",
        accentSecondary: "var(--accent-secondary)",
        accentDanger: "var(--accent-danger)",
        accentSuccess: "var(--accent-success)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        textTertiary: "var(--text-tertiary)",
        borderSoft: "var(--border-soft)"
      },
      boxShadow: {
        glow: "0 4px 24px rgba(108,99,255,0.15)"
      },
      borderRadius: {
        card: "12px"
      }
    }
  },
  plugins: []
};

export default config;
