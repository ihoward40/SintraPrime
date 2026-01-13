// templates/tauri-teaching-cockpit/src/pages/CinCockpit.tsx

import React, { useState } from "react";
import { BannerReadOnly } from "../components/BannerReadOnly";
import { TeachingToggle } from "../components/TeachingToggle";
import { TeachingCockpit } from "./TeachingCockpit/TeachingCockpit";

// This file is intentionally minimal: it demonstrates how to mount the Teaching Cockpit
// alongside your CIN cockpit UI without changing CIN logic.

export function CinCockpit() {
  const [teaching, setTeaching] = useState(false);

  return (
    <div className="cin-cockpit">
      <BannerReadOnly />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>CIN</h2>
        <TeachingToggle value={teaching} onChange={setTeaching} />
      </div>

      {teaching ? <TeachingCockpit /> : null}

      {/* Your existing CIN cockpit UI renders here (unchanged). */}
      {!teaching ? <div style={{ opacity: 0.8 }}>[CIN cockpit UI goes here]</div> : null}
    </div>
  );
}
