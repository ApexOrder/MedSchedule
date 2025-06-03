import React, { useEffect, useState, useMemo } from "react";
import { app, authentication } from "@microsoft/teams-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { v4 as uuidv4 } from "uuid";
import "./App.css";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

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

// TagManager is now channel-aware
const TagManager = ({ tags, setTags, channelId }) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const addTagToFirestore = async (tag) => {
    const docRef = await addDoc(collection(db, "tags"), tag);
    return docRef.id;
  };

  const addTag = async () => {
    if (!newName.trim() || !channelId) return;
    const newTag = { id: null, name: newName.trim(), color: newColor, channelId };
    const id = await addTagToFirestore(newTag);
    newTag.id = id;
    setTags([...tags, newTag]);
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
  const [editMode, setEditMode] = useState("single"); // "single" or "future"
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isPastEvent, setIsPastEvent] = useState(false);
  const [channelId, setChannelId] = useState(null);

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
    tagName: null,
    channelId: null,
  });

  const debug = (msg) => setAuthDebug((prev) => [...prev, typeof msg === "string" ? msg : JSON.stringify(msg, null, 2)]);

  // Utility to check past date
  const isPastDate = (dateStr) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // Microsoft Teams SDK + channel context detection
  useEffect(() => {
    debug("🌐 iframe origin: " + window.location.origin);
    debug("🔰 Initializing Microsoft Teams SDK...");
    app
      .initialize()
      .then(() => {
        debug("🟢 Teams SDK initialized.");
        return app.getContext();
      })
      .then((context) => {
        debug("🟢 Got Teams context:");
        debug(JSON.stringify(context, null, 2));
        const chId = context.channelId || (context.channel && context.channel.id) || null;
        debug("ChannelId detected: " + chId);
        setChannelId(chId);
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

  // Firestore events/tags subscriptions filtered by channelId
  useEffect(() => {
    debug("FIRESTORE EFFECT - channelId: " + channelId);
    if (!channelId) {
      debug("Waiting for channelId before setting up Firestore subscription.");
      setEvents([]);
      setTags([]);
      return;
    }
    let eventsQuery = query(
      collection(db, "events"),
      where("channelId", "==", channelId),
      orderBy("date", "asc")
    );
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsData);
      debug("📦 Firestore events snapshot: ");
      debug(eventsData);
    });
    let tagsQuery = query(collection(db, "tags"), where("channelId", "==", channelId));
    const unsubscribeTags = onSnapshot(tagsQuery, (snapshot) => {
      const tagsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTags(tagsData);
    });
    return () => {
      unsubscribeEvents();
      unsubscribeTags();
    };
    // eslint-disable-next-line
  }, [channelId]);

  // Memoized calendarEvents
  const calendarEvents = useMemo(() => {
    const mapped = events
      .filter((evt) => !!evt.date && !!evt.title)
      .map((evt) => {
        const tag = tags.find((t) => t.name === evt.tagName);
        return {
          id: evt.id,
          title: evt.title,
          start: evt.date,
          color: tag ? tag.color : evt.color || "#f97316",
          extendedProps: {
            notes: evt.notes,
            createdBy: evt.createdBy,
            tagName: tag ? tag.name : null,
            tagColor: tag ? tag.color : null,
          },
        };
      });
    debug("🗓️ calendarEvents mapped for FullCalendar:");
    debug(mapped);
    return mapped;
    // eslint-disable-next-line
  }, [events, tags]);

  // --- Calendar handlers ---
  const handleDateClick = (info) => {
    if (isPastDate(info.dateStr)) {
      alert("⚠️ Cannot create events on past dates.");
      debug(`Blocked create on past date ${info.dateStr}`);
      return;
    }
    if (!channelId) {
      debug("❌ Cannot create event: channelId not set!");
      alert("Waiting for Teams channel. Please try again in a moment.");
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
      tagName: null,
      channelId,
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

  // Firestore update/add helpers
  const saveEventToFirestore = async (event) => {
    if (!event.channelId) {
      debug("❌ Refusing to save: missing channelId");
      return;
    }
    if (event.id) {
      const eventRef = doc(db, "events", event.id);
      await setDoc(eventRef, event, { merge: true });
    } else {
      const docRef = await addDoc(collection(db, "events"), event);
      event.id = docRef.id;
    }
  };

  const handleSaveEvent = async () => {
    if (!channelId) {
      debug("❌ Cannot save: channelId is not set!");
      alert("Teams channel not ready yet. Please wait a moment and try again.");
      return;
    }
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
      tagName,
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

    let newEvents = [];

    if (selectedEventId !== null) {
      if (editMode === "future" && originDate) {
        const updateTargets = events.filter(
          (e) => e.originDate === originDate && new Date(e.date) >= new Date(newEvent.date)
        );
        newEvents = updateTargets.map((e) => ({
          ...newEvent,
          id: e.id,
          date: e.date,
          createdBy: e.createdBy,
          createdAt: e.createdAt,
          channelId: channelId,
        }));
      } else {
        newEvents = [
          {
            ...newEvent,
            originDate: isRecurring ? newEvent.originDate || date : "",
            isRecurring,
            interval: isRecurring ? interval : 0,
            endDate: isRecurring ? endDate : "",
            channelId: channelId,
          },
        ];
      }
    } else {
      if (isRecurring && endDate) {
        let start = new Date(date);
        const end = new Date(endDate);
        const createdAt = new Date().toISOString();

        while (start <= end) {
          newEvents.push({
            ...newEvent,
            id: uuidv4(),
            date: start.toISOString().split("T")[0],
            originDate: date,
            isRecurring: true,
            interval: parseInt(interval),
            endDate,
            createdBy: user?.displayName || "Unknown",
            createdAt,
            tagName,
            channelId: channelId,
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        newEvents = [
          {
            ...newEvent,
            id: uuidv4(),
            createdBy: user?.displayName || "Unknown",
            createdAt: new Date().toISOString(),
            originDate: "",
            channelId: channelId,
          },
        ];
      }
    }

    try {
      await Promise.all(newEvents.map((evt) => saveEventToFirestore(evt)));
      debug("✅ Events saved to Firestore");
    } catch (err) {
      debug("❌ Firestore save error: " + err.message);
    }

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
      tagName: null,
      channelId: channelId,
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

  const handleDeleteEvent = async () => {
    debug(`🗑️ Deleting event with id ${selectedEventId}`);
    try {
      await deleteDoc(doc(db, "events", selectedEventId));
      debug("Event deleted from Firestore");
      setSelectedEventId(null);
      setShowModal(false);
      setIsPastEvent(false);
    } catch (err) {
      debug("❌ Firestore delete error: " + err.message);
    }
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

  const handleDeleteSeries = async () => {
    const eventToDelete = events.find((e) => e.id === selectedEventId);
    if (!eventToDelete) {
      debug("❌ Event to delete series not found.");
      return;
    }
    debug(`🗑️ Deleting series with originDate: ${eventToDelete.originDate}`);
    const batchDeletes = events
      .filter((e) => e.originDate === eventToDelete.originDate)
      .map((e) => deleteDoc(doc(db, "events", e.id)));

    try {
      await Promise.all(batchDeletes);
      debug("Series deleted from Firestore");
      setSelectedEventId(null);
      setShowModal(false);
      setIsPastEvent(false);
    } catch (err) {
      debug("❌ Firestore series delete error: " + err.message);
    }
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

      <div style={{ marginBottom: 20, padding: 12, background: "#2d2d2d", borderRadius: 6 }}>
        <h3 style={{ color: "#f97316", marginBottom: 8 }}>Manage Tags</h3>
        <TagManager tags={tags} setTags={setTags} channelId={channelId} />
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
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
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
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              No
            </button>
          </div>
        </div>
      )}

      <div style={{ margin: "0 auto", maxWidth: 1200 }}>
        {channelId ? (
          showModal && (
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

              {selectedEventId !== null && newEvent.isRecurring && (
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
                      value="future"
                      checked={editMode === "future"}
                      onChange={() => setEditMode("future")}
                    />{" "}
                    Edit this and future events
                  </label>
                </div>
              )}

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
                value={newEvent.tagName || ""}
                onChange={(e) => setNewEvent({ ...newEvent, tagName: e.target.value || null })}
                style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 4, border: "1px solid #555" }}
              >
                <option value="">-- None --</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleSaveEvent}
                  style={{
                    background: "#10b981",
                    padding: 10,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    flex: "1 1 45%",
                    transition: "filter 0.3s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
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
                    flex: "1 1 45%",
                    transition: "filter 0.3s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
                >
                  Cancel
                </button>
              </div>

              {selectedEventId !== null && (
                <>
                  <button
                    className="delete-event"
                    onClick={requestDeleteEvent}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      backgroundColor: "#b91c1c",
                      color: "#fff",
                      border: "none",
                      padding: 10,
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "filter 0.3s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
                  >
                    Delete Event
                  </button>

                  {newEvent.isRecurring && (
                    <button
                      className="delete-event"
                      onClick={requestDeleteSeries}
                      style={{
                        marginTop: 8,
                        width: "100%",
                        backgroundColor: "#7f1d1d",
                        color: "#fff",
                        border: "none",
                        padding: 10,
                        borderRadius: 4,
                        cursor: "pointer",
                        transition: "filter 0.3s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
                    >
                      Delete Series
                    </button>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          <div style={{ color: "#f97316", textAlign: "center", marginTop: 80, fontSize: 22 }}>
            <span>Waiting for Teams channel info…</span>
          </div>
        )}
        {channelId && (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            headerToolbar={{
              start: "dayGridMonth,timeGridWeek,timeGridDay",
              center: "title",
              end: "prev,next today",
            }}
            initialView="dayGridMonth"
            initialDate={new Date().toISOString().split("T")[0]}
            events={calendarEvents}
          />
        )}
      </div>
    </div>
  );
};

export default App;
