import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { useThemeStore } from "../../store/useThemeStore";
import { InstanceSettingsModal } from "./InstanceSettingsModal";
import { SkinStage } from "./SkinStage";
import { NewsPanel } from "./NewsPanel";

/** Home page: your skin in the middle, a big Launch button with the active profile, news on the right. */
export function PlayView() {
  const { account } = useAuthStore();
  const { instances, selectedId, launch, launchedInstanceId, loadInstances, select, play, stop } = useInstanceStore();
  const skinAnimation = useThemeStore((s) => s.skinAnimation);
  const [picker, setPicker] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  return (
    <div className="flex h-full">
      <main className="flex-1 relative flex flex-col items-center min-w-0">
        {account && (
          <>
            <div className="absolute inset-x-0 top-16 bottom-40">
              <SkinStage uuid={account.uuid} skinUrl={account.skinUrl ?? null} animate={skinAnimation} />
            </div>
            <div className="label-mc relative z-10 mt-8 px-4 py-2 bg-black/60 text-white text-2xl">{account.name}</div>
          </>
        )}

        <div className="mt-auto mb-10 relative z-10 flex flex-col items-center gap-2" ref={pickerRef}>
          <div className="flex">
            <button
              disabled={!account || !selected}
              onClick={() => (busy || running ? stop() : account && play(account))}
              className={clsx(
                "w-96 h-20 flex flex-col items-center justify-center border-2 border-b-4 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                busy || running ? "bg-danger/25 border-danger hover:bg-danger/35" : "bg-accent/20 border-accent hover:bg-accent/30",
              )}
            >
              <span className="label-mc text-2xl text-white">{busy ? "Abbrechen" : running ? "Stop" : "Launch"}</span>
              <span className="text-xs text-white/60 mt-0.5">{selected ? selected.name : "Kein Profil"}</span>
            </button>
            <button
              onClick={() => setPicker((v) => !v)}
              title="Profil wählen"
              className="w-16 h-20 border-2 border-b-4 border-l-0 border-accent bg-accent/20 hover:bg-accent/30 flex items-center justify-center cursor-pointer"
            >
              <Icon icon="solar:alt-arrow-down-bold" width={20} height={20} className={clsx("transition-transform", picker && "rotate-180")} />
            </button>
          </div>

          {picker && (
            <div className="absolute bottom-full mb-2 w-[28rem] border-2 border-accent/60 bg-[#110f19]/95 backdrop-blur-xl max-h-72 overflow-y-auto">
              {instances.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    select(i.id);
                    setPicker(false);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors",
                    i.id === selectedId ? "bg-accent/25" : "hover:bg-white/5",
                  )}
                >
                  <Icon icon="solar:box-bold" width={18} height={18} className="text-accent" />
                  <span className="label-mc text-[11px] flex-1">{i.name}</span>
                  <span className="text-xs text-white/40">{i.mcVersion}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setPicker(false);
                  setSettingsOpen(true);
                }}
                disabled={!selected}
                className="label-mc w-full flex items-center gap-3 px-4 py-3 text-[11px] text-accent border-t-2 border-accent/30 hover:bg-accent/10 cursor-pointer"
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
