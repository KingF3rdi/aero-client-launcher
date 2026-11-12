import { create } from "zustand";

export type BackgroundEffect = "dusk" | "particles" | "grid" | "plain";

interface ThemeState {
  accent: string;
  animations: boolean;
  /** Minimize the launcher window once the game has started. */
  minimizeOnLaunch: boolean;
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
  minimizeOnLaunch: false,
  background: "dusk" as BackgroundEffect,
};

function load(): typeof DEFAULTS {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    // 1.7.0 redesign: everyone starts once on the new dusk sky; a later pick sticks.
    if (saved.look !== 2) {
      saved.look = 2;
      saved.background = "dusk";
    }
    return { ...DEFAULTS, ...saved };
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
