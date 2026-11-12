import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Icon } from "../ui/Icon";
import { LarpMark } from "../ui/LarpMark";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { InstanceSettingsModal, type Tab as SettingsTab } from "./InstanceSettingsModal";

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
 * Home: a plain dark screen with the Aero mark and name, four small info cards (RAM, account, mods, version)
 * and one white launch button. Everything else lives in the tabs of the title bar.
 */
export function PlayView({ onOpen, onAddInstance }: { onOpen: (id: string) => void; onAddInstance: () => void }) {
  const { account } = useAuthStore();
  const { instances, selectedId, launch, launchedInstanceId, loadInstances, select, play, stop, fetchContent } = useInstanceStore();
  const [picker, setPicker] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const [server, setServer] = useState(() => localStorage.getItem(SERVER_KEY) ?? "");
  const [recent, setRecent] = useState(recentServers);
  const [mods, setMods] = useState<number | null>(null);
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

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    fetchContent(selected.id)
      .then((files) => alive && setMods(files.filter((f) => f.kind === "mod").length))
      .catch(() => alive && setMods(null));
    return () => {
      alive = false;
    };
  }, [selected?.id, fetchContent]);

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
    <div className="min-h-full flex flex-col items-center justify-center px-6 pb-14">
      <LarpMark size={68} tone="metal" />
      <h1 className="mt-4 mb-0 text-[26px] font-semibold tracking-tight text-white">Aero Client</h1>

      <div className="mt-8 grid grid-cols-4 gap-3 w-[46rem] max-w-full">
        <InfoCard icon="server" label="RAM" value={`${selected?.ramGb ?? 4} GB`} onClick={() => selected && setSettingsTab("general")} />
        <InfoCard icon="user-id" label="Account" value={account?.name ?? "–"} onClick={() => onOpen("skins")} />
        <InfoCard icon="widget" label="Mods" value={mods === null ? "Mods verwalten" : `${mods} ${mods === 1 ? "Mod" : "Mods"}`} onClick={() => selected && setSettingsTab("content")} />
        <div ref={pickerRef} className="relative">
          <InfoCard icon="box" label="Version" value={selected ? `Fabric ${selected.mcVersion}` : "Profil wählen"} onClick={() => setPicker((v) => !v)} />
          {picker && (
            <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-xl border border-white/10 bg-[#141416] max-h-72 overflow-y-auto shadow-[0_16px_40px_rgba(0,0,0,.6)]">
              {instances.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    select(i.id);
                    setPicker(false);
                  }}
                  className={clsx("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-none text-left cursor-pointer", i.id === selectedId ? "bg-white/[0.08]" : "hover:bg-white/[0.04]")}
                >
                  <span className="text-[13px] font-medium flex-1 truncate">{i.name}</span>
                  <span className="text-xs text-white/55">{i.mcVersion}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setPicker(false);
                  onAddInstance();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-none text-[13px] font-medium text-white/80 border-t border-white/[0.07] hover:bg-white/[0.04] cursor-pointer"
              >
                <Icon icon="add-square" width={15} height={15} />
                Neues Profil
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        disabled={!account || !selected}
        onClick={() => (busy || running ? stop() : start())}
        className={clsx(
          "mt-8 h-11 w-48 flex items-center justify-center gap-2 rounded-xl text-[14px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
          busy || running ? "bg-danger text-white hover:brightness-110" : "bg-white text-black hover:bg-white/85",
        )}
      >
        <Icon icon={busy || running ? "stop-bold" : "play-bold"} width={15} height={15} />
        {busy ? "Abbrechen" : running ? "Stop" : "Spielen"}
      </button>
      <p className={clsx("mt-2.5 mb-0 text-[12px] h-4", launch.phase === "error" && isThisLaunching ? "text-danger" : "text-white/50")}>
        {status ?? (selected ? `Startet ${selected.name} mit Aero Client` : "")}
      </p>

      {/* Quick join: with an address here, Spielen goes straight onto that server. */}
      <label className="mt-4 flex items-center gap-2 h-8 w-72 px-3 rounded-lg border border-white/[0.07] text-white/45 focus-within:border-white/25">
        <Icon icon="server" width={13} height={13} />
        <input
          value={server}
          onChange={(e) => setServer(e.target.value)}
          list="recent-servers"
          spellCheck={false}
          placeholder="Direkt auf einen Server (optional)"
          className="flex-1 min-w-0 bg-transparent text-[12px] text-white placeholder:text-white/40 focus:outline-none"
        />
        <datalist id="recent-servers">
          {recent.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>

      {settingsTab && selected && (
        <InstanceSettingsModal key={selected.id} instance={selected} initialTab={settingsTab} onClose={() => setSettingsTab(null)} />
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, onClick }: { icon: string; label: string; value: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-[5.5rem] flex flex-col items-start justify-between p-3 rounded-xl bg-[#141416] border border-white/[0.07] hover:border-white/20 hover:bg-[#18181b] text-left cursor-pointer transition-colors"
    >
      <span className="w-7 h-7 flex items-center justify-center rounded-md bg-white/[0.06] text-white/85">
        <Icon icon={icon} width={15} height={15} />
      </span>
      <span className="min-w-0 w-full">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
        <span className="block text-[13px] font-medium text-white truncate">{value}</span>
      </span>
    </button>
  );
}
