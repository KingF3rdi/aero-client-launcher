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

const KIND_ICON: Record<ContentFile["kind"], string> = {
  mod: "solar:widget-bold",
  resourcepack: "solar:gallery-bold",
  shader: "solar:sun-bold",
};

/** Installed mods/resourcepacks/shader list with toggle/delete, plus quick
 * actions to browse/load/export content - shared by the instance Settings
 * modal's Content tab and the Play page, so mods are visible without opening
 * Settings first. */
export function InstanceContentPanel({
  instance,
  onBrowse,
  onLoadModpack,
  onSettings,
}: {
  instance: Instance;
  onBrowse: () => void;
  onLoadModpack: () => void;
  onSettings?: () => void;
}) {
  const { fetchContent, toggleContentFile, deleteContentFile, exportModpack, fetchContentIcons } = useInstanceStore();
  const [files, setFiles] = useState<ContentFile[] | null>(null);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState("");

  const load = () => {
    fetchContent(instance.id)
      .then(setFiles)
      .catch((e) => toast.error(String(e)));
    fetchContentIcons(instance.id)
      .then(setIcons)
      .catch(() => setIcons({}));
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

  const q = query.trim().toLowerCase();
  const grouped = (["mod", "resourcepack", "shader"] as const).map((kind) => ({
    kind,
    items: (files?.filter((f) => f.kind === kind) ?? []).filter((f) => f.name.toLowerCase().includes(q)),
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
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onBrowse}>
          <Icon icon="solar:compass-bold" width={16} height={16} />
          Mods durchsuchen
        </Button>
        <Button variant="ghost" size="sm" onClick={onLoadModpack}>
          <Icon icon="solar:download-minimalistic-bold" width={16} height={16} />
          Modpack laden
        </Button>
        <Button variant="ghost" size="sm" onClick={exportPack} disabled={exporting}>
          <Icon icon="solar:upload-minimalistic-bold" width={16} height={16} />
          {exporting ? "Exportiert…" : "Modpack exportieren"}
        </Button>
        {onSettings && (
          <Button variant="ghost" size="icon" onClick={onSettings} title="Instanz-Einstellungen" className="ml-auto">
            <Icon icon="solar:settings-bold" width={16} height={16} />
          </Button>
        )}
      </div>

      {files !== null && files.length > 0 && (
        <div className="relative">
          <Icon
            icon="solar:magnifer-linear"
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen…"
            className="w-full rounded-lg bg-black/30 border border-white/10 pl-9 pr-3 py-2 text-sm text-text placeholder:text-white/30 outline-none focus:border-accent/50"
          />
        </div>
      )}

      {files === null && <p className="text-sm text-white/40">Lädt…</p>}
      {files !== null && files.length === 0 && (
        <p className="text-sm text-white/40">Noch keine Mods, Resource Packs oder Shader installiert.</p>
      )}
      {files !== null && files.length > 0 && grouped.every((g) => g.items.length === 0) && (
        <p className="text-sm text-white/40">Keine Treffer für "{query}".</p>
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
                    className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 px-4 py-3"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-md bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                      {icons[file.relPath] ? (
                        <img src={icons[file.relPath]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon icon={KIND_ICON[file.kind]} width={18} height={18} className="text-accent" />
                      )}
                    </div>
                    <span className={clsx("text-base flex-1 truncate", !file.enabled && "text-white/40 line-through")}>
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
                      <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
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
