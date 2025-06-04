import React from "react";

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div style={{
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#2d2d2d",
    padding: 20,
    borderRadius: 8,
    zIndex: 10000,
    width: 360,
    boxShadow: "0 0 10px rgba(0,0,0,0.7)",
  }}>
    <p style={{ color: "#fff", marginBottom: 20 }}>{message}</p>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <button
        onClick={onConfirm}
        style={{
          flex: 1,
          background: "#10b981",
          color: "#fff",
          border: "none",
          padding: 10,
          borderRadius: 4,
          transition: "filter 0.3s",
          cursor: "pointer",
        }}
        onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
        onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
      >
        Yes
      </button>
      <button
        onClick={onCancel}
        style={{
          flex: 1,
          background: "#ef4444",
          color: "#fff",
          border: "none",
          padding: 10,
          borderRadius: 4,
          transition: "filter 0.3s",
          cursor: "pointer",
        }}
        onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
        onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
      >
        No
      </button>
    </div>
  </div>
);

export default ConfirmDialog;
