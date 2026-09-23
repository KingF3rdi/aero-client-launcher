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
        sans: ["Segoe UI", "Inter", "system-ui", "sans-serif"],
        mc: ["Monocraft", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgb(var(--accent) / 0.25)",
      },
    },
    // Blocky, NoRisk-style look everywhere: near-square corners (full stays round for dots).
    borderRadius: {
      none: "0",
      sm: "2px",
      DEFAULT: "2px",
      md: "2px",
      lg: "3px",
      xl: "3px",
      "2xl": "4px",
      full: "9999px",
    },
  },
  plugins: [],
};
