// Offline fixtures for the Control Center shell

export interface Job {
  id: string;
  name: string;
  status?: string;
}

export interface Receipt {
  id: string;
  jobId: string;
  result?: string;
}

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMinutes: number;
}

export const offlineJobs: Job[] = [
  { id: "1", name: "Example job", status: "idle" },
  { id: "2", name: "Another job", status: "running" },
];

export const offlineReceipts: Receipt[] = [
  { id: "r1", jobId: "1", result: "success" },
  { id: "r2", jobId: "2", result: "pending" },
];

export const offlineHeartbeat: HeartbeatConfig = {
  enabled: true,
  intervalMinutes: 15,
};
