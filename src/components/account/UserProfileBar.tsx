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
        className="label-mc h-10 flex items-center gap-2.5 border border-accent/50 bg-black/30 pl-1.5 pr-3 text-[11px] hover:bg-accent/15 transition-colors cursor-pointer"
      >
        <img src={`https://mc-heads.net/avatar/${account.uuid}/24`} alt="" className="h-6 w-6" style={{ imageRendering: "pixelated" }} />
        {account.name}
        <Icon icon="solar:alt-arrow-down-bold" width={12} height={12} className="text-white/50" />
      </button>
      <AccountDropdown open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
