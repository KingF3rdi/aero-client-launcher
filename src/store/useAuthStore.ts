import { create } from "zustand";
import { invoke } from "../lib/tauri";
import type { Account, DeviceCodePollResult, DeviceCodeStart } from "../types/account";

interface AuthState {
  account: Account | null;
  loading: boolean;
  deviceCode: DeviceCodeStart | null;
  loginError: string | null;
  init: () => Promise<void>;
  beginLogin: () => Promise<void>;
  cancelLogin: () => void;
  logout: () => Promise<void>;
}

let pollHandle: ReturnType<typeof setTimeout> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  account: null,
  loading: true,
  deviceCode: null,
  loginError: null,

  init: async () => {
    try {
      const account = await invoke<Account | null>("get_saved_account");
      set({ account, loading: false });
    } catch {
      set({ account: null, loading: false });
    }
  },

  beginLogin: async () => {
    set({ loginError: null });
    try {
      const start = await invoke<DeviceCodeStart>("begin_device_code_login");
      set({ deviceCode: start });
      const deadline = Date.now() + start.expiresIn * 1000;
      const poll = async () => {
        if (Date.now() > deadline) {
          set({ deviceCode: null, loginError: "Login-Code abgelaufen. Bitte erneut versuchen." });
          return;
        }
        try {
          const result = await invoke<DeviceCodePollResult>("poll_device_code_login");
          if (result.status === "success" && result.account) {
            set({ account: result.account, deviceCode: null });
            return;
          }
          if (result.status === "error") {
            set({ deviceCode: null, loginError: result.message ?? "Login fehlgeschlagen." });
            return;
          }
          // still pending - keep polling at the interval Microsoft asked for
          pollHandle = setTimeout(poll, start.interval * 1000);
        } catch (e) {
          set({ deviceCode: null, loginError: String(e) });
        }
      };
      pollHandle = setTimeout(poll, start.interval * 1000);
    } catch (e) {
      set({ loginError: String(e) });
    }
  },

  cancelLogin: () => {
    if (pollHandle) {
      clearTimeout(pollHandle);
      pollHandle = null;
    }
    set({ deviceCode: null });
  },

  logout: async () => {
    await invoke("logout").catch(() => {});
    set({ account: null });
  },
}));

export type { Account };
