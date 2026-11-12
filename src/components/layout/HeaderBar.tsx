import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import clsx from "clsx";
import { Icon } from "../ui/Icon";
import { UserProfileBar } from "../account/UserProfileBar";
import { LarpMark } from "../ui/LarpMark";
import { PAGES } from "./pages";

/**
 * Custom titlebar (the window is decoration-less): brand on the left, the pages as one row of small tabs in the
 * middle, account and window buttons on the right.
 */
export function HeaderBar({ activeTab, onOpen }: { activeTab: string; onOpen: (id: string) => void }) {
  const win = isTauri() ? getCurrentWindow() : null;

  return (
    <div data-tauri-drag-region className="h-14 flex-shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-3 pl-4 pr-2 relative z-10">
      <span data-tauri-drag-region className="flex items-center gap-2 text-[13px] font-semibold text-white">
        <LarpMark size={16} tone="metal" />
        Aero Client
      </span>

      <nav aria-label="Seiten" className="flex items-center gap-0.5 p-1 rounded-xl bg-[#141416] border border-white/[0.07]">
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            title={p.label}
            aria-current={activeTab === p.id ? "page" : undefined}
            className={clsx(
              "h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors",
              activeTab === p.id ? "bg-white/[0.11] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.05]",
            )}
          >
            <Icon icon={p.icon} width={15} height={15} />
            <span className="hidden min-[1180px]:inline">{p.label}</span>
          </button>
        ))}
      </nav>

      <div data-tauri-drag-region className="flex items-center justify-end gap-1">
        <UserProfileBar />
        <WindowButton icon="minus-square" title="Minimieren" onClick={() => win?.minimize()} />
        <WindowButton icon="maximize-square" title="Maximieren" onClick={() => win?.toggleMaximize()} />
        <WindowButton icon="close-square" title="Schließen" danger onClick={() => win?.close()} />
      </div>
    </div>
  );
}

function WindowButton({ icon, title, danger, onClick }: { icon: string; title: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-white/70 transition-colors cursor-pointer ${danger ? "hover:bg-danger hover:text-white" : "hover:bg-white/10 hover:text-white"}`}
    >
      <Icon icon={icon} width={17} height={17} />
    </button>
  );
}
