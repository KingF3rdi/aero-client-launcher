/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0b12",
        bar: "#15131d",
        card: "#1a1824",
        pill: "#23202e",
        text: "#eceaf2",
        muted: "#8e8a9a",
        // Runtime-switchable (Settings -> Accent color): see store/useThemeStore.ts applyAccent().
        accent: "rgb(var(--accent) / <alpha-value>)",
        green: "#3dff8a",
        danger: "#e05555",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mc: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgb(var(--accent) / 0.25)",
      },
    },
    // Soft, rounded look matching the Aero Client mod's menus.
    borderRadius: {
      none: "0",
      sm: "4px",
      DEFAULT: "6px",
      md: "8px",
      lg: "10px",
      xl: "14px",
      "2xl": "18px",
      full: "9999px",
    },
  },
  plugins: [],
};
