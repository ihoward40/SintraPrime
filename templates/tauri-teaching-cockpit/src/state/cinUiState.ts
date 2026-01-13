// templates/tauri-teaching-cockpit/src/state/cinUiState.ts

import React, { createContext, useContext, useMemo, useState } from "react";

// UI-only state: descriptive metadata derived from CIN outputs.
// No CIN logic changes: this context stores what the UI already read.

export type CinUiState = {
  profile: string;
};

const DEFAULT_STATE: CinUiState = { profile: "" };

const CinUiContext = createContext<CinUiState>(DEFAULT_STATE);

export function CinUiStateProvider({ children, initial }: { children: React.ReactNode; initial?: Partial<CinUiState> }) {
  const [state] = useState<CinUiState>({ ...DEFAULT_STATE, ...(initial ?? {}) });
  const value = useMemo(() => state, [state]);
  return <CinUiContext.Provider value={value}>{children}</CinUiContext.Provider>;
}

export function useCinUiState(): CinUiState {
  return useContext(CinUiContext);
}
