export type EnsurePathResult = {
  finalId: string;
  created: Array<{ name: string; id: string }>;
  found: Array<{ name: string; id: string }>;
  chain: Array<{ name: string; id: string; created: boolean }>;
  provider: string;
};

export type EnsurePathProviderArgs = {
  root: string;
  segments: string[];
  dryRun: boolean;
};

export interface EnsurePathProvider {
  providerId: string;
  ensurePath(args: EnsurePathProviderArgs): Promise<EnsurePathResult>;
}
