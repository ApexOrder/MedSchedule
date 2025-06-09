// src/components/TodaysEventsModal.jsx

import React from "react";

const TodaysEventsModal = ({ show, eventsByTag, onClose }) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.6)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#232338",
          color: "#fff",
          padding: 24,
          borderRadius: 12,
          maxWidth: "90%",
          width: 480,
          maxHeight: "80%",
          overflowY: "auto",
        }}
      >
        <h3 style={{ marginBottom: 16 }}>🗓️ Today’s Events</h3>

        {Object.entries(eventsByTag).map(([tagName, events]) => (
          <div key={tagName} style={{ marginBottom: 20 }}>
            <h4 style={{ color: "#f97316", marginBottom: 8 }}>{tagName}</h4>
            <ul style={{ paddingLeft: 20 }}>
              {events.map(event => (
                <li key={event.id} style={{ marginBottom: 6 }}>
                  <strong>{event.title}</strong>
                  {event.notes && <> — <em>{event.notes}</em></>}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            background: "#f97316",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default TodaysEventsModal;
