export interface Account {
  name: string;
  uuid: string;
  /** Never sent back to the frontend as a live secret beyond this session's memory. */
  mcToken: string;
}

export interface AccountSummary {
  name: string;
  uuid: string;
  active: boolean;
}

export interface DeviceCodeStart {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export type DeviceCodePollStatus = "pending" | "success" | "expired" | "error";

export interface DeviceCodePollResult {
  status: DeviceCodePollStatus;
  account?: Account;
  message?: string;
}
