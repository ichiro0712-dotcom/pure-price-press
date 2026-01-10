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
        // Pure Price Press Brand Colors
        brand: {
          navy: "#000000",
          blue: "#1F2937",
          lightblue: "#374151",
          accent: "#FCD34D",
          gold: "#FCD34D",
          yellow: "#FCD34D",
        },
        // Semantic colors
        background: {
          DEFAULT: "#000000",
          secondary: "#0A0A0A",
          tertiary: "#171717",
        },
        foreground: {
          DEFAULT: "#F9FAFB",
          secondary: "#D1D5DB",
          muted: "#9CA3AF",
        },
        // Flat versions for easier class usage
        "foreground-secondary": "#D1D5DB",
        "foreground-muted": "#9CA3AF",
        "background-secondary": "#0A0A0A",
        "background-tertiary": "#171717",
        // Alert colors
        surge: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#059669",
        },
        drop: {
          DEFAULT: "#EF4444",
          light: "#F87171",
          dark: "#DC2626",
        },
        critical: {
          DEFAULT: "#DC2626",
          light: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(252, 211, 77, 0.3)",
        "glow-strong": "0 0 30px rgba(252, 211, 77, 0.5)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "dialog-in": "dialogIn 0.2s ease-out",
        "backdrop-in": "backdropIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        dialogIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        backdropIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
