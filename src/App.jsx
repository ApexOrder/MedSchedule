import React, { useEffect, useState } from "react";
import { app, authentication } from "@microsoft/teams-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./index.css";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(null);
  const [authDebug, setAuthDebug] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(null);
  const [editMode, setEditMode] = useState("single"); // "single" or "series"

  const [newEvent, setNewEvent] = useState({
    title: "",
    notes: "",
    date: "",
    isRecurring: false,
    interval: 7,
    endDate: "",
    color: "#f97316",
    createdBy: "",
    createdAt: "",
    originDate: ""
  });

  const debug = (msg) => setAuthDebug((prev) => [...prev, msg]);

  useEffect(() => {
    debug("🌐 iframe origin: " + window.location.origin);
    debug("🔰 Initializing Microsoft Teams SDK...");

    app.initialize()
      .then(() => {
        debug("🟢 Teams SDK initialized.");
        return app.getContext();
      })
      .then(() => {
        debug("🟢 Got Teams context.");
        authentication.getAuthToken({
          successCallback: (token) => {
            debug("✅ Auth token acquired.");

            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              debug("🧾 Token audience: " + payload.aud);
            } catch (e) {
              debug("❌ Failed to decode token: " + e.message);
            }

            fetch("/api/getUser", {
              headers: {
                Authorization: `Bearer ${token}`
              }
            })
              .then((res) => res.json())
              .then((data) => {
                setUser({
                  displayName: data.displayName,
                  email: data.email
                });
                debug("✅ Custom API user fetched: " + data.displayName);
              })
              .catch((err) => {
                debug("❌ Custom API error: " + JSON.stringify(err));
              });
          },
          failureCallback: (err) => {
            debug("❌ getAuthToken error: " + JSON.stringify(err));
          }
        });
      })
      .catch((err) => debug("❌ Initialization failed: " + JSON.stringify(err)));
  }, []);

  const handleDateClick = (info) => {
    debug("📅 Date clicked: " + info.dateStr);
    const createdAt = new Date().toISOString();
    setNewEvent({
      title: "",
      notes: "",
      date: info.dateStr,
      isRecurring: false,
      interval: 7,
      endDate: "",
      color: "#f97316",
      createdBy: user?.displayName || "Unknown",
      createdAt,
      originDate: info.dateStr
    });
    setSelectedEventIndex(null);
    setShowModal(true);
    setEditMode("single");
  };

  const handleEventClick = (clickInfo) => {
    const index = events.findIndex(
      (e) => e.title === clickInfo.event.title && e.date === clickInfo.event.startStr
    );
    if (index !== -1) {
      setNewEvent(events[index]);
      setSelectedEventIndex(index);
      setShowModal(true);
      setEditMode("single"); // default to single on open
    }
  };

  const handleSaveEvent = () => {
    const { title, date, isRecurring, interval, endDate } = newEvent;
    if (!title || !date) return;

    let updatedEvents = [...events];

    if (selectedEventIndex !== null) {
      if (editMode === "series" && newEvent.originDate) {
        // Update all events in series - no deletion, just update properties
        updatedEvents = updatedEvents.map(e => {
          if (e.originDate === newEvent.originDate) {
            return {
              ...e,
              title,
              notes: newEvent.notes,
              color: newEvent.color,
              isRecurring,
              interval,
              endDate,
              createdBy: newEvent.createdBy,
              createdAt: newEvent.createdAt,
            };
          }
          return e;
        });
      } else {
        // Update single event only
        updatedEvents[selectedEventIndex] = { ...newEvent };
      }
    } else {
      // New event creation
      if (isRecurring && endDate) {
        let start = new Date(date);
        const end = new Date(endDate);
        const createdAt = new Date().toISOString();
        while (start <= end) {
          updatedEvents.push({
            ...newEvent,
            date: start.toISOString().split("T")[0],
            originDate: date,
            createdBy: user?.displayName || "Unknown",
            createdAt,
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        updatedEvents.push({
          ...newEvent,
          createdBy: user?.displayName || "Unknown",
          createdAt: new Date().toISOString(),
        });
      }
    }

    setEvents(updatedEvents);
    setShowModal(false);
    setNewEvent({
      title: "",
      notes: "",
      date: "",
      isRecurring: false,
      interval: 7,
      endDate: "",
      color: "#f97316",
      createdBy: "",
      createdAt: "",
      originDate: ""
    });
    setSelectedEventIndex(null);
    setEditMode("single");
  };

  const handleDeleteEvent = () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    const updatedEvents = events.filter((_, index) => index !== selectedEventIndex);
    setEvents(updatedEvents);
    setShowModal(false);
  };

  const handleDeleteSeries = () => {
    if (!window.confirm("Are you sure you want to delete the entire series?")) return;
    const eventToDelete = events[selectedEventIndex];
    const updatedEvents = events.filter(e => e.originDate !== eventToDelete.originDate);
    setEvents(updatedEvents);
    setShowModal(false);
  };

  return (
    <div style={{ padding: 20, background: "#1e1e1e", color: "#fff", minHeight: "100vh" }}>
      <h2
        style={{
          color: "#f97316",
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        Care Calendar
      </h2>

      <div style={{ background: "#2d2d2d", padding: 12, borderRadius: 6, marginBottom: 10 }}>
        {user ? (
          <>
            👤 <strong>{user.displayName}</strong> ({user.email})
          </>
        ) : (
          <>🔄 Authenticating…</>
        )}
      </div>

      {authDebug.length > 0 && (
        <div
          style={{
            background: "#3a3a3a",
            padding: 10,
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "monospace",
            marginBottom: 20,
          }}
        >
          <strong>🔧 Auth Debug Log:</strong>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 5 }}>{authDebug.join("\n")}</pre>
        </div>
      )}

      <div style={{ margin: "0 auto", maxWidth: 1200 }}>
        {showModal && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#2d2d2d",
              padding: 20,
              borderRadius: 8,
              zIndex: 9999,
              width: 400,
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: 4 }}>
              {selectedEventIndex !== null ? "Edit Event" : "New Event"}
            </h3>

            {/* Created date label */}
            {selectedEventIndex !== null && newEvent.createdAt && (
              <div style={{ color: "#aaa", fontSize: 12, marginBottom: 10 }}>
                Created: {new Date(newEvent.createdAt).toLocaleString()}
              </div>
            )}

            {/* Edit mode choice only when editing series event */}
            {selectedEventIndex !== null &&
              newEvent.originDate &&
              events.some((e) => e.originDate === newEvent.originDate && e !== newEvent) && (
                <div style={{ marginBottom: 10, color: "#fff" }}>
                  <label style={{ marginRight: 12 }}>
                    <input
                      type="radio"
                      name="editMode"
                      value="single"
                      checked={editMode === "single"}
                      onChange={() => setEditMode("single")}
                    />{" "}
                    Edit this event only
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="editMode"
                      value="series"
                      checked={editMode === "series"}
                      onChange={() => setEditMode("series")}
                    />{" "}
                    Edit entire series
                  </label>
                </div>
              )}

            <input
              type="text"
              placeholder="Title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              style={{ width: "100%", marginBottom: 10, padding: 8 }}
            />

            <textarea
              placeholder="Notes"
              value={newEvent.notes}
              onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
              style={{ width: "100%", marginBottom: 10, padding: 8 }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
                gap: 8,
                color: "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={newEvent.isRecurring}
                onChange={(e) => setNewEvent({ ...newEvent, isRecurring: e.target.checked })}
              />
              <span>Recurring event</span>
            </label>

            {newEvent.isRecurring && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ color: "#fff", display: "block", marginBottom: 4 }}>
                  Interval (days):
                </label>
                <input
                  type="number"
                  min="1"
                  value={newEvent.interval}
                  onChange={(e) => setNewEvent({ ...newEvent, interval: Number(e.target.value) })}
                  style={{ width: "100%", padding: 8 }}
                />

                <label
                  style={{ color: "#fff", display: "block", marginTop: 10, marginBottom: 4 }}
                >
                  End date:
                </label>
                <input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button
                onClick={handleSaveEvent}
                style={{
                  background: "#10b981",
                  padding: 10,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  flex: 1,
                }}
              >
                Save
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "#ef4444",
                  padding: 10,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  flex: 1,
                }}
              >
                Cancel
              </button>
            </div>

            {selectedEventIndex !== null && (
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this event?")) {
                      handleDeleteEvent();
                    }
                  }}
                  style={{
                    background: "#ef4444",
                    padding: 10,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    flex: 1,
                  }}
                >
                  Delete Event
                </button>

                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete the entire series?")) {
                      handleDeleteSeries();
                    }
                  }}
                  style={{
                    background: "#b91c1c",
                    padding: 10,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    flex: 1,
                  }}
                >
                  Delete Series
                </button>
              </div>
            )}
          </div>
        )}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            start: "dayGridMonth,timeGridWeek,timeGridDay",
            center: "title",
            end: "prev,next today",
          }}
          initialView="dayGridMonth"
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={events.map((evt) => ({
            title: evt.title,
            start: evt.date,
            color: evt.color,
            extendedProps: {
              notes: evt.notes,
              createdBy: evt.createdBy,
            },
          }))}
          eventDidMount={(info) => {
            const { notes, createdBy } = info.event.extendedProps;
            const title = info.event.title;

            const tooltip = document.createElement("div");
            tooltip.innerHTML = `
              <div style='background:#333;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;white-space:pre-line;'>
                📝 <strong>${title}</strong><br/>
                💬 ${notes || "No notes"}<br/>
                👤 ${createdBy || "Unknown"}
              </div>
            `;
            tooltip.style.position = "absolute";
            tooltip.style.display = "none";
            tooltip.style.zIndex = 1000;
            document.body.appendChild(tooltip);

            info.el.addEventListener("mouseenter", (e) => {
              tooltip.style.display = "block";
              tooltip.style.left = e.pageX + 10 + "px";
              tooltip.style.top = e.pageY + 10 + "px";
            });

            info.el.addEventListener("mousemove", (e) => {
              tooltip.style.left = e.pageX + 10 + "px";
              tooltip.style.top = e.pageY + 10 + "px";
            });

            info.el.addEventListener("mouseleave", () => {
              tooltip.style.display = "none";
            });

            // Optional: Hide tooltip on click just to be safe
            info.el.addEventListener("click", () => {
              tooltip.style.display = "none";
            });
          }}
        />
      </div>
    </div>
  );
};

export default App;
