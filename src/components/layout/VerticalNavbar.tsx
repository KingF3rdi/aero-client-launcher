import { Icon } from "@iconify/react";
import clsx from "clsx";
import { LarpMark } from "../ui/LarpMark";
import { useThemeStore } from "../../store/useThemeStore";

export interface NavItem {
  id: string;
  label: string;
  /** Iconify icon name, e.g. "solar:play-bold". */
  icon: string;
}

interface VerticalNavbarProps {
  items: NavItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  onAddInstance: () => void;
}

/** Icon rail: logo on top, pages in the middle, settings pinned to the bottom. The active page is a filled pill. */
export function VerticalNavbar({ items, activeItem, onItemClick, onAddInstance }: VerticalNavbarProps) {
  const labels = useThemeStore((s) => s.sidebarLabels);
  return (
    <div className="h-full w-[88px] flex flex-col items-center border-r border-white/10 bg-black/30 backdrop-blur-lg py-4 gap-1.5 relative z-10">
      <button onClick={onAddInstance} title="Neues Profil" className="mb-3 cursor-pointer transition-transform hover:scale-105">
        <LarpMark size={34} />
      </button>
      {items.map((item) => (
        <NavButton key={item.id} item={item} active={activeItem === item.id} labels={labels} onClick={() => onItemClick(item.id)} />
      ))}
      <div className="mt-auto">
        <NavButton
          item={{ id: "settings", label: "Optionen", icon: "solar:settings-bold" }}
          active={activeItem === "settings"}
          labels={false}
          onClick={() => onItemClick("settings")}
        />
      </div>
    </div>
  );
}

function NavButton({ item, active, labels, onClick }: { item: NavItem; active: boolean; labels: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={item.label}
      className={clsx(
        "flex flex-col items-center justify-center gap-1 w-[68px] rounded-xl transition-colors cursor-pointer",
        labels ? "h-[58px]" : "h-12",
        active ? "text-white bg-accent/20 shadow-glow" : "text-white/45 hover:text-white hover:bg-white/5",
      )}
    >
      <Icon icon={item.icon} width={22} height={22} className={active ? "text-accent" : ""} />
      {labels && <span className="text-[10px] font-semibold">{item.label}</span>}
    </button>
  );
}
