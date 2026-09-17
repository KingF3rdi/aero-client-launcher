export interface Instance {
  id: string;
  name: string;
  mcVersion: string;
  loader: "fabric" | "vanilla";
  modEnabled: boolean;
  ramGb: number | null;
}

export interface InstancePatch {
  name?: string;
  modEnabled?: boolean;
  ramGb?: number | null;
}

export type LaunchPhase =
  | "idle"
  | "installing"
  | "downloading"
  | "starting"
  | "running"
  | "error";

export interface LaunchStatus {
  phase: LaunchPhase;
  message: string;
  progress?: number;
}
