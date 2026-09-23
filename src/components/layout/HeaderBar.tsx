import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { UserProfileBar } from "../account/UserProfileBar";
import { useInstanceStore } from "../../store/useInstanceStore";

const STATS_URL = "https://aero.gamekni9ht.workers.dev/api/stats";

/** Custom titlebar (the window is decoration-less): brand + live player count, active profile, account, window buttons. */
export function HeaderBar({ onNavChange }: { onNavChange: (id: string) => void }) {
  const win = isTauri() ? getCurrentWindow() : null;
  const { instances, selectedId } = useInstanceStore();
  const selected = instances.find((i) => i.id === selectedId);
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(STATS_URL)
        .then((r) => r.json())
        .then((s) => alive && setOnline(s.online))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-16 flex-shrink-0 border-b-2 border-accent/40 bg-accent/5 backdrop-blur-lg flex items-center gap-3 px-6 relative z-10"
    >
      <div data-tauri-drag-region className="flex flex-col mr-auto">
        <h1 className="label-mc text-base text-white" style={{ textShadow: "0 0 16px rgb(var(--accent) / 0.6)" }}>
          Aero Client
        </h1>
        <span data-tauri-drag-region className="flex items-center gap-1.5 text-[11px] text-white/50 font-mc">
          <i className="w-1.5 h-1.5 bg-green inline-block" />
          {online === null ? "–" : `${online.toLocaleString("de-DE")} online`}
        </span>
      </div>

      <button
        onClick={() => onNavChange("instances")}
        title="Profile"
        className="label-mc h-10 px-4 flex items-center gap-2 text-[11px] border-2 border-accent/50 bg-black/30 hover:bg-accent/15 transition-colors cursor-pointer"
      >
        <Icon icon="solar:box-bold" width={16} height={16} className="text-accent" />
        {selected ? selected.name : "Kein Profil"}
      </button>

      <UserProfileBar />

      <div className="flex items-center gap-3 ml-3">
        <button onClick={() => win?.minimize()} title="Minimieren" className="text-white/50 hover:text-white transition-colors cursor-pointer">
          <Icon icon="pixel:minus-solid" width={14} height={14} />
        </button>
        <button onClick={() => win?.toggleMaximize()} title="Maximieren" className="text-white/50 hover:text-white transition-colors cursor-pointer">
          <Icon icon="pixel:expand-solid" width={14} height={14} />
        </button>
        <button onClick={() => win?.close()} title="Schließen" className="text-white/50 hover:text-danger transition-colors cursor-pointer">
          <Icon icon="pixel:window-close-solid" width={14} height={14} />
        </button>
      </div>
    </div>
  );
}
