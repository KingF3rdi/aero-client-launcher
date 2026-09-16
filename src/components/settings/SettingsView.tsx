import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../ui/Button";

/** Stub - NoRiskClient's real Settings tab covers theme, background effects, Java args,
 * analytics, language, and more. This is the first slice: account + basics only. */
export function SettingsView() {
  const { account, logout } = useAuthStore();

  return (
    <div className="p-10 max-w-lg flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-wide">Optionen</h2>

      <section className="rounded-xl bg-black/30 border border-white/10 backdrop-blur p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon icon="solar:user-id-bold" className="text-accent" width={22} height={22} />
          <div>
            <div className="text-sm font-medium">Account</div>
            <div className="text-xs text-white/40">{account?.name ?? "Nicht angemeldet"}</div>
          </div>
        </div>
        {account && (
          <Button variant="ghost" onClick={() => logout()}>
            Abmelden
          </Button>
        )}
      </section>

      <p className="text-xs text-white/30">
        Weitere Optionen (Theme, Java-Argumente, Hintergrund-Effekte) folgen.
      </p>
    </div>
  );
}
