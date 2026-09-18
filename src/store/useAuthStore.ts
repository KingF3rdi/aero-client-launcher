import { create } from "zustand";
import { invoke } from "../lib/tauri";
import type { Account, AccountSummary } from "../types/account";

interface AuthState {
  account: Account | null;
  accounts: AccountSummary[];
  loading: boolean;
  loggingIn: boolean;
  loginError: string | null;
  init: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  login: () => Promise<void>;
  selectAccount: (uuid: string) => Promise<void>;
  removeAccount: (uuid: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  account: null,
  accounts: [],
  loading: true,
  loggingIn: false,
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

  // Opens the system browser straight at Microsoft's sign-in page and waits
  // for the Rust side's local redirect listener to catch the result - no
  // device code to type, no polling loop on this side either.
  login: async () => {
    set({ loginError: null, loggingIn: true });
    try {
      const account = await invoke<Account>("login_with_browser");
      set({ account, loggingIn: false });
      get().loadAccounts();
    } catch (e) {
      set({ loginError: String(e), loggingIn: false });
    }
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
