import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mirrors NoRiskClient's Tauri dev setup: fixed port, HMR over the same port
// so Tauri's dev window doesn't fight a random Vite port, and ignore
// src-tauri so a `cargo build` output doesn't trigger a frontend reload.
export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
