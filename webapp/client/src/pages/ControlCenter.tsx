import React, { useState } from "react";
import { offlineJobs, offlineReceipts, offlineHeartbeat } from "@/offline/controlCenterFixtures";

const ControlCenter: React.FC = () => {
  // determine mode
  const envMode = import.meta.env.VITE_SINTRA_UI_MODE || process.env.SINTRA_UI_MODE;
  const mode = envMode ?? "offline";

  const [activeTab, setActiveTab] = useState<string>("jobs");
  const [heartbeatConfig, setHeartbeatConfig] = useState(offlineHeartbeat);

  const applyHeartbeatChange = () => {
    // in real app this would dispatch a config change; offline we just console.log
    console.log("CONFIG_CHANGE_APPLIED", heartbeatConfig);
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
            {offlineJobs.map((j) => (
              <li key={j.id}>{j.name} [{j.status}]</li>
            ))}
          </ul>
        )}
        {activeTab === "receipts" && (
          <ul>
            {offlineReceipts.map((r) => (
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
