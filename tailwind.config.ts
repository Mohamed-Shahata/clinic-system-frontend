import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        surface:    "hsl(var(--surface))",
        "surface-2":"hsl(var(--surface-2))",
        border:     "hsl(var(--border))",
        foreground: "hsl(var(--foreground))",
        muted:      "hsl(var(--muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          fg:      "hsl(var(--primary-fg))",
        },
        success:    "hsl(var(--success))",
        warning:    "hsl(var(--warning))",
        danger:     "hsl(var(--danger))",
        card: {
          DEFAULT: "hsl(var(--card))",
          border:  "hsl(var(--card-border))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-bg))",
          fg:      "hsl(var(--sidebar-fg))",
          active:  "hsl(var(--sidebar-active-bg))",
          "active-fg": "hsl(var(--sidebar-active-fg))",
          hover:   "hsl(var(--sidebar-hover-bg))",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans:  ["DM Sans", "Tajawal", "sans-serif"],
        arabic:["Tajawal", "sans-serif"],
        mono:  ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        glow: "0 0 20px -4px hsl(var(--primary-glow) / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
