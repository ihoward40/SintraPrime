// templates/tauri-teaching-cockpit/src/pages/TeachingCockpit/overlays/finance.ts

import type { TeachingPage } from "../pages";

// Overlay = text transform only.
export const financeOverlay = (page: TeachingPage): TeachingPage => ({
  ...page,
  body: page.body.map((line) =>
    line
      .replace("file", "document")
      .replace("duplicate", "duplicate statement")
  ),
});
