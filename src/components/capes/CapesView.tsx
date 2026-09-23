import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { invoke } from "../../lib/tauri";
import { useInstanceStore } from "../../store/useInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";
import type { CapeSummary } from "../../types/cape";
import { Button } from "../ui/Button";
import { CapeThumb } from "./CapeThumb";

/**
 * Community capes: browse what other Aero players published and equip one for the selected
 * instance, or publish your own. Equipping writes straight into that instance's Fabric mod config
 * (equippedCape) - it only reliably takes effect while the instance isn't currently running.
 */
export function CapesView() {
  const { account } = useAuthStore();
  const { instances, selectedId, select } = useInstanceStore();
  const [capes, setCapes] = useState<CapeSummary[] | null>(null);
  const [equipped, setEquipped] = useState<string>("none");
  const [query, setQuery] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const modInstances = instances.filter((i) => i.mcVersion === "1.21.11" && i.modEnabled);
  const target = modInstances.find((i) => i.id === selectedId) ?? modInstances[0] ?? null;

  const loadCapes = () => invoke<CapeSummary[]>("list_capes").then(setCapes).catch(() => setCapes([]));
  const loadEquipped = () => {
    if (!target) return;
    invoke<string>("equipped_cape", { instanceId: target.id }).then(setEquipped);
  };

  useEffect(() => {
    loadCapes();
  }, []);
  useEffect(() => {
    loadEquipped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id]);

  const equip = async (capeId: string | null) => {
    if (!target) return;
    setBusyId(capeId ? Number(capeId.replace("custom_", "")) : -1);
    try {
      await invoke("equip_cape", { instanceId: target.id, capeId });
      setEquipped(capeId ?? "none");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const publish = async () => {
    if (!isTauri()) {
      toast.error("Cape-Upload braucht die native App.");
      return;
    }
    const path = await open({ multiple: false, filters: [{ name: "Cape (64x32 PNG)", extensions: ["png"] }] });
    if (!path || typeof path !== "string") return;
    const fileName = path.split(/[\\/]/).pop() ?? "Cape";
    const name = fileName.replace(/\.png$/i, "");
    setPublishing(true);
    try {
      await invoke("publish_cape", { path, name });
      toast.success(`"${name}" veröffentlicht!`);
      loadCapes();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setPublishing(false);
    }
  };

  const removeCape = async (cape: CapeSummary) => {
    setBusyId(cape.id);
    try {
      await invoke("delete_cape", { capeId: cape.id });
      if (equipped === `custom_${cape.id}`) setEquipped("none");
      loadCapes();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const q = query.trim().toLowerCase();
  const results = (capes ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q));

  return (
    <div className="p-8 flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <h2 className="label-mc text-lg">Custom Capes</h2>
        <Button variant="accent" onClick={publish} disabled={publishing || !account}>
          <Icon icon="solar:upload-minimalistic-bold" width={16} height={16} />
          {publishing ? "Lädt hoch…" : "Cape veröffentlichen (PNG, 64x32)"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Capes durchsuchen…"
          className="flex-1 h-10 bg-black/40 border border-white/15 px-3 text-sm focus:outline-none focus:border-accent/60"
        />
        {modInstances.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/40">Für Profil</span>
            <select
              value={target?.id ?? ""}
              onChange={(e) => select(e.target.value)}
              className="h-10 bg-black/40 border border-white/15 px-2 text-xs focus:outline-none focus:border-accent/60"
            >
              {modInstances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {modInstances.length === 0 && (
        <p className="text-xs text-white/40 -mt-2">
          Kein Profil mit aktiviertem Aero Client (nur für Fabric 1.21.11) - Capes können angesehen, aber nicht angezogen werden.
        </p>
      )}

      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 content-start">
        {capes === null && <p className="text-sm text-white/40 col-span-3">Lädt…</p>}
        {capes?.length === 0 && <p className="text-sm text-white/40 col-span-3">Noch keine Capes veröffentlicht.</p>}
        {capes && capes.length > 0 && results.length === 0 && <p className="text-sm text-white/40 col-span-3">Keine Treffer für "{query}".</p>}
        {results.map((cape) => {
          const capeId = `custom_${cape.id}`;
          const isEquipped = equipped === capeId;
          const isMine = account && cape.ownerUuid.replace(/-/g, "").toLowerCase() === account.uuid.replace(/-/g, "").toLowerCase();
          const busy = busyId === cape.id;
          return (
            <div
              key={cape.id}
              className="flex items-center gap-3 bg-black/30 border border-white/15 p-4"
            >
              <div className="w-16 h-16 shrink-0 bg-black/40 flex items-center justify-center">
                <CapeThumb id={cape.id} scale={3} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{cape.name}</div>
                <p className="text-xs text-white/40 truncate">von {cape.owner}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant={isEquipped ? "accent" : "ghost"}
                    size="sm"
                    disabled={!target || busy}
                    onClick={() => equip(isEquipped ? null : capeId)}
                  >
                    {isEquipped ? "Angezogen" : "Anziehen"}
                  </Button>
                  {isMine && (
                    <button
                      onClick={() => removeCape(cape)}
                      disabled={busy}
                      title="Löschen"
                      className="text-white/30 hover:text-danger transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
