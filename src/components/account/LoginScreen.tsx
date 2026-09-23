import { Icon } from "@iconify/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../ui/Button";
import { LarpMark } from "../ui/LarpMark";
import { Background } from "../effects/Background";

/** Microsoft sign-in screen, shown until an account is saved. */
export function LoginScreen() {
  const { loggingIn, loginError, login } = useAuthStore();
  const win = isTauri() ? getCurrentWindow() : null;

  return (
    <div
      data-tauri-drag-region
      className="h-screen w-screen flex items-center justify-center text-text relative overflow-hidden border border-accent/40 bg-bg"
    >
      <Background count={80} />
      <div className="absolute top-0 right-0 flex items-center gap-3 px-5 py-4 z-20">
        <button onClick={() => win?.minimize()} title="Minimieren" className="text-white/50 hover:text-white transition-colors cursor-pointer">
          <Icon icon="pixel:minus-solid" width={14} height={14} />
        </button>
        <button onClick={() => win?.close()} title="Schließen" className="text-white/50 hover:text-danger transition-colors cursor-pointer">
          <Icon icon="pixel:window-close-solid" width={14} height={14} />
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center w-[26rem] border border-accent/40 bg-black/40 backdrop-blur-lg px-10 py-10">
        <LarpMark size={64} />
        <h1 className="label-mc text-xl" style={{ textShadow: "0 0 20px rgb(var(--accent) / 0.6)" }}>
          Aero Client
        </h1>
        <p className="text-white/50 text-sm">Mit deinem Minecraft-Account anmelden</p>

        <Button variant="play" onClick={() => login()} disabled={loggingIn} className="w-full h-12 mt-2">
          {loggingIn ? "Warte auf Anmeldung…" : "Mit Microsoft anmelden"}
        </Button>

        {loginError && <p className="text-sm text-danger break-words">{loginError}</p>}

        <p className="text-xs text-white/30">Nur Accounts mit gekaufter Minecraft: Java Edition.</p>
      </div>
    </div>
  );
}
