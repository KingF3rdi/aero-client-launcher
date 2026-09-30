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
    <div data-tauri-drag-region className="h-14 flex-shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-lg flex items-center gap-3 pl-6 pr-3 relative z-10">
      <h1 data-tauri-drag-region className="text-[15px] font-bold text-white">
        Aero Client
      </h1>
      <span data-tauri-drag-region className="flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-white/5 text-[11px] text-white/60 mr-auto">
        <i className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
        {online === null ? "–" : `${online.toLocaleString("de-DE")} online`}
      </span>

      <UserProfileBar />

      <div className="flex items-center ml-1">
        <WindowButton icon="solar:minus-square-linear" title="Minimieren" onClick={() => win?.minimize()} />
        <WindowButton icon="solar:maximize-square-linear" title="Maximieren" onClick={() => win?.toggleMaximize()} />
        <WindowButton icon="solar:close-square-linear" title="Schließen" danger onClick={() => win?.close()} />
      </div>
    </div>
  );
}

function WindowButton({ icon, title, danger, onClick }: { icon: string; title: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center text-white/50 transition-colors cursor-pointer ${danger ? "hover:bg-danger hover:text-white" : "hover:bg-white/10 hover:text-white"}`}
    >
      <Icon icon={icon} width={18} height={18} />
    </button>
  );
}
