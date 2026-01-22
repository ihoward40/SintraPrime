// templates/tauri-teaching-cockpit/src/components/TeachingToggle.tsx

import React from "react";

export function TeachingToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="teaching-toggle" onClick={() => onChange(!value)}>
      Teaching: {value ? "ON" : "OFF"}
    </button>
  );
}
