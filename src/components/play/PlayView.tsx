import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "../ui/Icon";
import { LarpMark } from "../ui/LarpMark";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { InstanceSettingsModal } from "./InstanceSettingsModal";
import { PAGES } from "../layout/pages";

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

/**
 * Home, laid out like the mod's menu: the big Aero title, the launch card (the selected, biggest card) and a row
 * of page cards with line icons below it.
 */
export function PlayView({ onOpen, onAddInstance }: { onOpen: (id: string) => void; onAddInstance: () => void }) {
  const { account } = useAuthStore();
  const { instances, selectedId, launch, launchedInstanceId, loadInstances, select, play, stop } = useInstanceStore();
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
    <div className="min-h-full flex flex-col items-center px-6 pt-[7vh] pb-8">
      <div className="flex items-center gap-4">
        <LarpMark size={46} />
        <h1 className="m-0 text-[54px] font-bold leading-none tracking-tight text-white">Aero</h1>
      </div>
      <p className="mt-3 text-sm text-white/55">{account ? `Willkommen zurück, ${account.name}` : " "}</p>

      {/* The launch card: the "selected" card of the home row, bigger and with the accent rim. */}
      <div ref={pickerRef} className="relative mt-10 w-[34rem] max-w-full rounded-xl border border-accent/70 bg-[#0f0e15]/95 p-4 shadow-[0_0_0_1px_rgba(0,0,0,.35)]">
        <div className="flex items-stretch gap-3 h-14">
          <button
            onClick={() => setPicker((v) => !v)}
            title="Profil wählen"
            className="flex-1 min-w-0 flex items-center gap-3 px-3 rounded-lg border border-white/10 bg-white/[0.03] hover:border-white/25 cursor-pointer text-left"
          >
            <Icon icon="box" width={20} height={20} className="text-accent shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold truncate text-white">{selected ? selected.name : "Kein Profil"}</span>
              <span className="block text-[12px] text-white/45">{selected ? `Fabric ${selected.mcVersion}` : "Profil wählen"}</span>
            </span>
            <Icon icon="alt-arrow-down" width={16} height={16} className={clsx("text-white/50 transition-transform", picker && "rotate-180")} />
          </button>
          <button
            disabled={!account || !selected}
            onClick={() => (busy || running ? stop() : start())}
            className={clsx(
              "w-44 flex items-center justify-center gap-2.5 rounded-lg text-[15px] font-bold tracking-wide text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110",
              busy || running ? "bg-danger" : "bg-accent",
            )}
          >
            <Icon icon={busy || running ? "stop-bold" : "play-bold"} width={18} height={18} />
            {busy ? "Abbrechen" : running ? "Stop" : "Spielen"}
          </button>
        </div>

        {/* Quick join: with an address here, Spielen goes straight onto that server. */}
        <label className="mt-3 flex items-center gap-2 h-10 px-3 rounded-lg border border-white/10 bg-white/[0.03] text-white/50 focus-within:border-accent/70">
          <Icon icon="server" width={16} height={16} className={server.trim() ? "text-accent" : ""} />
          <input
            value={server}
            onChange={(e) => setServer(e.target.value)}
            list="recent-servers"
            spellCheck={false}
            placeholder="Direkt auf einen Server (optional), z. B. play.example.net"
            className="flex-1 min-w-0 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none"
          />
          {server && (
            <button onClick={() => setServer("")} title="Leeren" className="text-white/40 hover:text-white cursor-pointer">
              <Icon icon="close-circle" width={16} height={16} />
            </button>
          )}
          <datalist id="recent-servers">
            {recent.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>

        <p className={clsx("mt-2 mb-0 text-xs h-4", launch.phase === "error" && isThisLaunching ? "text-danger" : "text-white/50")}>{status ?? ""}</p>

        {picker && (
          <div className="absolute left-4 right-4 top-[4.75rem] z-20 rounded-lg border border-white/15 bg-[#121119] max-h-72 overflow-y-auto shadow-[0_12px_30px_rgba(0,0,0,.5)]">
            {instances.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  select(i.id);
                  setPicker(false);
                }}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-none text-left cursor-pointer",
                  i.id === selectedId ? "bg-accent/20" : "hover:bg-white/5",
                )}
              >
                <Icon icon="box" width={18} height={18} className="text-accent" />
                <span className="text-[13px] font-semibold flex-1">{i.name}</span>
                <span className="text-xs text-white/40">{i.mcVersion}</span>
              </button>
            ))}
            <div className="flex border-t border-white/10">
              <button
                onClick={() => {
                  setPicker(false);
                  setSettingsOpen(true);
                }}
                disabled={!selected}
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-none text-[13px] font-semibold text-accent hover:bg-accent/10 cursor-pointer"
              >
                <Icon icon="settings" width={16} height={16} />
                Profil-Einstellungen
              </button>
              <button
                onClick={() => {
                  setPicker(false);
                  onAddInstance();
                }}
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-none text-[13px] font-semibold text-white/75 hover:bg-white/5 cursor-pointer"
              >
                <Icon icon="add-square" width={16} height={16} />
                Neues Profil
              </button>
            </div>
          </div>
        )}
      </div>

      <nav aria-label="Bereiche" className="mt-8 flex flex-wrap justify-center gap-3 max-w-[70rem]">
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="w-[7.5rem] h-[7.25rem] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#0f0e15]/90 shadow-[0_0_0_1px_rgba(0,0,0,.35)] text-white hover:border-white/30 hover:bg-[#16151e]/95 hover:-translate-y-0.5 transition-transform cursor-pointer"
          >
            <span className="w-11 h-11 mb-1 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.06]">
              <Icon icon={p.icon} width={24} height={24} />
            </span>
            <span className="text-[14px] font-semibold">{p.label}</span>
            <span className="text-[11.5px] text-white/45">{p.desc}</span>
          </button>
        ))}
      </nav>

      {settingsOpen && selected && (
        <InstanceSettingsModal key={selected.id} instance={selected} initialTab="content" onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
