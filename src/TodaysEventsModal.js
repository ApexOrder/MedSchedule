import React from "react";

const TodaysEventsModal = ({ show, eventsByTag, onClose }) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(25,28,38,0.77)",
        zIndex: 4444,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.18s"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#232338",
          borderRadius: 22,
          minWidth: 350,
          maxWidth: 510,
          width: "97vw",
          maxHeight: "82vh",
          boxShadow: "0 16px 32px #0007",
          padding: "28px 32px 22px",
          position: "relative",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 15,
            background: "none",
            color: "#fff",
            fontSize: 22,
            border: "none",
            cursor: "pointer",
            opacity: 0.7,
            transition: "opacity 0.15s"
          }}
          title="Close"
          onMouseEnter={e => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={e => (e.currentTarget.style.opacity = 0.7)}
        >✕</button>
        <h2 style={{
          color: "#f97316",
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 18,
          letterSpacing: 0.1,
          textAlign: "center"
        }}>
          Today’s Events
        </h2>
        {Object.keys(eventsByTag).length === 0 && (
          <div style={{ color: "#ccc", textAlign: "center" }}>
            No events scheduled for today.
          </div>
        )}
        {Object.entries(eventsByTag).map(([tag, events]) => (
          <div key={tag} style={{ marginBottom: 20 }}>
            <div style={{
              color: "#f97316",
              fontWeight: 600,
              fontSize: 16,
              marginBottom: 8
            }}>
              {tag}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {events.map(ev => (
                <li key={ev.id}
                  style={{
                    background: "#29293e",
                    marginBottom: 8,
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#fff",
                  }}
                >
                  <strong>{ev.title}</strong>
                  {ev.notes && (
                    <div style={{
                      fontSize: 13,
                      color: "#bbb",
                      marginTop: 4
                    }}>{ev.notes}</div>
                  )}
                  {ev.completed && (
                    <span
                      title="Completed"
                      style={{
                        marginLeft: 8,
                        color: "#10b981",
                        fontWeight: 600,
                        fontSize: 16,
                        verticalAlign: "middle"
                      }}
                    >✔</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodaysEventsModal;
