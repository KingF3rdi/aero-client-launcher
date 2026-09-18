export interface Account {
  name: string;
  uuid: string;
  /** Never sent back to the frontend as a live secret beyond this session's memory. */
  mcToken: string;
  /** Mojang's own texture URL for the account's current skin, if any. */
  skinUrl: string | null;
}

export interface AccountSummary {
  name: string;
  uuid: string;
  active: boolean;
}
