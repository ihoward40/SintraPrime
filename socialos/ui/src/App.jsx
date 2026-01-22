import React, { useState } from "react";

import Calendar from "./pages/Calendar.jsx";
import Navbar from "./components/Navbar.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

export function App() {
  const [view, setView] = useState("calendar");

  return (
    <div style={{ fontFamily: "system-ui" }}>
      <Navbar apiBase={API_BASE} view={view} setView={setView} />

      <div style={{ padding: 12, maxWidth: 980, margin: "0 auto" }}>
        {view === "calendar" ? <Calendar /> : null}
        {view === "dashboard" ? <div>Dashboard (coming soon)</div> : null}
        {view === "content" ? <div>Content (coming soon)</div> : null}
        {view === "receipts" ? <div>Receipts (coming soon)</div> : null}
      </div>
    </div>
  );
}
