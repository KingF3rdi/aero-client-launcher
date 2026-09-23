import { invoke as tauriInvoke, isTauri } from "@tauri-apps/api/core";

/**
 * Thin wrapper around Tauri's invoke so the UI can also be eyeballed with a
 * plain `npm run dev` in a browser (no Rust/Tauri needed) while the real
 * backend is being built - falls back to DEV_MOCKS below instead of
 * throwing "invoke is not a function" outside a Tauri webview.
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    return tauriInvoke<T>(command, args);
  }
  const mock = DEV_MOCKS[command];
  if (!mock) {
    throw new Error(`No dev mock for Tauri command "${command}" (running outside Tauri)`);
  }
  await new Promise((r) => setTimeout(r, 250));
  return mock(args) as T;
}

type MockFn = (args?: Record<string, unknown>) => unknown;

// A plain mutable array (not a store) so dev-mode invoke() mocks can read/write
// it across calls the same way the real Rust side persists instances.json.
const mockInstances: Array<Record<string, unknown>> = [
  { id: "fabric-1.21.11", name: "Fabric 1.21.11", mcVersion: "1.21.11", loader: "fabric", modEnabled: true, ramGb: null },
  { id: "fabric-1.21.8", name: "Fabric 1.21.8", mcVersion: "1.21.8", loader: "fabric", modEnabled: false, ramGb: null },
  { id: "fabric-1.21.4", name: "Fabric 1.21.4", mcVersion: "1.21.4", loader: "fabric", modEnabled: false, ramGb: null },
  { id: "fabric-1.21.1", name: "Fabric 1.21.1", mcVersion: "1.21.1", loader: "fabric", modEnabled: false, ramGb: null },
];

const mockAccounts: Array<{ name: string; uuid: string; mcToken: string; skinUrl: string | null }> = [];
let mockActiveUuid: string | null = null;
const mockEquippedCapes: Record<string, string> = {};

const DEV_MOCKS: Record<string, MockFn> = {
  get_saved_account: () => mockAccounts.find((a) => a.uuid === mockActiveUuid) ?? null,
  list_accounts: () => mockAccounts.map((a) => ({ name: a.name, uuid: a.uuid, active: a.uuid === mockActiveUuid })),
  select_account: (args) => {
    const account = mockAccounts.find((a) => a.uuid === args?.uuid);
    if (!account) throw new Error("Unbekannter Account");
    mockActiveUuid = account.uuid;
    return account;
  },
  remove_account: (args) => {
    const idx = mockAccounts.findIndex((a) => a.uuid === args?.uuid);
    if (idx >= 0) mockAccounts.splice(idx, 1);
    if (mockActiveUuid === args?.uuid) mockActiveUuid = mockAccounts[0]?.uuid ?? null;
    return null;
  },
  get_instances: () => mockInstances,
  update_instance: (args) => {
    const inst = mockInstances.find((i) => i.id === args?.id);
    if (!inst) throw new Error("Unbekannte Instanz");
    const patch = (args?.patch as Record<string, unknown>) ?? {};
    if (typeof patch.name === "string") inst.name = patch.name;
    if (typeof patch.modEnabled === "boolean") inst.modEnabled = patch.modEnabled;
    if ("ramGb" in patch) inst.ramGb = patch.ramGb;
    return inst;
  },
  delete_instance: (args) => {
    const idx = mockInstances.findIndex((i) => i.id === args?.id);
    if (idx >= 0) mockInstances.splice(idx, 1);
    return null;
  },
  duplicate_instance: (args) => {
    const inst = mockInstances.find((i) => i.id === args?.id);
    if (!inst) throw new Error("Unbekannte Instanz");
    const copy = { ...inst, id: `${inst.id}-copy-${Date.now().toString(16).slice(-5)}`, name: `${inst.name} (Kopie)` };
    mockInstances.push(copy);
    return copy;
  },
  add_instance: (args) => {
    const mcVersion = String(args?.mcVersion ?? "1.21.11");
    const inst = {
      id: `fabric-${mcVersion}-${Date.now().toString(16).slice(-5)}`,
      name: String(args?.name ?? "Neue Instanz"),
      mcVersion,
      loader: "fabric",
      modEnabled: mcVersion === "1.21.11",
      ramGb: null,
    };
    mockInstances.push(inst);
    return inst;
  },
  get_instance_log: () => "[12:00:01] [Render thread/INFO]: Dev-Mock - noch kein echtes Log außerhalb von Tauri.",
  list_instance_content: () => [
    { relPath: "mods/sodium.jar", name: "sodium.jar", kind: "mod", enabled: true },
    { relPath: "mods/lithium.jar.disabled", name: "lithium.jar", kind: "mod", enabled: false },
    { relPath: "resourcepacks/faithful.zip", name: "faithful.zip", kind: "resourcepack", enabled: true },
  ],
  toggle_content_file: (args) => {
    const relPath = String(args?.relPath ?? "");
    const enabled = relPath.endsWith(".disabled");
    const name = (relPath.split("/").pop() ?? "").replace(/\.disabled$/, "");
    const folder = relPath.split("/")[0];
    return { relPath: `${folder}/${enabled ? name : `${name}.disabled`}`, name, kind: folder === "mods" ? "mod" : "resourcepack", enabled };
  },
  delete_content_file: () => null,
  export_modpack: () => null,
  fetch_content_icons: () => ({
    "mods/sodium.jar": "https://cdn.modrinth.com/data/AANobbMI/icon.png",
  }),
  upload_skin: () => null,
  search_content: (args) => {
    const type = String(args?.projectType ?? "mod");
    const offset = Number(args?.offset ?? 0);
    const totalHits = 42;
    const hits = Array.from({ length: Math.min(6, Math.max(0, totalHits - offset)) }, (_, i) => ({
      id: `dev-${type}-${offset + i}`,
      slug: `dev-${type}-${offset + i}`,
      title: `Dev-Mock ${type} #${offset + i + 1}`,
      description: "Nur sichtbar außerhalb von Tauri - echte Suche läuft über Modrinths API.",
      iconUrl: null,
      downloads: 1000 * (offset + i + 1),
      projectType: type,
    }));
    return { hits, totalHits };
  },
  install_content: () => "dev-mock.jar",
  install_modpack: (args) => ({
    id: "dev-modpack",
    name: String(args?.instanceName ?? "Dev Modpack"),
    mcVersion: "1.21.11",
    loader: "fabric",
    modEnabled: false,
    ramGb: null,
  }),
  import_modpack_file: () => ({
    id: "dev-modpack-import",
    name: "Importiertes Modpack",
    mcVersion: "1.21.11",
    loader: "fabric",
    modEnabled: false,
    ramGb: null,
  }),
  login_with_browser: () => {
    const account = { name: "DevTester", uuid: "dev-uuid", mcToken: "dev-token", skinUrl: null };
    if (!mockAccounts.some((a) => a.uuid === account.uuid)) mockAccounts.push(account);
    mockActiveUuid = account.uuid;
    return account;
  },
  launch_instance: () => null,
  stop_instance: () => null,
  logout: () => null,
  list_capes: () =>
    fetch("https://aero.gamekni9ht.workers.dev/api/capes")
      .then((r) => r.json())
      .then((j) => j.capes),
  publish_cape: () => {
    throw new Error("Cape-Upload braucht die native App (nicht im Browser-Vorschau).");
  },
  delete_cape: () => null,
  equipped_cape: (args) => mockEquippedCapes[String(args?.instanceId)] ?? "none",
  equip_cape: (args) => {
    mockEquippedCapes[String(args?.instanceId)] = (args?.capeId as string | null) ?? "none";
    return null;
  },
};
