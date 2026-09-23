import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { AddAccountModal } from "./AddAccountModal";

interface AccountDropdownProps {
  open: boolean;
  onClose: () => void;
}

/** Account list + "Add account", opened from the header avatar - same idea as
 * Modrinth's "Playing as" panel, just as a dropdown instead of a fixed sidebar. */
export function AccountDropdown({ open, onClose }: AccountDropdownProps) {
  const { accounts, selectAccount, removeAccount } = useAuthStore();
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // While the "add account" modal is up, clicks land in it (outside this dropdown) - don't close then.
    if (!open || adding) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, adding, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        ref={ref}
        className="absolute right-0 top-[calc(100%+10px)] w-72 bg-[#110f19]/95 border border-accent/50 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden z-40"
      >
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-xs label-mc text-white/40">Accounts</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {accounts.length === 0 && (
            <p className="text-xs text-white/40 px-4 py-4">Kein Account angemeldet.</p>
          )}
          {accounts.map((a) => (
            <div
              key={a.uuid}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
            >
              <button
                onClick={() => !a.active && selectAccount(a.uuid).then(onClose)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
              >
                <img src={`https://mc-heads.net/avatar/${a.uuid}/24`} alt="" className="h-6 w-6 rounded-md border border-white/10 shrink-0" />
                <span className="text-sm truncate flex-1">{a.name}</span>
                {a.active && <Icon icon="solar:check-circle-bold" className="text-accent shrink-0" width={16} height={16} />}
              </button>
              <button
                onClick={() => removeAccount(a.uuid)}
                title="Entfernen"
                className="text-white/0 group-hover:text-white/40 hover:!text-danger transition-colors cursor-pointer shrink-0"
              >
                <Icon icon="solar:trash-bin-trash-bold" width={14} height={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-accent hover:bg-accent/10 transition-colors cursor-pointer border-t border-white/10"
        >
          <Icon icon="solar:add-circle-bold" width={16} height={16} />
          Account hinzufügen
        </button>
      </div>
      {adding && (
        <AddAccountModal
          onClose={() => {
            setAdding(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
