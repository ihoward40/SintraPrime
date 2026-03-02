import React, { useState, useEffect } from "react";
import { offlineJobs, offlineReceipts, offlineHeartbeat } from "@/offline/controlCenterFixtures";

// shape definitions for fetched data
export interface Job {
  job_id: string;
  name?: string;
  status?: string;
  // any other properties coming from the backend
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

const ControlCenter: React.FC = () => {
  // determine mode
  const envMode = import.meta.env.VITE_SINTRA_UI_MODE || process.env.SINTRA_UI_MODE;
  const mode = envMode ?? "offline";

  const [activeTab, setActiveTab] = useState<string>("jobs");
  const [heartbeatConfig, setHeartbeatConfig] = useState<HeartbeatConfig>(offlineHeartbeat);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  // fetch logic depending on mode
  useEffect(() => {
    if (activeTab === "jobs") {
      if (mode === "offline") {
        setJobs(offlineJobs as Job[]);
        return;
      }
      fetch("/api/scheduler/history?limit=100")
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.rows)) {
            // dedupe by job_id
            const uniq = Array.from(
              new Map(data.rows.map((r: any) => [r.job_id, r])).values()
            );
            setJobs(uniq as Job[]);
          } else {
            setJobs(offlineJobs as Job[]);
          }
        })
        .catch(() => setJobs(offlineJobs as Job[]));
    } else if (activeTab === "receipts") {
      if (mode === "offline") {
        setReceipts(offlineReceipts as Receipt[]);
        return;
      }
      fetch("/api/receipts?limit=100")
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.receipts)) {
            setReceipts(data.receipts as Receipt[]);
          } else {
            setReceipts(offlineReceipts as Receipt[]);
          }
        })
        .catch(() => setReceipts(offlineReceipts as Receipt[]));
    }
  }, [activeTab, mode]);

  const applyHeartbeatChange = async () => {
    if (mode === "offline") {
      console.log("CONFIG_CHANGE_APPLIED", heartbeatConfig);
      return;
    }

    try {
      const resp = await fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heartbeatConfig),
      });
      if (resp.ok) {
        const result = await resp.json();
        console.log("CONFIG_CHANGE_APPLIED", result);
      } else {
        console.error("heartbeat update failed", resp.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h1>Control Center ({mode})</h1>
      <nav>
        <button onClick={() => setActiveTab("jobs")}>Jobs</button>
        <button onClick={() => setActiveTab("receipts")}>Receipts</button>
        <button onClick={() => setActiveTab("heartbeat")}>Heartbeat</button>
      </nav>
      <section>
        {activeTab === "jobs" && (
          <ul>
            {jobs.map((j) => (
              <li key={j.job_id}>{j.name || j.job_id} [{j.status || "-"}]</li>
            ))}
          </ul>
        )}
        {activeTab === "receipts" && (
          <ul>
            {receipts.map((r) => (
              <li key={r.id}>
                {r.id} - job {r.jobId} - {r.result}
              </li>
            ))}
          </ul>
        )}
        {activeTab === "heartbeat" && (
          <div>
            <label>
              Enabled:
              <input
                type="checkbox"
                checked={heartbeatConfig.enabled}
                onChange={(e) =>
                  setHeartbeatConfig({
                    ...heartbeatConfig,
                    enabled: e.target.checked,
                  })
                }
              />
            </label>
            <br />
            <label>
              Interval (minutes):
              <input
                type="number"
                value={heartbeatConfig.intervalMinutes}
                onChange={(e) =>
                  setHeartbeatConfig({
                    ...heartbeatConfig,
                    intervalMinutes: Number(e.target.value),
                  })
                }
              />
            </label>
            <br />
            <button onClick={applyHeartbeatChange}>Apply</button>
            <pre>{JSON.stringify({ CONFIG_CHANGE_APPLIED: heartbeatConfig }, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
};

export default ControlCenter;
