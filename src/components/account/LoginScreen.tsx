import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../ui/Button";
import { LarpMark } from "../ui/LarpMark";
import { ParticleField } from "../effects/ParticleField";

const ACCENT = "#4f8eff";

/**
 * Microsoft sign-in: opens the system browser straight at Microsoft's login
 * page (authorization code + PKCE, redirected to a local one-shot listener) -
 * no device code to type on a separate page.
 */
export function LoginScreen() {
  const { loggingIn, loginError, login } = useAuthStore();

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

        <Button variant="primary" onClick={() => login()} disabled={loggingIn} className="mt-2">
          {loggingIn ? "Warte auf Anmeldung im Browser…" : "Mit Microsoft anmelden"}
        </Button>

        {loginError && <p className="text-sm text-danger">{loginError}</p>}

        <p className="text-xs text-white/30 mt-4">Nur Accounts mit gekaufter Minecraft: Java Edition.</p>
      </div>
    </div>
  );
}
