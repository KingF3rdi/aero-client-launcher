import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { isTauri } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { toast } from "react-hot-toast";
import { invoke } from "../../lib/tauri";
import { useInstanceStore } from "../../store/useInstanceStore";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface Shot {
  name: string;
  modified: number;
}

/** The selected profile's newest screenshots; click one to see it large. */
export function ScreenshotsView() {
  const { instances, selectedId, select } = useInstanceStore();
  const target = instances.find((i) => i.id === selectedId) ?? instances[0] ?? null;
  const [shots, setShots] = useState<Shot[] | null>(null);
  const [open, setOpen] = useState<Shot | null>(null);

  useEffect(() => {
    if (!target) return;
    setShots(null);
    invoke<Shot[]>("list_screenshots", { instanceId: target.id })
      .then(setShots)
      .catch(() => setShots([]));
  }, [target?.id]);

  const openFolder = async () => {
    if (!target || !isTauri()) return;
    try {
      await revealItemInDir(await invoke<string>("screenshots_dir", { instanceId: target.id }));
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="p-8 flex flex-col gap-5 h-full">
      <div className="flex items-center gap-3">
        <h2 className="label-mc text-lg mr-auto">Screenshots</h2>
        <select
          value={target?.id ?? ""}
          onChange={(e) => select(e.target.value)}
          title="Profil"
          className="h-10 bg-black/40 border border-white/15 px-2 text-xs focus:outline-none focus:border-accent/60"
        >
          {instances.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <Button onClick={openFolder} disabled={!target}>
          <Icon icon="solar:folder-open-bold" width={16} height={16} />
          Ordner öffnen
        </Button>
      </div>

      {shots === null && <p className="text-xs text-white/40">Lädt…</p>}
      {shots?.length === 0 && <p className="text-xs text-white/40">Noch keine Screenshots in diesem Profil. Im Spiel: F2.</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 overflow-y-auto">
        {target && shots?.map((s) => <Tile key={s.name} instanceId={target.id} shot={s} onOpen={() => setOpen(s)} />)}
      </div>

      {open && target && (
        <Modal title={open.name} subtitle={new Date(open.modified * 1000).toLocaleString("de-DE")} width={1100} onClose={() => setOpen(null)}>
          <Image instanceId={target.id} name={open.name} className="w-full" />
        </Modal>
      )}
    </div>
  );
}

function Tile({ instanceId, shot, onOpen }: { instanceId: string; shot: Shot; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group border border-white/10 bg-white/[0.04] hover:border-accent/60 overflow-hidden cursor-pointer text-left">
      <Image instanceId={instanceId} name={shot.name} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform" />
      <div className="px-3 py-2 text-[11px] text-white/50">{new Date(shot.modified * 1000).toLocaleString("de-DE")}</div>
    </button>
  );
}

function Image({ instanceId, name, className }: { instanceId: string; name: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    invoke<string>("read_screenshot", { instanceId, name })
      .then((d) => alive && setSrc(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [instanceId, name]);
  return src ? <img src={src} alt={name} className={className} /> : <div className={`${className} aspect-video bg-white/5`} />;
}
