import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { InstanceSettingsModal, type Tab } from "./InstanceSettingsModal";
import { AddInstanceModal } from "./AddInstanceModal";
import { ModCountBadge } from "./ModCountBadge";
import { Button } from "../ui/Button";

/** Full-grid overview of every instance - the "instances" nav tab, separate from
 * Play's compact sidebar list. */
export function InstancesView() {
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const { instances, loadInstances, select, play } = useInstanceStore();
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<Tab>("content");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const settingsInstance = instances.find((i) => i.id === settingsFor) ?? null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="label-mc text-lg">Profile</h2>
        <Button variant="accent" size="sm" onClick={() => setAdding(true)}>
          <Icon icon="solar:add-circle-bold" width={16} height={16} />
          Neues Profil
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {instances.map((instance) => (
          <div
            key={instance.id}
            className="group relative flex flex-col items-start gap-3 bg-black/30 border-2 border-accent/30 backdrop-blur p-5 hover:border-accent/40 hover:bg-accent/10 transition-all"
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
                <div className="text-xs text-white/40 flex items-center gap-1.5">
                  <span>
                    {instance.loader === "fabric" ? "Fabric" : "Vanilla"} · {instance.mcVersion}
                    {instance.modEnabled && " · Aero Client"}
                  </span>
                  <ModCountBadge instanceId={instance.id} />
                </div>
              </div>
            </button>
            <div className="absolute top-3 right-3 flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  account && play(account, instance.id);
                }}
                title="Starten"
                className="w-7 h-7 flex items-center justify-center rounded-md text-white/0 group-hover:text-accent hover:!bg-accent/20 transition-all cursor-pointer"
              >
                <Icon icon="solar:play-bold" width={16} height={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModalTab("logs");
                  setSettingsFor(instance.id);
                }}
                title="Logs"
                className="w-7 h-7 flex items-center justify-center rounded-md text-white/0 group-hover:text-white/50 hover:!text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <Icon icon="solar:document-text-bold" width={16} height={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModalTab("content");
                  setSettingsFor(instance.id);
                }}
                title="Instanz-Einstellungen"
                className="w-7 h-7 flex items-center justify-center rounded-md text-white/0 group-hover:text-white/50 hover:!text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <Icon icon="solar:settings-bold" width={16} height={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {settingsInstance && (
        <InstanceSettingsModal
          key={settingsInstance.id}
          instance={settingsInstance}
          initialTab={modalTab}
          onClose={() => setSettingsFor(null)}
        />
      )}
      {adding && <AddInstanceModal onClose={() => setAdding(false)} />}
    </div>
  );
}
