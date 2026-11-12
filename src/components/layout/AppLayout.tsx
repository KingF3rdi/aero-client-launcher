import type { ReactNode } from "react";
import { HeaderBar } from "./HeaderBar";
import { Background } from "../effects/Background";

interface AppLayoutProps {
  activeTab: string;
  onNavChange: (id: string) => void;
  children: ReactNode;
}

/** Window frame like the mod's menu: the sky behind, a slim title bar, the page below. No sidebar. */
export function AppLayout({ activeTab, onNavChange, children }: AppLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative bg-bg">
      <Background />
      <HeaderBar activeTab={activeTab} onHome={() => onNavChange("play")} />
      <div className="flex-1 overflow-y-auto relative z-10">{children}</div>
    </div>
  );
}
