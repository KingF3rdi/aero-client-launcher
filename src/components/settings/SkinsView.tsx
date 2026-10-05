import { useEffect, useRef, useState } from "react";
import { SkinViewer } from "skinview3d";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { useAuthStore } from "../../store/useAuthStore";
import { invoke } from "../../lib/tauri";

type Variant = "classic" | "slim";
type NameState = "idle" | "checking" | "free" | "taken" | "invalid" | "confirm" | "changing";

const CARD = "rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5";
const SOFT_BTN =
  "h-9 px-3.5 text-[13px] font-semibold rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const STRONG_BTN =
  "h-9 px-3.5 text-[13px] font-semibold rounded-lg border border-white/40 bg-white/[0.12] hover:bg-white/[0.2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Skin (upload a PNG, wide or slim) and the Minecraft username, both through Mojang's own APIs. */
export function SkinsView() {
  const { account, selectAccount } = useAuthStore();
  const [variant, setVariant] = useState<Variant>("classic");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [nameState, setNameState] = useState<NameState>("idle");
  const [lockedSince, setLockedSince] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!account || !canvasRef.current) return;
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: 200,
      height: 260,
      // Mojang's own texture URL from the profile; a caching proxy can lag behind a fresh change.
      skin: account.skinUrl ?? `https://mc-heads.net/skin/${account.uuid}`,
      model: variant === "slim" ? "slim" : "default",
    });
    viewer.controls.enableZoom = false;
    return () => viewer.dispose();
  }, [account?.uuid, account?.skinUrl, variant]);

  useEffect(() => {
    if (!isTauri()) return;
    invoke<string | null>("name_change_lock").then(setLockedSince).catch(() => {});
  }, [account?.uuid]);

  if (!account) return null;

  const pickAndUpload = async () => {
    if (!isTauri()) {
      toast.error("Skin-Upload braucht die native App.");
      return;
    }
    const path = await open({ multiple: false, filters: [{ name: "Skin (PNG)", extensions: ["png"] }] });
    if (!path || typeof path !== "string") return;
    setUploading(true);
    try {
      await invoke("upload_skin", { path, variant });
      toast.success("Skin hochgeladen");
      await selectAccount(account.uuid);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setUploading(false);
    }
  };

  const check = async () => {
    setNameState("checking");
    try {
      setNameState(await invoke<NameState>("check_name", { name }));
    } catch (e) {
      toast.error(String(e));
      setNameState("idle");
    }
  };

  const change = async () => {
    setNameState("changing");
    try {
      await invoke("change_name", { name });
      toast.success(`Du heißt jetzt ${name}`);
      await selectAccount(account.uuid);
      setName("");
      setNameState("idle");
      setLockedSince(new Date().toISOString());
    } catch (e) {
      toast.error(String(e));
      setNameState("free");
    }
  };

  const unlockDate = lockedSince ? new Date(new Date(lockedSince).getTime() + 30 * 864e5) : null;
  const locked = unlockDate !== null && unlockDate.getTime() > Date.now();
  const status: Record<NameState, string> = {
    idle: "",
    checking: "Wird geprüft…",
    free: `${name} ist frei`,
    taken: `${name} ist schon vergeben`,
    invalid: "3 bis 16 Zeichen: Buchstaben, Zahlen und _",
    confirm: `Nochmal drücken, um ${name} zu werden. Das lässt sich 30 Tage lang nicht rückgängig machen.`,
    changing: "Name wird geändert…",
  };

  return (
    <div className="p-10 max-w-3xl mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Skin und Name</h2>

      <div className={clsx(CARD, "flex gap-6 items-center")}>
        <div className="rounded-xl border border-white/10 bg-black/40 p-2">
          <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing" />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="text-lg font-semibold">{account.name}</div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-white/10 bg-black/30">
            {(["classic", "slim"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={clsx(
                  "h-8 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer border",
                  variant === v ? "bg-white/[0.14] border-white/40" : "border-transparent text-white/60 hover:text-white",
                )}
              >
                {v === "classic" ? "Breit" : "Schmal"}
              </button>
            ))}
          </div>
          <div>
            <button className={SOFT_BTN} onClick={pickAndUpload} disabled={uploading}>
              {uploading ? "Lädt hoch…" : "Bild wählen"}
            </button>
          </div>
        </div>
      </div>

      <div className={clsx(CARD, "flex flex-col gap-3")}>
        <div>
          <div className="text-lg font-semibold">Benutzername</div>
          <div className="text-[13px] text-white/60 mt-1">Ändert den Namen deines Minecraft-Accounts</div>
        </div>
        <div className="flex gap-2">
          <input
            value={name}
            maxLength={16}
            disabled={locked}
            placeholder={locked ? `Wieder möglich ab ${unlockDate!.toLocaleDateString()}` : "Neuer Name"}
            onChange={(e) => {
              setName(e.target.value.trim());
              setNameState("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && name && check()}
            className="flex-1 h-10 px-3 text-[13px] bg-black/40 border border-white/15 focus:border-white/70 outline-none disabled:opacity-50"
          />
          <button className={SOFT_BTN} onClick={check} disabled={!name || locked || nameState === "checking"}>
            Prüfen
          </button>
        </div>
        {nameState !== "idle" && (
          <div className="flex items-center gap-3">
            <span className={clsx("flex-1 text-[13px]", nameState === "taken" || nameState === "invalid" ? "text-danger" : "text-white/80")}>
              {status[nameState]}
            </span>
            {nameState === "free" && (
              <button className={STRONG_BTN} onClick={() => setNameState("confirm")}>
                Name ändern
              </button>
            )}
            {nameState === "confirm" && (
              <>
                <button className={SOFT_BTN} onClick={() => setNameState("free")}>
                  Abbrechen
                </button>
                <button className={STRONG_BTN} onClick={change}>
                  Ja, ändern
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
