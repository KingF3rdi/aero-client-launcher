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

export interface ContentFile {
  relPath: string;
  name: string;
  kind: "mod" | "resourcepack" | "shader";
  enabled: boolean;
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
