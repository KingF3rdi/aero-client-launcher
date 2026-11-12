import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { UserProfileBar } from "../account/UserProfileBar";
import { LarpMark } from "../ui/LarpMark";
import { PAGES } from "./pages";

const STATS_URL = "https://aero.gamekni9ht.workers.dev/api/stats";

/**
 * Custom titlebar (the window is decoration-less): brand (or Back + page title on a subpage), live player count,
 * account, window buttons.
 */
export function HeaderBar({ activeTab, onHome }: { activeTab: string; onHome: () => void }) {
  const page = PAGES.find((p) => p.id === activeTab);
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
    <div data-tauri-drag-region className="h-14 flex-shrink-0 flex items-center gap-3 pl-4 pr-3 relative z-10">
      {page ? (
        <>
          <button
            onClick={onHome}
            className="h-8 flex items-center gap-1.5 pl-2 pr-3 rounded-lg bg-[#0f0e15]/90 border border-white/10 text-[13px] font-semibold text-white/80 hover:text-white hover:border-white/25 cursor-pointer"
          >
            <Icon icon="alt-arrow-down" width={16} height={16} className="rotate-90" />
            Start
          </button>
          <span data-tauri-drag-region className="text-[15px] font-semibold text-white">
            {page.label}
          </span>
        </>
      ) : (
        <span data-tauri-drag-region className="flex items-center gap-2 text-[15px] font-bold text-white">
          <LarpMark size={20} />
          Aero
        </span>
      )}
      <span data-tauri-drag-region className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#0f0e15]/80 border border-white/[0.08] text-[11.5px] font-medium text-white/70 mr-auto ml-2">
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
