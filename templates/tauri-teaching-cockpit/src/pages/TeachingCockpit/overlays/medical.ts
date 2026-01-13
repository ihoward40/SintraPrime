// templates/tauri-teaching-cockpit/src/pages/TeachingCockpit/overlays/medical.ts

import type { TeachingPage } from "../pages";

// Vocabulary swap only. No logic. No branching.
export const medicalOverlay = (page: TeachingPage): TeachingPage => ({
  ...page,
  body: page.body.map((line) =>
    line
      .replace("file", "medical record")
      .replace("duplicate", "duplicate record")
      .replace("document", "clinical document")
  ),
  footer: page.footer ? page.footer.replace("bundle", "patient record set") : undefined,
});
