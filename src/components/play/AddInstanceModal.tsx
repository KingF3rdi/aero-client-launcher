import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useInstanceStore } from "../../store/useInstanceStore";

const VERSIONS = ["1.21.11", "1.21.8", "1.21.4", "1.21.1", "1.21"];

interface AddInstanceModalProps {
  onClose: () => void;
}

export function AddInstanceModal({ onClose }: AddInstanceModalProps) {
  const { addInstance } = useInstanceStore();
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
    <Modal title="Neue Instanz" subtitle="Fabric" onClose={onClose} width={420}>
      <div className="p-6 flex flex-col gap-5">
        <div>
          <label className="text-xs uppercase tracking-wide text-white/40">Name</label>
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
          <label className="text-xs uppercase tracking-wide text-white/40">Minecraft-Version</label>
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
