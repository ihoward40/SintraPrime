// templates/tauri-teaching-cockpit/src/pages/TeachingCockpit/overlays/logistics.ts

import type { TeachingPage } from "../pages";

// Vocabulary swap only. No logic. No branching.
export const logisticsOverlay = (page: TeachingPage): TeachingPage => ({
  ...page,
  body: page.body.map((line) =>
    line
      .replace("file", "shipment record")
      .replace("duplicate", "duplicate manifest")
      .replace("document", "logistics document")
  ),
  footer: page.footer ? page.footer.replace("bundle", "chain-of-custody packet") : undefined,
});
