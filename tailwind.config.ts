import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    fontSize: {
      xs: ["0.625rem", { lineHeight: "0.875rem" }],
      sm: ["0.75rem", { lineHeight: "1.125rem" }],
      base: ["0.8125rem", { lineHeight: "1.375rem" }],
      lg: ["1rem", { lineHeight: "1.4rem" }],
      xl: ["1.25rem", { lineHeight: "1.6rem" }],
      "2xl": ["1.5rem", { lineHeight: "1.85rem" }],
      "3xl": ["2rem", { lineHeight: "2.15rem" }],
      "4xl": ["2.5rem", { lineHeight: "2.6rem" }]
    },
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panelAlt: "var(--panel-alt)",
        panelStrong: "var(--panel-strong)",
        panelSoft: "var(--panel-soft)",
        panelContrast: "var(--panel-contrast)",
        border: "var(--border)",
        borderStrong: "var(--border-strong)",
        text: "var(--text)",
        textSoft: "var(--text-soft)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        accent: "var(--accent)",
        accentSoft: "var(--accent-soft)",
        success: "var(--success)",
        successSoft: "var(--success-soft)",
        danger: "var(--danger)",
        dangerSoft: "var(--danger-soft)",
        info: "var(--info)",
        infoSoft: "var(--info-soft)"
      },
      borderRadius: {
        shell: "12px",
        panel: "10px"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(15, 23, 42, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
