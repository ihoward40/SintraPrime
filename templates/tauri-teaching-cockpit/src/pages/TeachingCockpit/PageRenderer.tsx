// templates/tauri-teaching-cockpit/src/pages/TeachingCockpit/PageRenderer.tsx

import React from "react";
import type { TeachingPage } from "./pages";

export function PageRenderer({ page }: { page: TeachingPage }) {
  return (
    <div className="teaching-page">
      <h1>{page.title}</h1>

      {page.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      {page.footer && <div className="teaching-footer">{page.footer}</div>}
    </div>
  );
}
