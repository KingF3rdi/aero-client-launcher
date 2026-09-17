import { useState } from "react";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { AccountDropdown } from "./AccountDropdown";

/** Head + name, click to open the account dropdown (switch/add/remove accounts). */
export function UserProfileBar() {
  const { account } = useAuthStore();
  const [open, setOpen] = useState(false);
  if (!account) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 pl-2 pr-3 py-1.5 backdrop-blur hover:bg-white/10 transition-colors cursor-pointer"
      >
        <img
          src={`https://mc-heads.net/avatar/${account.uuid}/28`}
          alt=""
          className="h-7 w-7 rounded-md border border-white/10"
        />
        <span className="text-sm font-medium">{account.name}</span>
        <Icon icon="solar:alt-arrow-down-bold" width={12} height={12} className="text-white/40" />
      </button>
      <AccountDropdown open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
