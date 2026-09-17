import { Icon } from "@iconify/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { UserProfileBar } from "../account/UserProfileBar";

const ACCENT = "#4f8eff";

/** Custom titlebar - the window is decoration-less (see tauri.conf.json), same as NoRiskClient. */
export function HeaderBar() {
  const win = isTauri() ? getCurrentWindow() : null;

  return (
    <div
      data-tauri-drag-region
      className="h-20 flex-shrink-0 border-b-2 backdrop-blur-lg flex items-center justify-between px-8 relative z-10"
      style={{ borderColor: `${ACCENT}40`, backgroundColor: `${ACCENT}08` }}
    >
      <div data-tauri-drag-region className="flex flex-col">
        <h1
          className="font-mc text-base tracking-wide"
          style={{ textShadow: `0 0 16px ${ACCENT}80` }}
        >
          Aero Client
        </h1>
        <span className="text-xs text-white/40">Minecraft Launcher</span>
      </div>

      <div className="flex items-center gap-4">
        <UserProfileBar />

        <div className="flex items-center gap-3 ml-2">
          <button
            onClick={() => win?.minimize()}
            title="Minimieren"
            className="text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <Icon icon="pixel:minus-solid" width={14} height={14} />
          </button>
          <button
            onClick={() => win?.toggleMaximize()}
            title="Maximieren"
            className="text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <Icon icon="pixel:expand-solid" width={14} height={14} />
          </button>
          <button
            onClick={() => win?.close()}
            title="Schließen"
            className="text-white/50 hover:text-danger transition-colors cursor-pointer"
          >
            <Icon icon="pixel:window-close-solid" width={14} height={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
