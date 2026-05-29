/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
        },
        accent: {
          purple: "#7C3AED",
          blue: "#3B82F6",
          teal: "#14B8A6",
          pink: "#EC4899",
          orange: "#F97316",
          green: "#22C55E",
        },
        text: {
          main: "var(--color-text-main)",
          sub: "var(--color-text-sub)",
          muted: "var(--color-text-muted)",
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      padding: {
        'safe': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'glow-sm': 'var(--shadow-glow-sm)',
        'card': 'var(--shadow-card)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-card) 100%)',
      },
    },
  },
  plugins: [],
}