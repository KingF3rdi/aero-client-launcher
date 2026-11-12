import type { ReactNode } from "react";
import { HeaderBar } from "./HeaderBar";
import { Background } from "../effects/Background";

interface AppLayoutProps {
  activeTab: string;
  onNavChange: (id: string) => void;
  children: ReactNode;
}

/** Window frame: the background effect, a title bar with the page tabs, the page below. */
export function AppLayout({ activeTab, onNavChange, children }: AppLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative bg-bg">
      <Background />
      <HeaderBar activeTab={activeTab} onOpen={onNavChange} />
      <div className="flex-1 overflow-y-auto relative z-10">{children}</div>
    </div>
  );
}
