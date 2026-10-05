import { useEffect, useState } from "react";
import { invoke } from "../../lib/tauri";
import type { Instance } from "../../types/instance";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useInstanceStore } from "../../store/useInstanceStore";

const VERSIONS = ["1.21.11", "1.21.8", "1.21.4", "1.21.1", "1.21"];

interface ForeignInstance {
  source: string;
  name: string;
  mcVersion: string | null;
  path: string;
  mods: number;
}

interface AddInstanceModalProps {
  onClose: () => void;
}

export function AddInstanceModal({ onClose }: AddInstanceModalProps) {
  const { addInstance, loadInstances, select } = useInstanceStore();
  const [foreign, setForeign] = useState<ForeignInstance[] | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    invoke<ForeignInstance[]>("find_foreign_instances").then(setForeign).catch(() => setForeign([]));
  }, []);

  /** Copies mods, configs, packs, options and servers into a new instance; unknown versions use the picker above. */
  const importOne = async (f: ForeignInstance) => {
    setImporting(f.path);
    setError(null);
    try {
      const created = await invoke<Instance>("import_foreign_instance", {
        path: f.path,
        name: f.name,
        mcVersion: f.mcVersion ?? mcVersion,
      });
      await loadInstances();
      select(created.id);
      onClose();
    } catch (e) {
      setError(String(e));
      setImporting(null);
    }
  };
  const [name, setName] = useState("");
  const [mcVersion, setMcVersion] = useState(VERSIONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addInstance(name.trim(), mcVersion);
      onClose();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  return (
    <Modal title="Neue Instanz" subtitle="Fabric" onClose={onClose} width={520}>
      <div className="p-6 flex flex-col gap-5">
        <div>
          <label className="text-xs label-mc text-white/40">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="z.B. Fabric 1.21.11 - Test"
            className="mt-1.5 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="text-xs label-mc text-white/40">Minecraft-Version</label>
          <select
            value={mcVersion}
            onChange={(e) => setMcVersion(e.target.value)}
            className="mt-1.5 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
          >
            {VERSIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-xs text-white/30 mt-1">Loader ist immer Fabric - passend zum Aero Client Mod.</p>
        </div>

        {foreign && foreign.length > 0 && (
          <div>
            <label className="text-xs label-mc text-white/40">Von anderen Launchern übernehmen</label>
            <div className="mt-1.5 flex flex-col gap-1 max-h-56 overflow-y-auto">
              {foreign.map((f) => (
                <div key={f.path} className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-xs text-white/40">
                      {f.source} · {f.mcVersion ?? `Version unbekannt (nimmt ${mcVersion})`} · {f.mods} Mods
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => importOne(f)} disabled={importing !== null}>
                    {importing === f.path ? "Kopiert…" : "Übernehmen"}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30 mt-1">Kopiert Mods, Configs, Resource- und Shader-Packs, Optionen und Serverliste. Welten bleiben, wo sie sind.</p>
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={create} disabled={busy}>
            {busy ? "Wird erstellt…" : "Erstellen"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
