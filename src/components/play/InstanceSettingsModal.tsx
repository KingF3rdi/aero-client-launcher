import { useEffect, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { save } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { useInstanceStore } from "../../store/useInstanceStore";
import type { ContentFile, Instance } from "../../types/instance";

export type Tab = "content" | "general" | "installation" | "logs";

interface InstanceSettingsModalProps {
  instance: Instance;
  onClose: () => void;
  initialTab?: Tab;
}

export function InstanceSettingsModal({ instance, onClose, initialTab }: InstanceSettingsModalProps) {
  const navigate = useNavigate();
  const { updateInstance, deleteInstance, duplicateInstance, select } = useInstanceStore();
  const [tab, setTab] = useState<Tab>(initialTab ?? "content");
  const [name, setName] = useState(instance.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(instance.name), [instance.id, instance.name]);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== instance.name) {
      updateInstance(instance.id, { name: trimmed });
    } else {
      setName(instance.name);
    }
  };

  return (
    <Modal title={instance.name} subtitle={`${instance.loader === "fabric" ? "Fabric" : "Vanilla"} · ${instance.mcVersion}`} onClose={onClose} width={640}>
      <div className="flex">
        <nav className="w-40 shrink-0 border-r border-white/10 p-3 flex flex-col gap-1">
          {([
            { id: "content", label: "Content", icon: "solar:widget-5-bold" },
            { id: "general", label: "General", icon: "solar:settings-bold" },
            { id: "installation", label: "Installation", icon: "solar:widget-bold" },
            { id: "logs", label: "Logs", icon: "solar:document-text-bold" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer",
                tab === t.id ? "bg-accent/15 text-accent" : "text-white/50 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon icon={t.icon} width={16} height={16} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 p-6 min-w-0">
          {tab === "general" && (
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-xs uppercase tracking-wide text-white/40">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="mt-1.5 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/40">Instanz duplizieren</label>
                <p className="text-xs text-white/40 mt-1 mb-2">Erstellt eine Kopie dieser Instanz inklusive Welten, Mods und Configs.</p>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await duplicateInstance(instance.id);
                    setBusy(false);
                    onClose();
                  }}
                >
                  <Icon icon="solar:copy-bold" width={16} height={16} />
                  Duplizieren
                </Button>
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="text-xs uppercase tracking-wide text-danger">Instanz löschen</label>
                <p className="text-xs text-white/40 mt-1 mb-2">
                  Löscht diese Instanz dauerhaft, inklusive Welten, Mods und Configs. Kann nicht rückgängig gemacht werden.
                </p>
                {!confirmDelete ? (
                  <Button variant="ghost" className="!text-danger !border-danger/30 hover:!bg-danger/10" onClick={() => setConfirmDelete(true)}>
                    <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
                    Löschen
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Wirklich löschen?</span>
                    <Button
                      variant="ghost"
                      className="!text-danger !border-danger/30 hover:!bg-danger/10"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await deleteInstance(instance.id);
                        onClose();
                      }}
                    >
                      Ja, löschen
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                      Abbrechen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "installation" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Larp Client Mod</div>
                  <p className="text-xs text-white/40 mt-1 max-w-sm">
                    {instance.mcVersion === "1.21.11"
                      ? "Fügt den Larp Client (ClickGUI, HUD, Optimizer, …) beim Start dieser Instanz hinzu."
                      : "Der Larp Client ist aktuell nur für 1.21.11 gebaut - dieser Schalter hat für diese Version noch keine Wirkung."}
                  </p>
                </div>
                <Toggle on={instance.modEnabled} onChange={(v) => updateInstance(instance.id, { modEnabled: v })} />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/40">RAM-Override</label>
                <p className="text-xs text-white/40 mt-1 mb-2">
                  Überschreibt den allgemeinen RAM-Regler nur für diese Instanz. Leer lassen, um den allgemeinen Wert zu nutzen.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={16}
                    value={instance.ramGb ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateInstance(instance.id, { ramGb: v === 0 ? null : v });
                    }}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-sm w-24 text-right text-white/60">
                    {instance.ramGb ? `${instance.ramGb} GB` : "Allgemein"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === "content" && (
            <ContentTab
              instance={instance}
              onBrowse={() => {
                select(instance.id);
                onClose();
                navigate("/discover");
              }}
              onLoadModpack={() => {
                onClose();
                navigate("/discover", { state: { tab: "modpack" } });
              }}
            />
          )}

          {tab === "logs" && <LogsTab instanceId={instance.id} />}
        </div>
      </div>
    </Modal>
  );
}

const KIND_LABEL: Record<ContentFile["kind"], string> = {
  mod: "Mods",
  resourcepack: "Resource Packs",
  shader: "Shader",
};

function ContentTab({
  instance,
  onBrowse,
  onLoadModpack,
}: {
  instance: Instance;
  onBrowse: () => void;
  onLoadModpack: () => void;
}) {
  const { fetchContent, toggleContentFile, deleteContentFile, exportModpack } = useInstanceStore();
  const [files, setFiles] = useState<ContentFile[] | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    fetchContent(instance.id)
      .then(setFiles)
      .catch((e) => toast.error(String(e)));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id]);

  const toggle = async (file: ContentFile) => {
    setBusyPath(file.relPath);
    try {
      const updated = await toggleContentFile(instance.id, file.relPath);
      setFiles((prev) => prev?.map((f) => (f.relPath === file.relPath ? updated : f)) ?? null);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyPath(null);
    }
  };

  const remove = async (file: ContentFile) => {
    setBusyPath(file.relPath);
    try {
      await deleteContentFile(instance.id, file.relPath);
      setFiles((prev) => prev?.filter((f) => f.relPath !== file.relPath) ?? null);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyPath(null);
    }
  };

  const grouped = (["mod", "resourcepack", "shader"] as const).map((kind) => ({
    kind,
    items: files?.filter((f) => f.kind === kind) ?? [],
  }));

  const exportPack = async () => {
    if (!isTauri()) {
      toast.error("Modpack-Export braucht die native App.");
      return;
    }
    const path = await save({
      defaultPath: `${instance.name}.mrpack`,
      filters: [{ name: "Modrinth Modpack", extensions: ["mrpack"] }],
    });
    if (!path) return;
    setExporting(true);
    try {
      await exportModpack(instance.id, path);
      toast.success("Modpack exportiert!");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBrowse}>
          <Icon icon="solar:compass-bold" width={16} height={16} />
          Mods durchsuchen
        </Button>
        <Button variant="ghost" onClick={onLoadModpack}>
          <Icon icon="solar:download-minimalistic-bold" width={16} height={16} />
          Modpack laden
        </Button>
        <Button variant="ghost" onClick={exportPack} disabled={exporting}>
          <Icon icon="solar:upload-minimalistic-bold" width={16} height={16} />
          {exporting ? "Exportiert…" : "Modpack exportieren"}
        </Button>
      </div>

      {files === null && <p className="text-sm text-white/40">Lädt…</p>}
      {files !== null && files.length === 0 && (
        <p className="text-sm text-white/40">Noch keine Mods, Resource Packs oder Shader installiert.</p>
      )}

      {grouped.map(
        ({ kind, items }) =>
          items.length > 0 && (
            <div key={kind}>
              <label className="text-xs uppercase tracking-wide text-white/40">{KIND_LABEL[kind]}</label>
              <div className="mt-1.5 flex flex-col gap-1">
                {items.map((file) => (
                  <div
                    key={file.relPath}
                    className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                  >
                    <span className={clsx("text-sm flex-1 truncate", !file.enabled && "text-white/40 line-through")}>
                      {file.name}
                    </span>
                    {file.kind === "mod" && (
                      <Toggle on={file.enabled} disabled={busyPath === file.relPath} onChange={() => toggle(file)} />
                    )}
                    <button
                      onClick={() => remove(file)}
                      disabled={busyPath === file.relPath}
                      title="Entfernen"
                      className="text-white/30 hover:text-danger transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ),
      )}
    </div>
  );
}

function LogsTab({ instanceId }: { instanceId: string }) {
  const { fetchLog } = useInstanceStore();
  const [log, setLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchLog(instanceId)
      .then(setLog)
      .catch((e) => setLog(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-white/40">latest.log</span>
        <Button variant="ghost" onClick={load} disabled={loading}>
          <Icon icon="solar:refresh-bold" width={14} height={14} />
          Aktualisieren
        </Button>
      </div>
      <pre className="text-xs font-mono bg-black/50 border border-white/10 rounded-lg p-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-white/70">
        {loading ? "Lade…" : log || "Keine Log-Daten."}
      </pre>
    </div>
  );
}
