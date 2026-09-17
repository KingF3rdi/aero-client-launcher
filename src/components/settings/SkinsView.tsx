import { useState } from "react";
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
  const { account } = useAuthStore();
  const [variant, setVariant] = useState<Variant>("classic");
  const [uploading, setUploading] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);

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
      setCacheBust((n) => n + 1);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-wide">Skin</h2>

      <div className="flex gap-8 items-start">
        <div className="rounded-xl bg-black/30 border border-white/10 backdrop-blur p-6 flex flex-col items-center gap-3">
          <img
            key={cacheBust}
            src={`https://mc-heads.net/body/${account.uuid}/100?t=${cacheBust}`}
            alt="Aktueller Skin"
            className="h-48"
          />
          <span className="text-xs text-white/40">{account.name}</span>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-white/40">Modell</label>
            <div className="flex gap-2 mt-1.5">
              {(["classic", "slim"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={
                    "px-4 py-2 rounded-lg text-sm border transition-colors cursor-pointer " +
                    (variant === v
                      ? "bg-accent/15 border-accent/40 text-accent"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10")
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
