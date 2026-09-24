import type { ReactNode } from "react";
import { VerticalNavbar, type NavItem } from "./VerticalNavbar";
import { HeaderBar } from "./HeaderBar";
import { Background } from "../effects/Background";

const NAV_ITEMS: NavItem[] = [
  { id: "play", label: "Play", icon: "solar:play-bold" },
  { id: "instances", label: "Profile", icon: "solar:box-bold" },
  { id: "discover", label: "Mods", icon: "solar:widget-5-bold" },
  { id: "skins", label: "Skins", icon: "solar:t-shirt-bold" },
  { id: "capes", label: "Capes", icon: "solar:magic-stick-3-bold" },
  { id: "presets", label: "Presets", icon: "solar:settings-bold" },
];

interface AppLayoutProps {
  activeTab: string;
  onNavChange: (id: string) => void;
  onAddInstance: () => void;
  children: ReactNode;
}

/** Window frame: accent border, icon rail on the left, header on top, scrollable page, background effect behind. */
export function AppLayout({ activeTab, onNavChange, onAddInstance, children }: AppLayoutProps) {
  return (
    <div className="h-screen w-screen flex overflow-hidden relative border border-accent/40 bg-bg">
      <Background />
      <VerticalNavbar items={NAV_ITEMS} activeItem={activeTab} onItemClick={onNavChange} onAddInstance={onAddInstance} />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <HeaderBar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
