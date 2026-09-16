import { create } from "zustand";
import { invoke } from "../lib/tauri";
import type { Instance, LaunchStatus } from "../types/instance";

interface InstanceState {
  instances: Instance[];
  selectedId: string | null;
  ramGb: number;
  launch: LaunchStatus;
  loadInstances: () => Promise<void>;
  select: (id: string) => void;
  setRam: (gb: number) => void;
  play: (account: { name: string; uuid: string; mcToken: string }) => Promise<void>;
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  selectedId: null,
  ramGb: 4,
  launch: { phase: "idle", message: "Bereit" },

  loadInstances: async () => {
    const instances = await invoke<Instance[]>("get_instances");
    set((state) => ({
      instances,
      selectedId: state.selectedId ?? instances[0]?.id ?? null,
    }));
  },

  select: (id) => set({ selectedId: id }),
  setRam: (gb) => set({ ramGb: gb }),

  play: async (account) => {
    const { selectedId, ramGb } = get();
    if (!selectedId) return;
    set({ launch: { phase: "installing", message: "Wird vorbereitet…" } });
    try {
      await invoke("launch_instance", {
        instanceId: selectedId,
        ramGb,
        account,
      });
      set({ launch: { phase: "running", message: "Gestartet" } });
    } catch (e) {
      set({ launch: { phase: "error", message: String(e) } });
    }
  },
}));
