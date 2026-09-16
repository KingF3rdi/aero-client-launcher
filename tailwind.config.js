/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Same palette as the Larp Launcher Fabric mod's ClickGUI (UiDraw.ACCENT etc.),
        // itself matched to NoRiskClient's actual blue/cyan tokens (tailwind.config.js
        // "norisk"/"cyan" swatches in their repo) - so both apps and the mod read as one product.
        bg: "#121212",
        bar: "#1a1a1a",
        card: "#1e1e1e",
        pill: "#262626",
        text: "#eceaf2",
        muted: "#8e8a9a",
        accent: "#4f8eff",
        "accent-dim": "#2e5a8a",
        green: "#3dff8a",
        danger: "#e05555",
      },
      fontFamily: {
        sans: ["Segoe UI", "Inter", "system-ui", "sans-serif"],
        mc: ["Monocraft", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(79,142,255,0.25)",
      },
    },
  },
  plugins: [],
};
