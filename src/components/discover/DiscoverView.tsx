import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { invoke } from "../../lib/tauri";
import { useInstanceStore } from "../../store/useInstanceStore";
import type { ContentPage, ContentSummary, ProjectType } from "../../types/content";
import { Button } from "../ui/Button";

const TABS: { id: ProjectType; label: string; icon: string }[] = [
  { id: "mod", label: "Mods", icon: "solar:widget-bold" },
  { id: "modpack", label: "Modpacks", icon: "solar:box-bold" },
  { id: "resourcepack", label: "Resource Packs", icon: "solar:gallery-bold" },
  { id: "shader", label: "Shader", icon: "solar:sun-bold" },
];

/**
 * General content browser (Modrinth's real search API) - separate from
 * per-instance "Browse content" (see InstanceSettingsModal), which lands here
 * too but with a target instance already picked, so mod/resourcepack/shader
 * installs always know where to go without asking first.
 */
export function DiscoverView() {
  const location = useLocation();
  const initialTab = (location.state as { tab?: ProjectType } | null)?.tab;
  const { instances, selectedId } = useInstanceStore();
  const [tab, setTab] = useState<ProjectType>(initialTab ?? "mod");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentSummary[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [targetInstanceId, setTargetInstanceId] = useState(selectedId ?? "");
  const [installing, setInstalling] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const targetInstance = instances.find((i) => i.id === targetInstanceId) ?? instances[0] ?? null;

  const search = async () => {
    setLoading(true);
    try {
      const res = await invoke<ContentPage>("search_content", {
        query,
        projectType: tab,
        mcVersion: targetInstance?.mcVersion ?? "",
        offset: 0,
      });
      setResults(res.hits);
      setTotalHits(res.totalHits);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await invoke<ContentPage>("search_content", {
        query,
        projectType: tab,
        mcVersion: targetInstance?.mcVersion ?? "",
        offset: results.length,
      });
      setResults((prev) => [...prev, ...res.hits]);
      setTotalHits(res.totalHits);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const install = async (item: ContentSummary) => {
    setInstalling(item.id);
    try {
      if (item.projectType === "modpack") {
        await invoke("install_modpack", { projectId: item.id, instanceName: item.title });
        toast.success(`"${item.title}" als neue Instanz installiert!`);
      } else {
        if (!targetInstance) {
          toast.error("Keine Instanz ausgewählt.");
          return;
        }
        await invoke("install_content", { projectId: item.id, projectType: item.projectType, instanceId: targetInstance.id });
        toast.success(`"${item.title}" installiert in ${targetInstance.name}.`);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setInstalling(null);
    }
  };

  const importLocalModpack = async () => {
    if (!isTauri()) {
      toast.error("Modpack-Import braucht die native App.");
      return;
    }
    const path = await open({ multiple: false, filters: [{ name: "Modrinth Modpack", extensions: ["mrpack"] }] });
    if (!path || typeof path !== "string") return;
    setImporting(true);
    try {
      await invoke("import_modpack_file", { path, instanceName: null });
      toast.success("Modpack importiert!");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-wide">Entdecken</h2>
        {tab === "modpack" && (
          <Button variant="ghost" onClick={importLocalModpack} disabled={importing}>
            <Icon icon="solar:import-bold" width={16} height={16} />
            {importing ? "Importiert…" : "Modpack importieren (.mrpack)"}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors cursor-pointer " +
              (tab === t.id ? "bg-accent/15 border-accent/40 text-accent" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10")
            }
          >
            <Icon icon={t.icon} width={16} height={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={`${TABS.find((t) => t.id === tab)?.label} durchsuchen…`}
          className="flex-1 h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-sm focus:outline-none focus:border-accent/50"
        />
        <Button variant="ghost" onClick={search} disabled={loading}>
          <Icon icon="solar:magnifer-bold" width={16} height={16} />
          Suchen
        </Button>

        {tab !== "modpack" && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/40">Installieren in</span>
            <select
              value={targetInstance?.id ?? ""}
              onChange={(e) => setTargetInstanceId(e.target.value)}
              className="h-10 rounded-lg bg-black/40 border border-white/10 px-2 text-xs focus:outline-none focus:border-accent/50"
            >
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start">
        {loading && <p className="text-sm text-white/40 col-span-2">Lädt…</p>}
        {!loading && results.length === 0 && <p className="text-sm text-white/40 col-span-2">Keine Ergebnisse.</p>}
        {results.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 backdrop-blur p-4"
          >
            {item.iconUrl ? (
              <img src={item.iconUrl} alt="" className="w-12 h-12 rounded-lg shrink-0 object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">
                <Icon icon="solar:box-bold" width={22} height={22} className="text-white/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.title}</div>
              <p className="text-xs text-white/40 line-clamp-2">{item.description}</p>
            </div>
            <Button variant="ghost" onClick={() => install(item)} disabled={installing === item.id} className="shrink-0">
              {installing === item.id ? "…" : "Install"}
            </Button>
          </div>
        ))}
      </div>

      {!loading && results.length > 0 && results.length < totalHits && (
        <Button variant="ghost" onClick={loadMore} disabled={loadingMore} className="self-center">
          {loadingMore ? "Lädt…" : `Mehr laden (${results.length} / ${totalHits})`}
        </Button>
      )}
    </div>
  );
}
