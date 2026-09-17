import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { InstanceCard } from "./InstanceCard";
import { InstanceSettingsModal, type Tab } from "./InstanceSettingsModal";
import { InstanceContentPanel } from "./InstanceContentPanel";
import { Button } from "../ui/Button";

export function PlayView() {
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const { instances, selectedId, ramGb, launch, loadInstances, select, setRam, play } = useInstanceStore();
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<Tab>("content");

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const selected = instances.find((i) => i.id === selectedId) ?? null;
  const settingsInstance = instances.find((i) => i.id === settingsFor) ?? null;
  const busy = launch.phase !== "idle" && launch.phase !== "error" && launch.phase !== "running";

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r-2 border-accent/10 bg-black/20 backdrop-blur p-4 flex flex-col gap-2 overflow-y-auto">
        <span className="text-xs uppercase tracking-wide text-white/40 px-2 pb-1">Instanzen</span>
        {instances.map((instance) => (
          <InstanceCard
            key={instance.id}
            instance={instance}
            selected={instance.id === selectedId}
            onSelect={() => select(instance.id)}
            onSettings={() => {
              setModalTab("content");
              setSettingsFor(instance.id);
            }}
            onLogs={() => {
              setModalTab("logs");
              setSettingsFor(instance.id);
            }}
          />
        ))}
      </aside>

      {settingsInstance && (
        <InstanceSettingsModal
          key={settingsInstance.id}
          instance={settingsInstance}
          initialTab={modalTab}
          onClose={() => setSettingsFor(null)}
        />
      )}

      <main className="flex-1 flex flex-col p-10 gap-6 overflow-hidden">
        {selected && (
          <>
            <div>
              <h2 className="text-3xl font-bold tracking-wide" style={{ textShadow: "0 0 20px rgba(196,181,253,0.4)" }}>
                {selected.name}
              </h2>
              <p className="text-white/40 text-sm mt-1">
                {selected.loader === "fabric" ? "Fabric" : "Vanilla"} · {selected.mcVersion} · Larp Launcher
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <InstanceContentPanel
                instance={selected}
                onBrowse={() => navigate("/discover")}
                onLoadModpack={() => navigate("/discover", { state: { tab: "modpack" } })}
                onSettings={() => {
                  setModalTab("general");
                  setSettingsFor(selected.id);
                }}
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 backdrop-blur px-4 py-3 w-fit shrink-0">
              <label className="text-sm text-white/40 w-24">RAM (GB)</label>
              <input
                type="range"
                min={2}
                max={16}
                value={ramGb}
                onChange={(e) => setRam(Number(e.target.value))}
                className="w-56 accent-accent"
              />
              <span className="text-sm w-8">{ramGb}</span>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <Button
                variant="play"
                disabled={!account || busy}
                onClick={() => account && play(account)}
              >
                <Icon icon="solar:play-bold" width={20} height={20} />
                {busy ? "Wird gestartet…" : "Play"}
              </Button>
              <span className="text-sm text-white/40">{launch.message}</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
