import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { useThemeStore } from "../../store/useThemeStore";
import { InstanceSettingsModal } from "./InstanceSettingsModal";
import { SkinStage } from "./SkinStage";
import { NewsPanel } from "./NewsPanel";

const SERVER_KEY = "aero-launcher.server";
const RECENT_KEY = "aero-launcher.servers";

function recentServers(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Home page: your skin in the middle, a big Launch button with the active profile, news on the right. */
export function PlayView() {
  const { account } = useAuthStore();
  const { instances, selectedId, launch, launchedInstanceId, loadInstances, select, play, stop } = useInstanceStore();
  const skinAnimation = useThemeStore((s) => s.skinAnimation);
  const [picker, setPicker] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [server, setServer] = useState(() => localStorage.getItem(SERVER_KEY) ?? "");
  const [recent, setRecent] = useState(recentServers);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent) => pickerRef.current && !pickerRef.current.contains(e.target as Node) && setPicker(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [picker]);

  const selected = instances.find((i) => i.id === selectedId) ?? null;
  const isThisLaunching = !!selected && launchedInstanceId === selected.id;
  const busy = isThisLaunching && launch.phase !== "idle" && launch.phase !== "error" && launch.phase !== "running";
  const running = isThisLaunching && launch.phase === "running";
  const status = isThisLaunching && launch.phase !== "idle" ? launch.message : null;

  const start = () => {
    if (!account) return;
    const addr = server.trim();
    localStorage.setItem(SERVER_KEY, addr);
    if (addr) {
      const next = [addr, ...recent.filter((s) => s !== addr)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecent(next);
    }
    play(account, undefined, addr || undefined);
  };

  return (
    <div className="flex h-full">
      <main className="flex-1 relative flex flex-col items-center min-w-0">
        {account && (
          <>
            <div className="absolute inset-x-0 top-16 bottom-44">
              <SkinStage uuid={account.uuid} skinUrl={account.skinUrl ?? null} animate={skinAnimation} />
            </div>
            <div className="relative z-10 mt-8 px-4 py-1.5 rounded-full bg-black/50 border border-white/10 text-white text-lg font-semibold">{account.name}</div>
          </>
        )}

        <div className="mt-auto mb-8 relative z-10 flex flex-col items-center gap-2.5" ref={pickerRef}>
          <div className="flex items-stretch h-14 rounded-2xl border border-white/15 bg-black/50 backdrop-blur overflow-hidden shadow-glow">
            <button
              onClick={() => setPicker((v) => !v)}
              title="Profil wählen"
              className="w-64 flex items-center gap-3 px-4 rounded-none hover:bg-white/5 transition-colors cursor-pointer text-left"
            >
              <Icon icon="solar:box-bold" width={20} height={20} className="text-accent shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold truncate">{selected ? selected.name : "Kein Profil"}</span>
                <span className="block text-[11px] text-white/40">{selected ? `Fabric ${selected.mcVersion}` : "Profil wählen"}</span>
              </span>
              <Icon icon="solar:alt-arrow-up-bold" width={16} height={16} className={clsx("text-white/50 transition-transform", !picker && "rotate-180")} />
            </button>
            <button
              disabled={!account || !selected}
              onClick={() => (busy || running ? stop() : start())}
              className={clsx(
                "label-mc w-52 flex items-center justify-center gap-2.5 rounded-none text-lg text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                busy || running ? "bg-danger hover:brightness-110" : "bg-accent hover:brightness-110",
              )}
            >
              <Icon icon={busy || running ? "solar:stop-bold" : "solar:play-bold"} width={20} height={20} />
              {busy ? "Abbrechen" : running ? "Stop" : "Launch"}
            </button>
          </div>

          {/* Quick join: with an address here, Launch goes straight onto that server. */}
          <label className="flex items-center gap-2 h-9 w-[29rem] max-w-full px-3 rounded-full border border-white/10 bg-black/40 text-white/50 focus-within:border-accent/60">
            <Icon icon="solar:server-bold" width={15} height={15} className={server.trim() ? "text-accent" : ""} />
            <input
              value={server}
              onChange={(e) => setServer(e.target.value)}
              list="recent-servers"
              spellCheck={false}
              placeholder="Direkt auf einen Server (optional), z. B. play.example.net"
              className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-white/35 focus:outline-none"
            />
            {server && (
              <button onClick={() => setServer("")} title="Leeren" className="text-white/40 hover:text-white cursor-pointer">
                <Icon icon="solar:close-circle-bold" width={15} height={15} />
              </button>
            )}
            <datalist id="recent-servers">
              {recent.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          {picker && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-white/15 bg-[#110f19]/95 backdrop-blur-xl max-h-72 overflow-y-auto">
              {instances.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    select(i.id);
                    setPicker(false);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-none text-left cursor-pointer transition-colors",
                    i.id === selectedId ? "bg-accent/25" : "hover:bg-white/5",
                  )}
                >
                  <Icon icon="solar:box-bold" width={18} height={18} className="text-accent" />
                  <span className="text-[13px] font-semibold flex-1">{i.name}</span>
                  <span className="text-xs text-white/40">{i.mcVersion}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setPicker(false);
                  setSettingsOpen(true);
                }}
                disabled={!selected}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-none text-[13px] font-semibold text-accent border-t border-white/10 hover:bg-accent/10 cursor-pointer"
              >
                <Icon icon="solar:settings-bold" width={18} height={18} />
                Profil-Einstellungen
              </button>
            </div>
          )}

          <span className={clsx("text-xs h-4", launch.phase === "error" && isThisLaunching ? "text-danger" : "text-white/50")}>
            {status ?? ""}
          </span>
        </div>
      </main>

      <NewsPanel />

      {settingsOpen && selected && (
        <InstanceSettingsModal key={selected.id} instance={selected} initialTab="content" onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
