// templates/tauri-teaching-cockpit/src/components/HighlightBox.tsx

import React from "react";

export function HighlightBox({ label }: { label: string }) {
  return (
    <span
      className="highlight-box"
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.06)",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}
