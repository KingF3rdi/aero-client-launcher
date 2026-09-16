import { Icon } from "@iconify/react";
import clsx from "clsx";
import { LarpMark } from "../ui/LarpMark";

export interface NavItem {
  id: string;
  label: string;
  /** Iconify icon name, e.g. "solar:play-bold" - same Solar icon set NoRiskClient uses. */
  icon: string;
}

interface VerticalNavbarProps {
  items: NavItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  version: string;
}

const ACCENT = "#4f8eff";

/** Icon rail on the left, active item pilled and glowing - mirrors NoRiskClient's VerticalNavbar. */
export function VerticalNavbar({ items, activeItem, onItemClick, version }: VerticalNavbarProps) {
  return (
    <div
      className="h-full w-20 flex flex-col items-center border-r-2 bg-black/30 backdrop-blur-lg py-4 gap-2 relative z-10"
      style={{ borderColor: `${ACCENT}30` }}
    >
      <LarpMark size={40} className="mb-4" />
      {items.map((item) => {
        const active = activeItem === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            title={item.label}
            className={clsx(
              "flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-all cursor-pointer border",
              active ? "text-white border-accent/50 bg-accent/15" : "text-white/50 border-transparent hover:text-white hover:bg-white/5",
            )}
            style={active ? { boxShadow: `0 0 12px ${ACCENT}40` } : undefined}
          >
            <Icon icon={item.icon} width={22} height={22} />
            <span className="text-[10px] tracking-wide">{item.label}</span>
          </button>
        );
      })}
      <div className="mt-auto text-[10px] text-white/30">{version}</div>
    </div>
  );
}
