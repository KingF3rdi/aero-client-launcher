import { create } from "zustand";
import { invoke } from "../lib/tauri";
import type { Account, AccountSummary, DeviceCodePollResult, DeviceCodeStart } from "../types/account";

interface AuthState {
  account: Account | null;
  accounts: AccountSummary[];
  loading: boolean;
  deviceCode: DeviceCodeStart | null;
  loginError: string | null;
  init: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  beginLogin: () => Promise<void>;
  cancelLogin: () => void;
  selectAccount: (uuid: string) => Promise<void>;
  removeAccount: (uuid: string) => Promise<void>;
  logout: () => Promise<void>;
}

let pollHandle: ReturnType<typeof setTimeout> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  account: null,
  accounts: [],
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
    get().loadAccounts();
  },

  loadAccounts: async () => {
    try {
      const accounts = await invoke<AccountSummary[]>("list_accounts");
      set({ accounts });
    } catch {
      // Non-fatal - the account dropdown just shows an empty list.
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
            get().loadAccounts();
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

  selectAccount: async (uuid) => {
    const account = await invoke<Account>("select_account", { uuid });
    set({ account });
    get().loadAccounts();
  },

  removeAccount: async (uuid) => {
    await invoke("remove_account", { uuid });
    const stillActive = get().account?.uuid === uuid;
    await get().loadAccounts();
    if (stillActive) {
      const next = get().accounts[0];
      if (next) {
        await get().selectAccount(next.uuid);
      } else {
        set({ account: null });
      }
    }
  },

  logout: async () => {
    const uuid = get().account?.uuid;
    if (uuid) {
      await get().removeAccount(uuid);
    }
  },
}));

export type { Account };
