import { create } from "zustand";
import { invoke } from "../lib/tauri";
import type { ContentFile, Instance, InstancePatch, LaunchStatus } from "../types/instance";

const RAM_STORAGE_KEY = "larp-launcher.ramGb";

function loadRamGb(): number {
  try {
    const stored = localStorage.getItem(RAM_STORAGE_KEY);
    return stored ? Number(stored) : 4;
  } catch {
    return 4;
  }
}

interface InstanceState {
  instances: Instance[];
  selectedId: string | null;
  ramGb: number;
  launch: LaunchStatus;
  loadInstances: () => Promise<void>;
  select: (id: string) => void;
  setRam: (gb: number) => void;
  play: (account: { name: string; uuid: string; mcToken: string }) => Promise<void>;
  updateInstance: (id: string, patch: InstancePatch) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  duplicateInstance: (id: string) => Promise<void>;
  addInstance: (name: string, mcVersion: string) => Promise<void>;
  fetchLog: (id: string) => Promise<string>;
  fetchContent: (id: string) => Promise<ContentFile[]>;
  toggleContentFile: (id: string, relPath: string) => Promise<ContentFile>;
  deleteContentFile: (id: string, relPath: string) => Promise<void>;
  exportModpack: (id: string, destPath: string) => Promise<void>;
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  selectedId: null,
  ramGb: loadRamGb(),
  launch: { phase: "idle", message: "Bereit" },

  loadInstances: async () => {
    const instances = await invoke<Instance[]>("get_instances");
    set((state) => ({
      instances,
      selectedId: state.selectedId ?? instances[0]?.id ?? null,
    }));
  },

  select: (id) => set({ selectedId: id }),
  setRam: (gb) => {
    set({ ramGb: gb });
    try {
      localStorage.setItem(RAM_STORAGE_KEY, String(gb));
    } catch {
      // localStorage unavailable (e.g. private mode) - RAM just won't persist across restarts.
    }
  },

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

  updateInstance: async (id, patch) => {
    const updated = await invoke<Instance>("update_instance", { id, patch });
    set((state) => ({ instances: state.instances.map((i) => (i.id === id ? updated : i)) }));
  },

  deleteInstance: async (id) => {
    await invoke("delete_instance", { id });
    set((state) => ({
      instances: state.instances.filter((i) => i.id !== id),
      selectedId: state.selectedId === id ? (state.instances.find((i) => i.id !== id)?.id ?? null) : state.selectedId,
    }));
  },

  duplicateInstance: async (id) => {
    const copy = await invoke<Instance>("duplicate_instance", { id });
    set((state) => ({ instances: [...state.instances, copy] }));
  },

  addInstance: async (name, mcVersion) => {
    const created = await invoke<Instance>("add_instance", { name, mcVersion });
    set((state) => ({ instances: [...state.instances, created], selectedId: created.id }));
  },

  fetchLog: (id) => invoke<string>("get_instance_log", { id }),
  fetchContent: (id) => invoke<ContentFile[]>("list_instance_content", { id }),
  toggleContentFile: (id, relPath) => invoke<ContentFile>("toggle_content_file", { id, relPath }),
  deleteContentFile: (id, relPath) => invoke("delete_content_file", { id, relPath }),
  exportModpack: (id, destPath) => invoke("export_modpack", { id, destPath }),
}));
