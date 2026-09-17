import clsx from "clsx";
import { Icon } from "@iconify/react";
import type { Instance } from "../../types/instance";

interface InstanceCardProps {
  instance: Instance;
  selected: boolean;
  onSelect: () => void;
  onSettings?: () => void;
}

export function InstanceCard({ instance, selected, onSelect, onSettings }: InstanceCardProps) {
  return (
    <div
      className={clsx(
        "group relative w-full rounded-xl transition-all border",
        selected
          ? "bg-accent/15 border-accent/40 text-text"
          : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:border-white/10",
      )}
      style={selected ? { boxShadow: "0 0 12px rgba(79,142,255,0.25)" } : undefined}
    >
      <button onClick={onSelect} className="w-full text-left px-4 py-3 cursor-pointer">
        <div className="text-sm font-medium pr-6">{instance.name}</div>
        <div className="text-xs text-white/40">{instance.loader === "fabric" ? "Fabric" : "Vanilla"} · {instance.mcVersion}</div>
      </button>
      {onSettings && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSettings();
          }}
          title="Instanz-Einstellungen"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md text-white/0 group-hover:text-white/50 hover:!text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <Icon icon="solar:settings-bold" width={14} height={14} />
        </button>
      )}
    </div>
  );
}
