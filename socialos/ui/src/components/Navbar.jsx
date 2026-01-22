import React from "react";
import HealthStatusCard from "./HealthStatusCard.jsx";

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      style={{
        fontSize: 13,
        padding: "4px 8px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: active ? "#f6f6f6" : "#fff",
        cursor: active ? "default" : "pointer"
      }}
    >
      {children}
    </button>
  );
}

export default function Navbar({ apiBase, view, setView }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        padding: 12,
        borderBottom: "1px solid #ddd",
        background: "#fff"
      }}
    >
      <div>
        <div style={{ fontWeight: 700 }}>SintraPrime SocialOS</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")}>
            Dashboard
          </NavButton>
          <NavButton active={view === "content"} onClick={() => setView("content")}>
            Content
          </NavButton>
          <NavButton active={view === "calendar"} onClick={() => setView("calendar")}>
            Calendar
          </NavButton>
          <NavButton active={view === "receipts"} onClick={() => setView("receipts")}>
            Receipts
          </NavButton>
        </div>
      </div>

      <HealthStatusCard apiBase={apiBase} />
    </div>
  );
}
