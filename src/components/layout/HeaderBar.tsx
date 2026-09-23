import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { UserProfileBar } from "../account/UserProfileBar";

const STATS_URL = "https://aero.gamekni9ht.workers.dev/api/stats";

/** Custom titlebar (the window is decoration-less): brand + live player count, account, window buttons. */
export function HeaderBar() {
  const win = isTauri() ? getCurrentWindow() : null;
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
      className="h-16 flex-shrink-0 border-b border-accent/40 bg-accent/5 backdrop-blur-lg flex items-center gap-3 px-6 relative z-10"
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
