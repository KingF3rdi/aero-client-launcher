import { useEffect, useState } from "react";
import clsx from "clsx";
import { save } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { useInstanceStore } from "../../store/useInstanceStore";
import type { ContentFile, Instance } from "../../types/instance";

const KIND_LABEL: Record<ContentFile["kind"], string> = {
  mod: "Mods",
  resourcepack: "Resource Packs",
  shader: "Shader",
};

/** Installed mods/resourcepacks/shader list with toggle/delete, plus quick
 * actions to browse/load/export content - shared by the instance Settings
 * modal's Content tab and the Play page, so mods are visible without opening
 * Settings first. */
export function InstanceContentPanel({
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
