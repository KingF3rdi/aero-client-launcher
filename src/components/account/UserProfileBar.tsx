import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";

/** Head + name + logout, matching NoRiskClient's header UserProfileBar slot. */
export function UserProfileBar() {
  const { account, logout } = useAuthStore();
  if (!account) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 pl-2 pr-3 py-1.5 backdrop-blur">
      <img
        src={`https://mc-heads.net/avatar/${account.uuid}/28`}
        alt=""
        className="h-7 w-7 rounded-md border border-white/10"
      />
      <span className="text-sm font-medium">{account.name}</span>
      <button
        onClick={() => logout()}
        title="Abmelden"
        className="text-white/40 hover:text-danger transition-colors cursor-pointer"
      >
        <Icon icon="solar:logout-3-bold" width={16} height={16} />
      </button>
    </div>
  );
}
