import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useInstanceStore } from "../../store/useInstanceStore";

/** Full-grid overview of every instance - the "instances" nav tab, separate from
 * Play's compact sidebar list. */
export function InstancesView() {
  const navigate = useNavigate();
  const { instances, loadInstances, select } = useInstanceStore();

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 tracking-wide">Instanzen</h2>
      <div className="grid grid-cols-3 gap-4">
        {instances.map((instance) => (
          <button
            key={instance.id}
            onClick={() => {
              select(instance.id);
              navigate("/play");
            }}
            className="flex flex-col items-start gap-3 rounded-xl bg-black/30 border border-white/10 backdrop-blur p-5 text-left hover:border-accent/40 hover:bg-accent/10 transition-all cursor-pointer"
          >
            <Icon icon="solar:box-bold" className="text-accent" width={28} height={28} />
            <div>
              <div className="font-medium">{instance.name}</div>
              <div className="text-xs text-white/40">
                {instance.loader === "fabric" ? "Fabric" : "Vanilla"} · {instance.mcVersion}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
