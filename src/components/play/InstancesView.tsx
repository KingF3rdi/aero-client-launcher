import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useInstanceStore } from "../../store/useInstanceStore";
import { InstanceSettingsModal } from "./InstanceSettingsModal";
import { AddInstanceModal } from "./AddInstanceModal";

/** Full-grid overview of every instance - the "instances" nav tab, separate from
 * Play's compact sidebar list. */
export function InstancesView() {
  const navigate = useNavigate();
  const { instances, loadInstances, select } = useInstanceStore();
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const settingsInstance = instances.find((i) => i.id === settingsFor) ?? null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-wide">Instanzen</h2>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-lg bg-accent/15 border border-accent/40 text-accent px-3 py-1.5 text-sm hover:bg-accent/25 transition-colors cursor-pointer"
        >
          <Icon icon="solar:add-circle-bold" width={16} height={16} />
          Neue Instanz
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {instances.map((instance) => (
          <div
            key={instance.id}
            className="group relative flex flex-col items-start gap-3 rounded-xl bg-black/30 border border-white/10 backdrop-blur p-5 hover:border-accent/40 hover:bg-accent/10 transition-all"
          >
            <button
              onClick={() => {
                select(instance.id);
                navigate("/play");
              }}
              className="flex flex-col items-start gap-3 w-full text-left cursor-pointer"
            >
              <Icon icon="solar:box-bold" className="text-accent" width={28} height={28} />
              <div>
                <div className="font-medium pr-6">{instance.name}</div>
                <div className="text-xs text-white/40">
                  {instance.loader === "fabric" ? "Fabric" : "Vanilla"} · {instance.mcVersion}
                  {instance.modEnabled && " · Larp Client"}
                </div>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSettingsFor(instance.id);
              }}
              title="Instanz-Einstellungen"
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-white/0 group-hover:text-white/50 hover:!text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <Icon icon="solar:settings-bold" width={16} height={16} />
            </button>
          </div>
        ))}
      </div>

      {settingsInstance && (
        <InstanceSettingsModal instance={settingsInstance} onClose={() => setSettingsFor(null)} />
      )}
      {adding && <AddInstanceModal onClose={() => setAdding(false)} />}
    </div>
  );
}
