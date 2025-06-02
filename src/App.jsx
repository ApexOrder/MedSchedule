import React, { useEffect, useState, useMemo } from "react";
import { app, authentication } from "@microsoft/teams-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { v4 as uuidv4 } from "uuid";
import "./index.css";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(null);
  const [authDebug, setAuthDebug] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editMode, setEditMode] = useState("single"); // "single" or "series"
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [newEvent, setNewEvent] = useState({
    id: null,
    title: "",
    notes: "",
    date: "",
    isRecurring: false,
    interval: 7,
    endDate: "",
    color: "#f97316",
    createdBy: "",
    createdAt: "",
    originDate: "",
  });

  // Memoize events key to force FullCalendar remount and refresh tooltips after edits
  const eventsKey = useMemo(
    () =>
      JSON.stringify(
        events.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          notes: e.notes,
          createdBy: e.createdBy,
        }))
      ),
    [events]
  );

  const debug = (msg) => setAuthDebug((prev) => [...prev, msg]);

  useEffect(() => {
    debug("🌐 iframe origin: " + window.location.origin);
    debug("🔰 Initializing Microsoft Teams SDK...");

    app
      .initialize()
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
              const payload = JSON.parse(atob(token.split(".")[1]));
              debug("🧾 Token audience: " + payload.aud);
            } catch (e) {
              debug("❌ Failed to decode token: " + e.message);
            }

            fetch("/api/getUser", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
              .then((res) => res.json())
              .then((data) => {
                setUser({
                  displayName: data.displayName,
                  email: data.email,
                });
                debug("✅ Custom API user fetched: " + data.displayName);
              })
              .catch((err) => {
                debug("❌ Custom API error: " + JSON.stringify(err));
              });
          },
          failureCallback: (err) => {
            debug("❌ getAuthToken error: " + JSON.stringify(err));
          },
        });
      })
      .catch((err) => debug("❌ Initialization failed: " + JSON.stringify(err)));
  }, []);

  const handleDateClick = (info) => {
    debug("📅 Date clicked: " + info.dateStr);
    const createdAt = new Date().toISOString();
    setNewEvent({
      id: null,
      title: "",
      notes: "",
      date: info.dateStr,
      isRecurring: false,
      interval: 7,
      endDate: "",
      color: "#f97316",
      createdBy: user?.displayName || "Unknown",
      createdAt,
      originDate: info.dateStr,
    });
    setSelectedEventId(null);
    setShowModal(true);
    setEditMode("single");
  };

  const handleEventClick = (clickInfo) => {
    const index = events.findIndex((e) => e.id === clickInfo.event.id);
    debug(`Event clicked with id: ${clickInfo.event.id} found at index: ${index}`);
    if (index !== -1) {
      setNewEvent(events[index]);
      setSelectedEventId(events[index].id);
      setShowModal(true);
      setEditMode("single");
    }
  };

  const handleSaveEvent = () => {
    const {
      title,
      date,
      isRecurring,
      interval,
      endDate,
      id,
      originDate,
    } = newEvent;

    if (!title) {
      debug("❌ Title is required.");
      return;
    }

    if (isRecurring) {
      if (!endDate) {
        debug("❌ End date is required for recurring events.");
        return;
      }
      if (!interval || interval < 1) {
        debug("❌ Interval must be at least 1 day for recurring events.");
        return;
      }
      if (new Date(endDate) < new Date(date)) {
        debug("❌ End date must be on or after start date.");
        return;
      }
    }

    let updatedEvents = [...events];

    if (selectedEventId !== null) {
      if (editMode === "series" && originDate) {
        updatedEvents = updatedEvents.filter((e) => e.originDate !== originDate);

        let start = new Date(originDate);
        const end = new Date(endDate);
        const createdAt = new Date().toISOString();

        while (start <= end) {
          updatedEvents.push({
            ...newEvent,
            id: uuidv4(),
            date: start.toISOString().split("T")[0],
            originDate: originDate,
            isRecurring: true,
            interval: parseInt(interval),
            endDate,
            createdBy: newEvent.createdBy,
            createdAt,
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        updatedEvents = updatedEvents.map((e) =>
          e.id === id
            ? {
                ...newEvent,
                originDate: isRecurring ? newEvent.originDate || date : "",
                isRecurring,
                interval: isRecurring ? interval : 0,
                endDate: isRecurring ? endDate : "",
              }
            : e
        );
      }
    } else {
      if (isRecurring && endDate) {
        let start = new Date(date);
        const end = new Date(endDate);
        const createdAt = new Date().toISOString();

        while (start <= end) {
          updatedEvents.push({
            ...newEvent,
            id: uuidv4(),
            date: start.toISOString().split("T")[0],
            originDate: date,
            isRecurring: true,
            interval: parseInt(interval),
            endDate,
            createdBy: user?.displayName || "Unknown",
            createdAt,
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        updatedEvents.push({
          ...newEvent,
          id: uuidv4(),
          createdBy: user?.displayName || "Unknown",
          createdAt: new Date().toISOString(),
          originDate: "",
        });
      }
    }

    setEvents(updatedEvents);
    debug("✅ Event saved. Total events: " + updatedEvents.length);
    setShowModal(false);
    setNewEvent({
      id: null,
      title: "",
      notes: "",
      date: "",
      isRecurring: false,
      interval: 7,
      endDate: "",
      color: "#f97316",
      createdBy: "",
      createdAt: "",
      originDate: "",
    });
    setSelectedEventId(null);
    setEditMode("single");
  };

  const requestDeleteEvent = () => {
    if (selectedEventId === null) {
      debug("❌ No event selected for deletion.");
      return;
    }
    setConfirmDialog({
      message: "Are you sure you want to delete this event?",
      onConfirm: () => {
        handleDeleteEvent();
        setConfirmDialog(null);
      },
      onCancel: () => {
        debug("❌ Deletion cancelled by user.");
        setConfirmDialog(null);
      },
    });
  };

  const handleDeleteEvent = () => {
    debug(`🗑️ Deleting event with id ${selectedEventId}`);
    const updatedEvents = events.filter((e) => e.id !== selectedEventId);
    debug("Events after deleting event: " + updatedEvents.length);
    setEvents(updatedEvents);
    setShowModal(false);
    setSelectedEventId(null);
  };

  const requestDeleteSeries = () => {
    if (selectedEventId === null) {
      debug("❌ No event selected for series deletion.");
      return;
    }
    setConfirmDialog({
      message: "Are you sure you want to delete the entire series?",
      onConfirm: () => {
        handleDeleteSeries();
        setConfirmDialog(null);
      },
      onCancel: () => {
        debug("❌ Series deletion cancelled by user.");
        setConfirmDialog(null);
      },
    });
  };

  const handleDeleteSeries = () => {
    const eventToDelete = events.find((e) => e.id === selectedEventId);
    if (!eventToDelete) {
      debug("❌ Event to delete series not found.");
      return;
    }
    debug(`🗑️ Deleting series with originDate: ${eventToDelete.originDate}`);
    const updatedEvents = events.filter((e) => e.originDate !== eventToDelete.originDate);
    debug("Events after deleting series: " + updatedEvents.length);
    setEvents(updatedEvents);
    setShowModal(false);
    setSelectedEventId(null);
  };

  useEffect(() => {
    if (selectedEventId !== null) {
      debug(`Selected event ID: ${selectedEventId}`);
      debug(`Current total events: ${events.length}`);
    }
  }, [selectedEventId, events]);

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
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          <strong>🔧 Auth Debug Log:</strong>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 5 }}>{authDebug.join("\n")}</pre>
        </div>
      )}

      {confirmDialog && (
        <div
          style={{
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
          }}
        >
          <p style={{ color: "#fff", marginBottom: 20 }}>{confirmDialog.message}</p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <button
              onClick={confirmDialog.onConfirm}
              style={{
                flex: 1,
                background: "#10b981",
                color: "#fff",
                border: "none",
                padding: 10,
                borderRadius: 4,
              }}
            >
              Yes
            </button>
            <button
              onClick={confirmDialog.onCancel}
              style={{
                flex: 1,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                padding: 10,
                borderRadius: 4,
              }}
            >
              No
            </button>
          </div>
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
              {selectedEventId !== null ? "Edit Event" : "New Event"}
            </h3>

            {/* Show creation info */}
            {selectedEventId !== null && newEvent.createdAt && (
              <div style={{ color: "#aaa", fontSize: 12, marginBottom: 10 }}>
                Created: {new Date(newEvent.createdAt).toLocaleString()} <br />
                Created by: {newEvent.createdBy || "Unknown"}
              </div>
            )}

            {/* Edit mode choice for series */}
            {selectedEventId !== null &&
              newEvent.originDate &&
              events.some((e) => e.originDate === newEvent.originDate && e.id !== newEvent.id) && (
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

            {/* Removed date input */}

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

                <label style={{ color: "#fff", display: "block", marginTop: 10, marginBottom: 4 }}>
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

            {selectedEventId !== null && (
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  onClick={requestDeleteEvent}
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
                  onClick={requestDeleteSeries}
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
          key={eventsKey}
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
            id: evt.id,
            title: evt.title,
            start: evt.date,
            color: evt.color,
            extendedProps: {
              notes: evt.notes,
              createdBy: evt.createdBy,
            },
          }))}
          eventDidMount={(info) => {
            // Clean up any existing tooltip first to avoid duplicates
            if (info.el._tooltip) {
              document.body.removeChild(info.el._tooltip);
              info.el._tooltip = null;
            }

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
            info.el._tooltip = tooltip;

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
