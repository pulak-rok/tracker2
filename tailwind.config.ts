import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#090A0F",
          surface: "#11131A",
          elevated: "#181B24",
          border: "#222634",
          hover: "#2A2F40",
        },
        profit: {
          DEFAULT: "#10B981",
          muted: "rgba(16, 185, 129, 0.14)",
          border: "rgba(16, 185, 129, 0.35)",
        },
        loss: {
          DEFAULT: "#EF4444",
          muted: "rgba(239, 68, 68, 0.14)",
          border: "rgba(239, 68, 68, 0.35)",
        },
        breakeven: {
          DEFAULT: "#F59E0B",
          muted: "rgba(245, 158, 11, 0.14)",
          border: "rgba(245, 158, 11, 0.35)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
