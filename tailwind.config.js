/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0b12",
        bar: "#121119",
        card: "#16151e",
        pill: "#201f2a",
        text: "#eceaf2",
        muted: "#b6b2c2",
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
        // The mod marks the selected card with an accent rim, not a glow.
        glow: "0 0 0 1px rgb(var(--accent) / 0.7)",
      },
    },
    // Small, even corners like the Aero Client mod's menus (no big soft blobs).
    borderRadius: {
      none: "0",
      sm: "3px",
      DEFAULT: "5px",
      md: "6px",
      lg: "8px",
      xl: "10px",
      "2xl": "12px",
      full: "9999px",
    },
  },
  plugins: [],
};
