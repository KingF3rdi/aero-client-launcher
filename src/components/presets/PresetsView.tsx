import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { invoke } from "../../lib/tauri";
import { useInstanceStore } from "../../store/useInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";
import type { PresetSummary } from "../../types/preset";
import { Button } from "../ui/Button";

/**
 * Shared config presets: publish the selected instance's whole module config so other players can
 * browse and apply it. Applying merges every field from the preset into that instance's
 * aero-client.json (never `apiBase`, so a preset can't repoint the mod at another server) - it
 * only reliably takes effect while the instance isn't currently running.
 */
export function PresetsView() {
  const { account } = useAuthStore();
  const { instances, selectedId, select } = useInstanceStore();
  const [presets, setPresets] = useState<PresetSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [presetName, setPresetName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const modInstances = instances.filter((i) => i.mcVersion === "1.21.11" && i.modEnabled);
  const target = modInstances.find((i) => i.id === selectedId) ?? modInstances[0] ?? null;

  const loadPresets = () => invoke<PresetSummary[]>("list_presets").then(setPresets).catch(() => setPresets([]));

  useEffect(() => {
    loadPresets();
  }, []);

  const apply = async (preset: PresetSummary) => {
    if (!target) return;
    setBusyId(preset.id);
    try {
      await invoke("apply_preset", { instanceId: target.id, presetId: preset.id });
      toast.success(`"${preset.name}" übernommen - wirkt beim nächsten Start von ${target.name}.`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const publish = async () => {
    if (!target) return;
    setPublishing(true);
    const name = presetName.trim() || target.name;
    try {
      await invoke("publish_preset", { instanceId: target.id, name });
      toast.success(`"${name}" veröffentlicht!`);
      setPresetName("");
      loadPresets();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setPublishing(false);
    }
  };

  const removePreset = async (preset: PresetSummary) => {
    setBusyId(preset.id);
    try {
      await invoke("delete_preset", { presetId: preset.id });
      loadPresets();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const q = query.trim().toLowerCase();
  const results = (presets ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q));

  return (
    <div className="p-8 flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <h2 className="label-mc text-lg">Presets</h2>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Presets durchsuchen…"
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

      {modInstances.length === 0 ? (
        <p className="text-xs text-white/40 -mt-2">
          Kein Profil mit aktiviertem Aero Client (nur für Fabric 1.21.11) - Presets können angesehen, aber nicht
          veröffentlicht oder angewendet werden.
        </p>
      ) : (
        <div className="flex items-center gap-3 -mt-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={`Name (Standard: ${target?.name ?? "Preset"})`}
            maxLength={24}
            className="flex-1 h-10 bg-black/40 border border-white/15 px-3 text-sm focus:outline-none focus:border-accent/60"
          />
          <Button variant="accent" onClick={publish} disabled={publishing || !account}>
            <Icon icon="solar:upload-minimalistic-bold" width={16} height={16} />
            {publishing ? "Lädt hoch…" : "Config veröffentlichen"}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 content-start">
        {presets === null && <p className="text-sm text-white/40 col-span-3">Lädt…</p>}
        {presets?.length === 0 && <p className="text-sm text-white/40 col-span-3">Noch keine Presets veröffentlicht.</p>}
        {presets && presets.length > 0 && results.length === 0 && (
          <p className="text-sm text-white/40 col-span-3">Keine Treffer für "{query}".</p>
        )}
        {results.map((preset) => {
          const isMine = account && preset.ownerUuid.replace(/-/g, "").toLowerCase() === account.uuid.replace(/-/g, "").toLowerCase();
          const busy = busyId === preset.id;
          return (
            <div key={preset.id} className="flex items-center gap-3 bg-black/30 border border-white/15 p-4">
              <div className="w-10 h-10 shrink-0 bg-black/40 flex items-center justify-center">
                <Icon icon="solar:settings-bold" width={20} height={20} className="text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{preset.name}</div>
                <p className="text-xs text-white/40 truncate">von {preset.owner}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="ghost" size="sm" disabled={!target || busy} onClick={() => apply(preset)}>
                    Anwenden
                  </Button>
                  {isMine && (
                    <button
                      onClick={() => removePreset(preset)}
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
