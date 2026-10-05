import { useEffect, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { useInstanceStore } from "../../store/useInstanceStore";
import type { Instance } from "../../types/instance";
import { InstanceContentPanel } from "./InstanceContentPanel";
import { invoke } from "../../lib/tauri";
import { toast } from "react-hot-toast";

export type Tab = "content" | "configs" | "general" | "installation" | "logs";

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
    <Modal title={instance.name} subtitle={`${instance.loader === "fabric" ? "Fabric" : "Vanilla"} · ${instance.mcVersion}`} onClose={onClose} width={760}>
      <div className="flex">
        <nav className="w-40 shrink-0 border-r border-white/10 p-3 flex flex-col gap-1">
          {([
            { id: "content", label: "Content", icon: "solar:widget-5-bold" },
            { id: "configs", label: "Configs", icon: "solar:code-file-bold" },
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
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="text-xs label-mc text-white/40">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="mt-1.5 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div className="shrink-0">
                  <label className="text-xs label-mc text-white/40">Icon</label>
                  <div className="mt-1.5 w-11 h-11 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center">
                    <Icon icon="solar:box-bold" width={22} height={22} className="text-accent" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs label-mc text-white/40">Instanz duplizieren</label>
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
                <label className="text-xs label-mc text-danger">Instanz löschen</label>
                <p className="text-xs text-white/40 mt-1 mb-2">
                  Löscht diese Instanz dauerhaft, inklusive Welten, Mods und Configs. Kann nicht rückgängig gemacht werden.
                </p>
                {!confirmDelete ? (
                  <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                    <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
                    Löschen
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Wirklich löschen?</span>
                    <Button
                      variant="danger"
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
                  <div className="text-sm font-medium">Aero Client Mod</div>
                  <p className="text-xs text-white/40 mt-1 max-w-sm">
                    {instance.mcVersion === "1.21.11"
                      ? "Fügt den Aero Client (ClickGUI, HUD, Optimizer, …) beim Start dieser Instanz hinzu."
                      : "Der Aero Client ist aktuell nur für 1.21.11 gebaut - dieser Schalter hat für diese Version noch keine Wirkung."}
                  </p>
                </div>
                <Toggle on={instance.modEnabled} onChange={(v) => updateInstance(instance.id, { modEnabled: v })} />
              </div>

              <div>
                <label className="text-xs label-mc text-white/40">RAM</label>
                <p className="text-xs text-white/40 mt-1 mb-2">Wie viel Arbeitsspeicher diese Instanz beim Start bekommt.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={2}
                    max={16}
                    value={instance.ramGb ?? 4}
                    onChange={(e) => updateInstance(instance.id, { ramGb: Number(e.target.value) })}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-sm w-16 text-right text-white/60">{instance.ramGb ?? 4} GB</span>
                </div>
              </div>
            </div>
          )}

          {tab === "content" && (
            <InstanceContentPanel
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

          {tab === "configs" && <ConfigsTab instanceId={instance.id} />}
          {tab === "logs" && <LogsTab instanceId={instance.id} />}
        </div>
      </div>
    </Modal>
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
        <span className="text-xs label-mc text-white/40">latest.log</span>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
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

/** Mod config files (config/**) edited as plain text. */
function ConfigsTab({ instanceId }: { instanceId: string }) {
  const [files, setFiles] = useState<string[] | null>(null);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    invoke<string[]>("list_config_files", { id: instanceId }).then(setFiles).catch(() => setFiles([]));
  }, [instanceId]);

  const load = async (rel: string) => {
    if (text !== saved && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
    try {
      const t = await invoke<string>("read_config_file", { id: instanceId, rel });
      setOpen(rel);
      setText(t);
      setSaved(t);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const save = async () => {
    if (!open) return;
    if (open.endsWith(".json")) {
      try {
        JSON.parse(text);
      } catch (e) {
        toast.error(`Kein gültiges JSON: ${(e as Error).message}`);
        return;
      }
    }
    try {
      await invoke("write_config_file", { id: instanceId, rel: open, text });
      setSaved(text);
      toast.success("Gespeichert. Wirkt beim nächsten Start.");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const shown = (files ?? []).filter((f) => f.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="flex gap-3 h-[26rem]">
      <div className="w-48 shrink-0 flex flex-col gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Configs filtern"
          className="h-9 px-3 text-xs bg-black/40 border border-white/15 focus:border-accent outline-none"
        />
        <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
          {files === null && <p className="text-xs text-white/40">Lädt…</p>}
          {files?.length === 0 && <p className="text-xs text-white/40">Noch keine Configs. Einmal starten, dann legen die Mods sie an.</p>}
          {shown.map((f) => (
            <button
              key={f}
              onClick={() => load(f)}
              title={f}
              className={clsx(
                "text-left text-xs px-2 py-1.5 rounded-md truncate cursor-pointer",
                open === f ? "bg-accent/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {open ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 truncate flex-1">{open}</span>
              <Button variant="ghost" size="sm" onClick={() => setText(saved)} disabled={text === saved}>
                Zurücksetzen
              </Button>
              <Button variant="primary" size="sm" onClick={save} disabled={text === saved}>
                Speichern
              </Button>
            </div>
            <textarea
              value={text}
              spellCheck={false}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                  e.preventDefault();
                  save();
                }
              }}
              className="flex-1 resize-none text-xs font-mono bg-black/50 border border-white/10 focus:border-accent/60 outline-none p-3 text-white/80"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-white/40">Links eine Config wählen</div>
        )}
      </div>
    </div>
  );
}
