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

const DEV_MOCKS: Record<string, MockFn> = {
  get_saved_account: () => null,
  get_instances: () => [
    { id: "fabric-1.21.11", name: "Fabric 1.21.11", mcVersion: "1.21.11", loader: "fabric" },
    { id: "fabric-1.21.8", name: "Fabric 1.21.8", mcVersion: "1.21.8", loader: "fabric" },
    { id: "fabric-1.21.4", name: "Fabric 1.21.4", mcVersion: "1.21.4", loader: "fabric" },
    { id: "fabric-1.21.1", name: "Fabric 1.21.1", mcVersion: "1.21.1", loader: "fabric" },
  ],
  begin_device_code_login: () => ({
    userCode: "ABCD-EFGH",
    verificationUri: "https://microsoft.com/link",
    expiresIn: 900,
    interval: 5,
  }),
  poll_device_code_login: () => ({
    status: "pending",
  }),
  launch_instance: () => null,
  logout: () => null,
};
