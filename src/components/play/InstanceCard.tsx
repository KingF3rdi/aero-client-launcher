import clsx from "clsx";
import type { Instance } from "../../types/instance";

interface InstanceCardProps {
  instance: Instance;
  selected: boolean;
  onSelect: () => void;
}

export function InstanceCard({ instance, selected, onSelect }: InstanceCardProps) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full text-left rounded-xl px-4 py-3 transition-all cursor-pointer border",
        selected
          ? "bg-accent/15 border-accent/40 text-text"
          : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:border-white/10",
      )}
      style={selected ? { boxShadow: "0 0 12px rgba(196,181,253,0.25)" } : undefined}
    >
      <div className="text-sm font-medium">{instance.name}</div>
      <div className="text-xs text-white/40">{instance.loader === "fabric" ? "Fabric" : "Vanilla"} · {instance.mcVersion}</div>
    </button>
  );
}
