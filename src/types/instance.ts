export interface Instance {
  id: string;
  name: string;
  mcVersion: string;
  loader: "fabric" | "vanilla";
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
