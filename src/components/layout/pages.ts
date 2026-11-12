/** The launcher's pages: the home card row and the header title both read from this list. */
export interface Page {
  id: string;
  label: string;
  desc: string;
  icon: string;
}

export const PAGES: Page[] = [
  { id: "instances", label: "Profile", desc: "Versionen und Mods", icon: "box" },
  { id: "discover", label: "Mods", desc: "Mods finden", icon: "widget" },
  { id: "cosmetics", label: "Cosmetics", desc: "Capes, Flügel, Hüte", icon: "magic-stick-3" },
  { id: "skins", label: "Skins", desc: "Skin und Name", icon: "t-shirt" },
  { id: "presets", label: "Presets", desc: "Configs teilen", icon: "tuning-2" },
  { id: "screenshots", label: "Shots", desc: "Screenshots", icon: "gallery" },
  { id: "news", label: "News", desc: "Updates", icon: "document-text" },
  { id: "settings", label: "Optionen", desc: "Launcher", icon: "settings" },
];
