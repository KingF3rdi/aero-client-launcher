/** The launcher's pages: the tabs in the title bar read from this list. */
export interface Page {
  id: string;
  label: string;
  icon: string;
}

export const PAGES: Page[] = [
  { id: "play", label: "Spielen", icon: "play" },
  { id: "instances", label: "Profile", icon: "box" },
  { id: "discover", label: "Mods", icon: "widget" },
  { id: "cosmetics", label: "Cosmetics", icon: "magic-stick-3" },
  { id: "skins", label: "Skins", icon: "t-shirt" },
  { id: "presets", label: "Presets", icon: "tuning-2" },
  { id: "screenshots", label: "Shots", icon: "gallery" },
  { id: "settings", label: "Optionen", icon: "settings" },
];
