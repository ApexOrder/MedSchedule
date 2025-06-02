import React, { useEffect, useState, useMemo } from "react";
import { app, authentication } from "@microsoft/teams-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { v4 as uuidv4 } from "uuid";
import "./index.css";
import "./App.css";

// Helper to convert hex to rgb for gradient alpha
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  let bigint = parseInt(hex, 16);
  let r, g, b;
  if (hex.length === 6) {
    r = (bigint >> 16) & 255;
    g = (bigint >> 8) & 255;
    b = bigint & 255;
  } else if (hex.length === 3) {
    r = (bigint >> 8) & 15;
    g = (bigint >> 4) & 15;
    b = bigint & 15;
    r = (r << 4) | r;
    g = (g << 4) | g;
    b = (b << 4) | b;
  } else {
    return "0,0,0";
  }
  return `${r},${g},${b}`;
}

const TagManager = ({ tags, setTags }) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const addTag = () => {
    if (!newName.trim()) return;
    setTags([...tags, { id: uuidv4(), name: newName.trim(), color: newColor }]);
    setNewName("");
  };

  return (
    <div>
      <input
        placeholder="Tag name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        style={{ padding: 6, marginRight: 8, borderRadius: 4, border: "1px solid #555" }}
      />
      <input
        type="color"
        value={newColor}
        onChange={(e) => setNewColor(e.target.value)}
        style={{ marginRight: 8, width: 40, height: 30, verticalAlign: "middle", borderRadius: 4, border: "1px solid #555" }}
      />
      <button
        onClick={addTag}
        style={{
          padding: "6px 12px",
          borderRadius: 4,
          border: "none",
          backgroundColor: "#f97316",
          color: "#fff",
          cursor: "pointer",
          transition: "filter 0.3s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
      >
        Add Tag
      </button>

      <div style={{ marginTop: 10 }}>
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="tag-pill"
            title={tag.name}
            style={{
              background: `linear-gradient(to right, rgba(${hexToRgb(tag.color)}, 0) 0%, ${tag.color} 100%)`,
              color: "#fff",
              marginRight: 6,
              marginBottom: 6,
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              cursor: "default",
              userSelect: "none",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [authDebug, setAuthDebug] = useState([]);
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editMode, setEditMode] = useState("single");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isPastEvent, setIsPastEvent] = useState(false);

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
    tagId: null,
  });

  const eventsKey = useMemo(() => JSON.stringify(events), [events]);

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

  const isPastDate = (dateStr) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  const handleDateClick = (info) => {
    if (isPastDate(info.dateStr)) {
      alert("⚠️ Cannot create events on past dates.");
      debug(`Blocked create on past date ${info.dateStr}`);
      return;
    }

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
      tagId: null,
    });
    setSelectedEventId(null);
    setShowModal(true);
    setEditMode("single");
    setIsPastEvent(false);
  };

  const handleEventClick = (clickInfo) => {
    const event = events.find((e) => e.id === clickInfo.event.id);
    if (!event) return;

    if (isPastDate(event.date)) {
      alert("⚠️ This event is in the past and cannot be edited.");
      debug(`Blocked edit of past event dated ${event.date}`);
      return;
    }

    setNewEvent(event);
    setSelectedEventId(event.id);
    setShowModal(true);
    setEditMode("single");
    setIsPastEvent(false);
  };

  const handleSaveEvent = () => {
    if (isPastEvent) {
      debug("❌ Cannot save: Event is in the past.");
      return;
    }

    const {
      title,
      date,
      isRecurring,
      interval,
      endDate,
      id,
      originDate,
      tagId,
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
            tagId,
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        if (isRecurring && interval && endDate && new Date(endDate) >= new Date(date)) {
          updatedEvents = updatedEvents.filter(e => e.id !== id);

          let start = new Date(date);
          const end = new Date(endDate);
          const createdAt = new Date().toISOString();
          const seriesOriginDate = date;

          while (start <= end) {
            updatedEvents.push({
              ...newEvent,
              id: uuidv4(),
              date: start.toISOString().split("T")[0],
              originDate: seriesOriginDate,
              isRecurring: true,
              interval: parseInt(interval),
              endDate,
              createdBy: newEvent.createdBy,
              createdAt,
              tagId,
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
            tagId,
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
          tagId,
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
      tagId: null,
    });
    setSelectedEventId(null);
    setEditMode("single");
    setIsPastEvent(false);
  };

  const requestDeleteEvent = () => {
    if (isPastEvent) {
      debug("❌ Cannot delete: Event is in the past.");
      return;
    }
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
    setIsPastEvent(false);
  };

  const requestDeleteSeries = () => {
    if (isPastEvent) {
      debug("❌ Cannot delete series: Event is in the past.");
      return;
    }
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
    setIsPastEvent(false);
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

      <div style={{ marginBottom: 20, padding: 12, background: "#2d2d2d", borderRadius: 6 }}>
        <h3 style={{ color: "#f97316", marginBottom: 8 }}>Manage Tags</h3>
        <TagManager tags={tags} setTags={setTags} />
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
                transition: "filter 0.3s",
                cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
              onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
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
      )}

      <div style={{ margin: "0 auto", maxWidth: 1200 }}>
        {showModal && (
          <div
            className="modal-fade"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              background: "#2d2d2d",
              padding: 20,
              borderRadius: 8,
              zIndex: 9999,
              width: 400,
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              transformOrigin: "center center",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: 4 }}>
              {selectedEventId !== null ? "Edit Event" : "New Event"}
            </h3>

            {selectedEventId !== null && newEvent.createdAt && (
              <div style={{ color: "#aaa", fontSize: 12, marginBottom: 10 }}>
                Created: {new Date(newEvent.createdAt).toLocaleString()} <br />
                Created by: {newEvent.createdBy || "Unknown"}
              </div>
            )}

            <input
              type="text"
              placeholder="Title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #555" }}
            />

            <textarea
              placeholder="Notes"
              value={newEvent.notes}
              onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #555" }}
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
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #555" }}
                />

                <label style={{ color: "#fff", display: "block", marginTop: 10, marginBottom: 4 }}>
                  End date:
                </label>
                <input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #555" }}
                />
              </div>
            )}

            <label style={{ color: "#fff", display: "block", marginBottom: 4 }}>
              Event Tag:
            </label>
            <select
              value={newEvent.tagId || ""}
              onChange={(e) => setNewEvent({ ...newEvent, tagId: e.target.value || null })}
              style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 4, border: "1px solid #555" }}
            >
              <option value="">-- None --</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>

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
                  transition: "filter 0.3s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
                onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
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
                  transition: "filter 0.3s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
                onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
              >
                Cancel
              </button>
            </div>
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
          dayCellClassNames={(arg) => {
            const date = arg.date;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) return ["past-date-cell"];
            return [];
          }}
          events={events.map((evt) => {
            const tag = tags.find((t) => t.id === evt.tagId);
            return {
              id: evt.id,
              title: evt.title,
              start: evt.date,
              color: tag ? tag.color : evt.color,
              extendedProps: {
                notes: evt.notes,
                createdBy: evt.createdBy,
                tagName: tag ? tag.name : null,
                tagColor: tag ? tag.color : null,
              },
            };
          })}
          eventContent={(arg) => {
            const tagName = arg.event.extendedProps.tagName || "Default";
            const tagColor = arg.event.extendedProps.tagColor || "#f97316";

            const rgb = hexToRgb(tagColor);

            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
                title={arg.event.title}
              >
                {/* Show only the event title */}
                <div
                  style={{
                    flexShrink: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: "600",
                    color: "#fff",
                    flexGrow: 1,
                    fontSize: 13,
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  }}
                >
                  {arg.event.title}
                </div>

                {/* Updated pill style */}
                <span
                  style={{
                    display: "inline-block",
                    minWidth: 70,
                    padding: "6px 18px",
                    borderRadius: 30,
                    background: `linear-gradient(135deg, rgba(${rgb}, 0.8), ${tagColor})`,
                    boxShadow: `0 4px 8px rgba(${rgb}, 0.3), inset 0 0 10px rgba(255,255,255,0.25)`,
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    userSelect: "none",
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={tagName}
                >
                  {tagName}
                </span>
              </div>
            );
          }}
          eventDidMount={(info) => {
            if (info.el._tooltip) {
              document.body.removeChild(info.el._tooltip);
              info.el._tooltip = null;
            }

            const { notes, createdBy, tagName, tagColor } = info.event.extendedProps;
            const color = tagColor || "#f97316";
            const title = info.event.title;

            const tooltip = document.createElement("div");
            tooltip.className = "tooltip-custom";
            tooltip.innerHTML = `
              <strong style="color:#f97316; font-weight:700; font-size:16px;">${title}</strong><br/>
              ${
                tagName
                  ? `<span style="
                      display:inline-block;
                      padding:2px 8px;
                      border-radius:12px;
                      background: linear-gradient(to right, rgba(${hexToRgb(color)}, 0) 0%, ${color} 100%);
                      color: #fff;
                      font-weight: 600;
                      font-size: 12px;
                      margin: 4px 0;
                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                      text-shadow: 0 0 2px rgba(0,0,0,0.6);
                    ">🏷️ ${tagName}</span><br/>`
                  : ""
              }
              <div style="margin-top:8px; font-size:14px; font-weight:400; color:#ddd;">📝 ${notes || "No notes"}</div>
              <div style="margin-top:6px; font-size:13px; font-weight:400; color:#bbb;">👤 ${createdBy || "Unknown"}</div>
            `;

            document.body.appendChild(tooltip);
            info.el._tooltip = tooltip;

            info.el.addEventListener("mouseenter", (e) => {
              tooltip.style.opacity = "1";
              tooltip.style.display = "block";
              tooltip.style.left = e.pageX + 12 + "px";
              tooltip.style.top = e.pageY + 12 + "px";
            });

            info.el.addEventListener("mousemove", (e) => {
              tooltip.style.left = e.pageX + 12 + "px";
              tooltip.style.top = e.pageY + 12 + "px";
            });

            info.el.addEventListener("mouseleave", () => {
              tooltip.style.opacity = "0";
              setTimeout(() => {
                tooltip.style.display = "none";
              }, 250);
            });

            info.el.addEventListener("click", () => {
              tooltip.style.opacity = "0";
              setTimeout(() => {
                tooltip.style.display = "none";
              }, 250);
            });

            const eventDate = new Date(info.event.start);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (eventDate < today) {
              info.el.style.opacity = "0.4";
              info.el.style.pointerEvents = "none";
              info.el.style.userSelect = "none";
              info.el.style.cursor = "not-allowed";
            } else {
              info.el.style.opacity = "";
              info.el.style.pointerEvents = "";
              info.el.style.userSelect = "";
              info.el.style.cursor = "";
            }
          }}
        />
      </div>
    </div>
  );
};

export default App;
