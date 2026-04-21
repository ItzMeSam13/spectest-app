import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0A0E1A",
        "bg-secondary": "#0F1629",
        "bg-card": "#141D35",
        "border-subtle": "#1E2D4A",
        "accent-cyan": "#00D4FF",
        "accent-violet": "#7B61FF",
        "success": "#00E396",
        "warning": "#FFB547",
        "danger": "#FF4560",
        "text-primary": "#E8EEFF",
        "text-secondary": "#7B8DB0",
        "text-tertiary": "#4A5A78",
        background: "#0A0E1A",
        foreground: "#E8EEFF",
        card: {
          DEFAULT: "#141D35",
          foreground: "#E8EEFF",
        },
        border: "#1E2D4A",
        input: "#1E2D4A",
        primary: {
          DEFAULT: "#00D4FF",
          foreground: "#0A0E1A",
        },
        secondary: {
          DEFAULT: "#7B61FF",
          foreground: "#E8EEFF",
        },
        muted: {
          DEFAULT: "#0F1629",
          foreground: "#7B8DB0",
        },
        accent: {
          DEFAULT: "#00D4FF",
          foreground: "#0A0E1A",
        },
        destructive: {
          DEFAULT: "#FF4560",
          foreground: "#E8EEFF",
        },
        popover: {
          DEFAULT: "#141D35",
          foreground: "#E8EEFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        "cyan-glow": "0 0 20px rgba(0, 212, 255, 0.15)",
        "cyan-glow-sm": "0 0 10px rgba(0, 212, 255, 0.1)",
        "violet-glow": "0 0 20px rgba(123, 97, 255, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "blink": "blink 1s step-end infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
