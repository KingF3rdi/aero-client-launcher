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

/** Icon rail: logo on top, pages in the middle, settings pinned to the bottom. Active page gets a framed block. */
export function VerticalNavbar({ items, activeItem, onItemClick, onAddInstance }: VerticalNavbarProps) {
  const labels = useThemeStore((s) => s.sidebarLabels);
  return (
    <div className="h-full w-24 flex flex-col items-center border-r border-accent/40 bg-accent/10 backdrop-blur-lg py-4 gap-3 relative z-10">
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
        "relative flex flex-col items-center justify-center gap-1.5 w-16 transition-colors cursor-pointer",
        labels ? "h-16" : "h-12",
        active ? "text-white bg-accent/20" : "text-white/50 hover:text-white hover:bg-white/5",
      )}
    >
      {active && <span className="absolute -left-4 top-2 bottom-2 w-1 bg-accent" />}
      <Icon icon={item.icon} width={24} height={24} className={active ? "text-accent" : ""} />
      {labels && <span className="label-mc text-[9px]">{item.label}</span>}
    </button>
  );
}
