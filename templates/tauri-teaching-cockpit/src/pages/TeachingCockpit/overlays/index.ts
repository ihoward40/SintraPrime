// templates/tauri-teaching-cockpit/src/pages/TeachingCockpit/overlays/index.ts

import type { TeachingPage } from "../pages";
import { defaultOverlay } from "./default";
import { financeOverlay } from "./finance";
import { medicalOverlay } from "./medical";
import { logisticsOverlay } from "./logistics";

export type OverlayFn = (page: TeachingPage) => TeachingPage;

export function getOverlay(profile: string | null | undefined): OverlayFn {
  switch (profile) {
    case "finance_v1":
      return financeOverlay;
    case "medical_v1":
      return medicalOverlay;
    case "logistics_v1":
      return logisticsOverlay;
    default:
      return defaultOverlay;
  }
}
