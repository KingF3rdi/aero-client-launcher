import { create } from "zustand";
import { invoke } from "../lib/tauri";
import type { ContentFile, Instance, InstancePatch, LaunchStatus } from "../types/instance";

const RAM_STORAGE_KEY = "larp-launcher.ramGb";
const LAST_PLAYED_STORAGE_KEY = "larp-launcher.lastPlayedId";

function loadRamGb(): number {
  try {
    const stored = localStorage.getItem(RAM_STORAGE_KEY);
    return stored ? Number(stored) : 4;
  } catch {
    return 4;
  }
}

function loadLastPlayedId(): string | null {
  try {
    return localStorage.getItem(LAST_PLAYED_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveLastPlayedId(id: string) {
  try {
    localStorage.setItem(LAST_PLAYED_STORAGE_KEY, id);
  } catch {
    // localStorage unavailable - Play just won't default to this instance next launch.
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
  play: (account: { name: string; uuid: string; mcToken: string }, instanceId?: string) => Promise<void>;
  updateInstance: (id: string, patch: InstancePatch) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  duplicateInstance: (id: string) => Promise<void>;
  addInstance: (name: string, mcVersion: string) => Promise<void>;
  fetchLog: (id: string) => Promise<string>;
  fetchContent: (id: string) => Promise<ContentFile[]>;
  toggleContentFile: (id: string, relPath: string) => Promise<ContentFile>;
  deleteContentFile: (id: string, relPath: string) => Promise<void>;
  exportModpack: (id: string, destPath: string) => Promise<void>;
  fetchContentIcons: (id: string) => Promise<Record<string, string>>;
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  selectedId: null,
  ramGb: loadRamGb(),
  launch: { phase: "idle", message: "Bereit" },

  loadInstances: async () => {
    const instances = await invoke<Instance[]>("get_instances");
    set((state) => {
      if (state.selectedId) return { instances };
      const lastPlayedId = loadLastPlayedId();
      const defaultId = instances.find((i) => i.id === lastPlayedId)?.id ?? instances[0]?.id ?? null;
      return { instances, selectedId: defaultId };
    });
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

  play: async (account, instanceId) => {
    const { ramGb } = get();
    const targetId = instanceId ?? get().selectedId;
    if (!targetId) return;
    set({ selectedId: targetId, launch: { phase: "installing", message: "Wird vorbereitet…" } });
    try {
      await invoke("launch_instance", {
        instanceId: targetId,
        ramGb,
        account,
      });
      saveLastPlayedId(targetId);
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
  fetchContentIcons: (id) => invoke<Record<string, string>>("fetch_content_icons", { id }),
}));
