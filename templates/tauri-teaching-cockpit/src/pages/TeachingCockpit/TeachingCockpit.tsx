// templates/tauri-teaching-cockpit/src/pages/TeachingCockpit/TeachingCockpit.tsx

// @ts-nocheck

import React, { useEffect, useMemo, useState } from "react";
import { teachingPages } from "./pages";
import { PageRenderer } from "./PageRenderer";
import { useCinUiState } from "../../state/cinUiState";
import { getOverlay } from "./overlays";
import { logOperatorAction } from "../../state/operatorLog";

export function TeachingCockpit() {
  const [pageIndex, setPageIndex] = useState(0);
  const { profile } = useCinUiState();
  const overlay = useMemo(() => getOverlay(profile), [profile]);

  useEffect(() => {
    // Spec: log on view mount (not hover, not background).
    logOperatorAction("teaching_mode_viewed", null, { ui_surface: "cin_cockpit" }).catch(() => void 0);
  }, []);

  const page = overlay(teachingPages[pageIndex]);

  return (
    <div className="teaching-cockpit">
      <PageRenderer page={page} />

      <div className="teaching-nav">
        <button disabled={pageIndex === 0} onClick={() => setPageIndex((p) => p - 1)}>
          Back
        </button>
        <button disabled={pageIndex === teachingPages.length - 1} onClick={() => setPageIndex((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
