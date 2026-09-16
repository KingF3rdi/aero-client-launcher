import type { ReactNode } from "react";
import { VerticalNavbar, type NavItem } from "./VerticalNavbar";
import { HeaderBar } from "./HeaderBar";
import { ParticleField } from "../effects/ParticleField";

const NAV_ITEMS: NavItem[] = [
  { id: "play", label: "Play", icon: "solar:play-bold" },
  { id: "instances", label: "Instanzen", icon: "solar:box-bold" },
  { id: "settings", label: "Optionen", icon: "solar:settings-bold" },
];

interface AppLayoutProps {
  activeTab: string;
  onNavChange: (id: string) => void;
  children: ReactNode;
}

const ACCENT = "#4f8eff";

/**
 * Same skeleton as NoRiskClient's AppLayout: a near-black glass panel (their
 * background is a darkened tint of the accent color, not a texture pattern)
 * with a glowing accent border on all four edges, icon rail + header +
 * scrollable content, a drifting particle field behind everything (see
 * ParticleField for why this isn't a full Three.js scene like theirs).
 */
export function AppLayout({ activeTab, onNavChange, children }: AppLayoutProps) {
  return (
    <div
      className="h-screen w-screen flex overflow-hidden relative border-2 bg-black/50 backdrop-blur-lg"
      style={{
        backgroundImage: [
          `radial-gradient(ellipse at 30% 20%, ${ACCENT}14, transparent 55%)`,
          "linear-gradient(to bottom right, rgb(7,14,25), rgba(0,0,0,0.92))",
        ].join(", "),
        borderColor: `${ACCENT}30`,
        boxShadow: `0 0 20px ${ACCENT}30, inset 0 0 12px ${ACCENT}15`,
      }}
    >
      <BorderGlow />
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <ParticleField color={ACCENT} />
      </div>

      <VerticalNavbar items={NAV_ITEMS} activeItem={activeTab} onItemClick={onNavChange} version="v0.1.0" />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <HeaderBar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function BorderGlow() {
  const edge = `linear-gradient(to right, transparent, ${ACCENT}80, transparent)`;
  const edgeV = `linear-gradient(to bottom, transparent, ${ACCENT}80, transparent)`;
  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-[2px] z-20" style={{ background: edge }} />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20" style={{ background: edge }} />
      <div className="absolute top-0 bottom-0 left-0 w-[2px] z-20" style={{ background: edgeV }} />
      <div className="absolute top-0 bottom-0 right-0 w-[2px] z-20" style={{ background: edgeV }} />
    </>
  );
}
