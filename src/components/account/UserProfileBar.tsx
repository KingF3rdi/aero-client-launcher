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
        className="h-9 flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 pl-1.5 pr-3 text-xs font-semibold hover:bg-accent/15 transition-colors cursor-pointer"
      >
        <img src={`https://mc-heads.net/avatar/${account.uuid}/24`} alt="" className="h-6 w-6 rounded-full" style={{ imageRendering: "pixelated" }} />
        {account.name}
        <Icon icon="solar:alt-arrow-down-bold" width={12} height={12} className="text-white/50" />
      </button>
      <AccountDropdown open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
