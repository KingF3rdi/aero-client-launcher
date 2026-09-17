import { useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../ui/Button";
import { LarpMark } from "../ui/LarpMark";
import { ParticleField } from "../effects/ParticleField";

const ACCENT = "#4f8eff";

/**
 * Microsoft device-code login: show a short code, open the browser to
 * microsoft.com/link, poll until the user finishes there. Simpler and more
 * modern than the "paste the redirect URL back in" flow the earlier Python/
 * C++ launcher prototypes used.
 */
export function LoginScreen() {
  const { deviceCode, loginError, beginLogin, cancelLogin } = useAuthStore();

  useEffect(() => () => cancelLogin(), [cancelLogin]);

  return (
    <div
      className="h-screen w-screen flex items-center justify-center text-text relative overflow-hidden border-2 bg-black/50 backdrop-blur-lg"
      style={{
        backgroundImage: [
          `radial-gradient(ellipse at 50% 40%, ${ACCENT}16, transparent 60%)`,
          "linear-gradient(to bottom right, rgb(7,14,25), rgba(0,0,0,0.92))",
        ].join(", "),
        borderColor: `${ACCENT}30`,
      }}
    >
      <div className="absolute inset-0 opacity-60">
        <ParticleField color={ACCENT} count={80} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm">
        <LarpMark size={64} />
        <h1 className="font-mc text-lg tracking-wide" style={{ textShadow: `0 0 20px ${ACCENT}80` }}>
          Aero Client
        </h1>
        <p className="text-white/50 text-sm">Mit deinem Minecraft-Account anmelden</p>

        {!deviceCode && (
          <Button variant="primary" onClick={() => beginLogin()} className="mt-2">
            Mit Microsoft anmelden
          </Button>
        )}

        {deviceCode && (
          <div
            className="mt-2 flex flex-col items-center gap-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-lg px-6 py-5 w-full"
            style={{ boxShadow: `0 0 20px ${ACCENT}20` }}
          >
            <p className="text-sm text-white/50">Code auf microsoft.com/link eingeben:</p>
            <div className="text-3xl font-bold tracking-[0.3em] text-accent" style={{ textShadow: `0 0 16px ${ACCENT}60` }}>
              {deviceCode.userCode}
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                isTauri()
                  ? openUrl(deviceCode.verificationUri)
                  : window.open(deviceCode.verificationUri, "_blank")
              }
            >
              Browser öffnen
            </Button>
            <p className="text-xs text-white/40">Wird automatisch erkannt, sobald du dich angemeldet hast…</p>
          </div>
        )}

        {loginError && <p className="text-sm text-danger">{loginError}</p>}

        <p className="text-xs text-white/30 mt-4">Nur Accounts mit gekaufter Minecraft: Java Edition.</p>
      </div>
    </div>
  );
}
