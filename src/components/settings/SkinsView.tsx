import { useEffect, useRef, useState } from "react";
import { SkinViewer } from "skinview3d";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import { invoke } from "../../lib/tauri";
import { Button } from "../ui/Button";

type Variant = "classic" | "slim";

/** Upload a local PNG as the active account's skin via Mojang's own skins API. */
export function SkinsView() {
  const { account, selectAccount } = useAuthStore();
  const [variant, setVariant] = useState<Variant>("classic");
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!account || !canvasRef.current) return;
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: 260,
      height: 320,
      // Mojang's own texture URL (from the profile fetched at login/refresh) -
      // avoids depending on a third-party caching proxy that might not have
      // this account cached at all and would fall back to default Steve.
      skin: account.skinUrl ?? `https://mc-heads.net/skin/${account.uuid}`,
    });
    viewer.controls.enableZoom = false;
    viewer.autoRotate = false;
    viewerRef.current = viewer;
    return () => viewer.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.uuid, account?.skinUrl]);

  if (!account) return null;

  const pickAndUpload = async () => {
    if (!isTauri()) {
      toast.error("Skin-Upload braucht die native App (nicht im Browser-Vorschau).");
      return;
    }
    const path = await open({
      multiple: false,
      filters: [{ name: "Skin (PNG)", extensions: ["png"] }],
    });
    if (!path || typeof path !== "string") return;
    setUploading(true);
    try {
      await invoke("upload_skin", { path, variant });
      toast.success("Skin hochgeladen!");
      await selectAccount(account.uuid);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl flex flex-col gap-6">
      <h2 className="label-mc text-lg">Skin</h2>

      <div className="flex gap-8 items-start">
        <div className="bg-black/30 border-2 border-accent/30 backdrop-blur p-3 flex flex-col items-center gap-2">
          <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing" />
          <span className="text-xs text-white/40">{account.name}</span>
          <span className="text-[10px] text-white/25">Zum Drehen ziehen</span>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          <div>
            <label className="text-xs label-mc text-white/40">Modell</label>
            <div className="flex gap-2 mt-1.5">
              {(["classic", "slim"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={
                    "label-mc flex items-center h-9 px-4 text-[11px] border-2 transition-colors cursor-pointer " +
                    (variant === v
                      ? "bg-accent/25 border-accent text-white"
                      : "bg-black/30 border-accent/30 text-white/60 hover:bg-accent/10")
                  }
                >
                  {v === "classic" ? "Classic (Steve)" : "Slim (Alex)"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Button variant="primary" onClick={pickAndUpload} disabled={uploading}>
              <Icon icon="solar:upload-bold" width={16} height={16} />
              {uploading ? "Lädt hoch…" : "Neuen Skin hochladen (PNG)"}
            </Button>
            <p className="text-xs text-white/30 mt-2 max-w-sm">
              Lädt direkt über Mojangs offizielle Skin-API - die Vorschau oben kann ein paar Minuten brauchen, bis sie
              den neuen Skin zeigt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
