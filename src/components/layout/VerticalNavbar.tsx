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

/**
 * Sidebar: brand on top, pages in the middle, new profile and settings at the bottom. With labels on it is a
 * wide list of rows (icon + name); with labels off it folds into a slim icon rail.
 */
export function VerticalNavbar({ items, activeItem, onItemClick, onAddInstance }: VerticalNavbarProps) {
  const wide = useThemeStore((s) => s.sidebarLabels);
  return (
    <nav
      aria-label="Seiten"
      className={clsx(
        "h-full flex flex-col border-r border-white/[0.08] bg-[#0e0d14]/80 backdrop-blur-xl py-5 gap-1 relative z-10 shrink-0",
        wide ? "w-[216px] px-3" : "w-[76px] px-2.5 items-center",
      )}
    >
      <div data-tauri-drag-region className={clsx("flex items-center gap-2.5 mb-5", wide ? "px-2" : "justify-center")}>
        <LarpMark size={30} />
        {wide && (
          <div data-tauri-drag-region className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold text-white tracking-tight">Aero Client</span>
            <span className="text-[11px] text-white/45">Launcher</span>
          </div>
        )}
      </div>
      {items.map((item) => (
        <NavButton key={item.id} item={item} active={activeItem === item.id} wide={wide} onClick={() => onItemClick(item.id)} />
      ))}
      <div className={clsx("mt-auto flex flex-col gap-1", !wide && "items-center")}>
        <NavButton item={{ id: "new", label: "Neues Profil", icon: "solar:add-square-bold" }} active={false} wide={wide} onClick={onAddInstance} />
        <NavButton
          item={{ id: "settings", label: "Optionen", icon: "solar:settings-bold" }}
          active={activeItem === "settings"}
          wide={wide}
          onClick={() => onItemClick("settings")}
        />
      </div>
    </nav>
  );
}

function NavButton({ item, active, wide, onClick }: { item: NavItem; active: boolean; wide: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center rounded-xl transition-colors cursor-pointer h-11",
        wide ? "w-full gap-3 px-3 text-[13.5px] font-semibold" : "w-12 justify-center",
        active ? "text-white bg-white/[0.09] border border-white/10" : "text-white/55 border border-transparent hover:text-white hover:bg-white/[0.05]",
      )}
    >
      <Icon icon={item.icon} width={20} height={20} className={active ? "text-accent" : ""} />
      {wide && <span>{item.label}</span>}
    </button>
  );
}
