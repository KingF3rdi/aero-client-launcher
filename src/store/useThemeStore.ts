import { create } from "zustand";

export type BackgroundEffect = "particles" | "grid" | "plain";

interface ThemeState {
  accent: string;
  animations: boolean;
  skinAnimation: boolean;
  sidebarLabels: boolean;
  background: BackgroundEffect;
  set: (patch: Partial<Omit<ThemeState, "set">>) => void;
}

const KEY = "aero-launcher.theme";

export const ACCENT_PRESETS = [
  "#4f8eff", "#00b4e6", "#9c5fff", "#8b5cf6", "#ec4899", "#10b981", "#059669",
  "#14b8a6", "#f97316", "#f59e0b", "#ef4444", "#f43f5e", "#6366f1", "#64748b",
];

const DEFAULTS = {
  accent: "#4f8eff",
  animations: true,
  skinAnimation: true,
  sidebarLabels: true,
  background: "particles" as BackgroundEffect,
};

function load(): typeof DEFAULTS {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** Writes the accent as CSS variables: --accent (RGB triplet for Tailwind opacity modifiers) and --accent-hex. */
export function applyAccent(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return;
  const root = document.documentElement.style;
  root.setProperty("--accent", `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`);
  root.setProperty("--accent-hex", hex);
}

export const useThemeStore = create<ThemeState>((setState, get) => ({
  ...load(),
  set: (patch) => {
    setState(patch);
    const { set: _ignored, ...rest } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      // storage unavailable: settings just don't persist
    }
    if (patch.accent) applyAccent(patch.accent);
  },
}));

applyAccent(useThemeStore.getState().accent);
