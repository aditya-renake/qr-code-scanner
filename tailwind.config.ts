import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        hack: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          900: "#14532d",
        },
        cyber: {
          cyan: "#00f0ff",
          purple: "#9d4edd",
          pink: "#ff007f",
          dark: "#0a0b10",
          card: "#12141f",
          border: "#232738"
        }
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-sweep": "radar 2s linear infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(0, 240, 255, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(0, 240, 255, 0.7)" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
