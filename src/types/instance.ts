export interface Instance {
  id: string;
  name: string;
  mcVersion: string;
  loader: "fabric" | "vanilla";
  modEnabled: boolean;
  ramGb: number | null;
  pinned?: boolean;
}

export interface InstancePatch {
  name?: string;
  modEnabled?: boolean;
  ramGb?: number | null;
  pinned?: boolean;
}

export interface ContentFile {
  relPath: string;
  name: string;
  kind: "mod" | "resourcepack" | "shader";
  enabled: boolean;
  /** Why this mod will not work here: wrong Minecraft version, or it does an Aero module's job. */
  issue?: { kind: "version" | "aero"; text: string } | null;
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
