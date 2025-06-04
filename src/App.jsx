import React, { useEffect, useState, useMemo } from "react";
import { app, authentication } from "@microsoft/teams-js";
import {
  collection, query, orderBy, onSnapshot, setDoc, addDoc, deleteDoc, doc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import TagManager from "./components/TagManager";
import EventModal from "./components/EventModal";
import ConfirmDialog from "./components/ConfirmDialog";
import CalendarWrapper from "./components/CalendarWrapper";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(null);
  const [authDebug, setAuthDebug] = useState([]);
  const [showDebug, setShowDebug] = useState(true);
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editMode, setEditMode] = useState("single");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isPastEvent, setIsPastEvent] = useState(false);
  const [channelId, setChannelId] = useState(null);

  // Debug bubble drag state
  const [debugPosition, setDebugPosition] = useState({ top: 80, right: 25 });
  const [drag, setDrag] = useState({ dragging: false, offsetX: 0, offsetY: 0 });

  const startDrag = (e) => {
    setDrag({
      dragging: true,
      offsetX: e.clientX - debugPosition.right,
      offsetY: e.clientY - debugPosition.top,
    });
  };
  const stopDrag = () => setDrag((d) => ({ ...d, dragging: false }));
  useEffect(() => {
    if (!drag.dragging) return;
    const move = (e) => {
      setDebugPosition({
        top: e.clientY - drag.offsetY,
        right: window.innerWidth - e.clientX - 10,
      });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [drag.dragging, drag.offsetX, drag.offsetY]);

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

  const eventsKey = useMemo(() => JSON.stringify(events), [events]);
  const debug = (msg) =>
    setAuthDebug((prev) => [
      ...prev,
      typeof msg === "string" ? msg : JSON.stringify(msg, null, 2),
    ]);

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
        const chId =
          context.channelId || (context.channel && context.channel.id) || null;
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

  useEffect(() => {
    debug("⏳ Firestore effect running. channelId: " + channelId);

    if (!channelId) {
      debug("❌ No channelId yet, skipping Firestore subscription.");
      setEvents([]);
      setTags([]);
      return;
    }

    // Diagnostic: Log *every* event in the database regardless of channel
    const allEventsQuery = query(
      collection(db, "events"),
      orderBy("date", "asc")
    );
    const unsubscribeAllEvents = onSnapshot(allEventsQuery, (snapshot) => {
      const allEventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      debug("🟡 ALL EVENTS in Firestore:");
      allEventsData.forEach((evt, i) => {
        debug(
          `[${i}] title: ${evt.title} | channelId: [${evt.channelId}] (len: ${
            evt.channelId?.length
          })`
        );
      });
    });

    // The actual filtered query
    let eventsQuery = query(
      collection(db, "events"),
      where("channelId", "==", channelId),
      orderBy("date", "asc")
    );
    debug(
      "🔍 Firestore events query created with channelId: [" +
        channelId +
        "] (len: " +
        channelId.length +
        ")"
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      debug("📦 Firestore events snapshot:", eventsData);

      if (eventsData.length > 0) {
        debug(
          `🟢 First matched event channelId: [${eventsData[0]?.channelId}] (len: ${
            eventsData[0]?.channelId?.length
          })`
        );
        debug(
          `🟢 String equality: ${
            channelId === eventsData[0]?.channelId ? "TRUE" : "FALSE"
          }`
        );
      } else {
        debug(
          "🔴 No events matched for this channelId. Double-check for invisible whitespace, typo, or inconsistent channelId usage."
        );
      }

      setEvents(eventsData);
      debug("🚦 setEvents will update with: ", eventsData);
    });

    let tagsQuery = query(
      collection(db, "tags"),
      where("channelId", "==", channelId)
    );
    debug("🔍 Firestore tags query created with channelId: " + channelId);

    const unsubscribeTags = onSnapshot(tagsQuery, (snapshot) => {
      const tagsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      debug(
        `🏷️ [${tagsData.length}] tags for channelId: ${channelId}`
      );
      setTags(tagsData);
    });

    return () => {
      debug("🧹 Firestore unsubscribe called for channelId: " + channelId);
      unsubscribeEvents();
      unsubscribeTags();
      unsubscribeAllEvents();
    };
  }, [channelId]);

  const isPastDate = (dateStr) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // --------- Calendar Handlers ---------
  const handleDateClick = (info) => {
    if (!channelId) {
      debug("❌ Cannot create event: channelId not loaded yet!");
      alert("Teams channel not ready yet. Please wait a moment and try again.");
      return;
    }
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

  const saveEventToFirestore = async (event) => {
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
          (e) =>
            e.originDate === originDate &&
            new Date(e.date) >= new Date(newEvent.date)
        );
        newEvents = updateTargets.map((e) => ({
          ...newEvent,
          id: e.id,
          date: e.date,
          createdBy: e.createdBy,
          createdAt: e.createdAt,
          channelId,
        }));
      } else {
        newEvents = [
          {
            ...newEvent,
            originDate: isRecurring ? newEvent.originDate || date : "",
            isRecurring,
            interval: isRecurring ? interval : 0,
            endDate: isRecurring ? endDate : "",
            channelId,
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
            id: Math.random().toString(36).substr(2, 9),
            date: start.toISOString().split("T")[0],
            originDate: date,
            isRecurring: true,
            interval: parseInt(interval),
            endDate,
            createdBy: user?.displayName || "Unknown",
            createdAt,
            tagName,
            channelId,
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        newEvents = [
          {
            ...newEvent,
            id: Math.random().toString(36).substr(2, 9),
            createdBy: user?.displayName || "Unknown",
            createdAt: new Date().toISOString(),
            originDate: "",
            channelId,
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
      channelId: null,
    });
    setSelectedEventId(null);
    setEditMode("single");
    setIsPastEvent(false);
  };

  // ------- Delete/Confirm Logic --------
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

  // ------- RENDER -------
  return (
    <div style={{ padding: 20, background: "#1e1e1e", color: "#fff", minHeight: "100vh" }}>
      {/* DEBUG TOGGLE & BUBBLE */}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 24,
          zIndex: 1001,
          userSelect: "none",
        }}
      >
        <button
          onClick={() => setShowDebug((prev) => !prev)}
          style={{
            background: showDebug
              ? "linear-gradient(135deg, #f97316 60%, #ea4c89 100%)"
              : "rgba(35,35,40,0.85)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 46,
            height: 46,
            fontWeight: "bold",
            fontSize: 24,
            cursor: "pointer",
            boxShadow: showDebug
              ? "0 0 24px #f9731666, 0 4px 16px #0008"
              : "0 2px 8px #0009",
            transition: "all 0.2s cubic-bezier(.44,2,.31,.98)",
            outline: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: showDebug ? "brightness(1.1)" : "none",
          }}
          title={showDebug ? "Hide Debug Log" : "Show Debug Log"}
        >
          {showDebug ? "✕" : "🐞"}
        </button>
      </div>
      {showDebug && (
        <div
          style={{
            position: "fixed",
            top: debugPosition.top,
            right: debugPosition.right,
            zIndex: 1000,
            background: "rgba(36,38,50, 0.82)",
            boxShadow: "0 8px 36px 0 #0007, 0 1.5px 6px #f9731620",
            borderRadius: 18,
            padding: 18,
            minWidth: 350,
            maxWidth: 430,
            maxHeight: 420,
            overflowY: "auto",
            color: "#fff",
            fontFamily: "JetBrains Mono, Fira Mono, monospace",
            fontSize: 13,
            backdropFilter: "blur(12px) saturate(1.2)",
            border: "1.5px solid #f9731633",
            transition: "opacity .15s cubic-bezier(.68,-0.6,.32,1.6)",
            opacity: showDebug ? 1 : 0,
            userSelect: "text",
            cursor: drag.dragging ? "grabbing" : "grab",
          }}
          onMouseDown={startDrag}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
            <span
              style={{
                color: "#f97316",
                fontWeight: "bold",
                fontSize: 18,
                marginRight: 10,
                letterSpacing: "1.5px",
              }}
            >
              🐞 Debug Log
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDebug(false);
              }}
              style={{
                marginLeft: "auto",
                background: "none",
                color: "#fff",
                border: "none",
                fontWeight: "bold",
                fontSize: 18,
                cursor: "pointer",
                opacity: 0.66,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.66")}
              title="Close Debug"
            >
              ✕
            </button>
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              marginTop: 0,
              marginBottom: 0,
              color: "#fff",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {authDebug.join("\n")}
          </pre>
        </div>
      )}

      {/* MAIN APP */}
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
      <div
        style={{
          marginBottom: 20,
          padding: 12,
          background: "#2d2d2d",
          borderRadius: 6,
        }}
      >
        <h3 style={{ color: "#f97316", marginBottom: 8 }}>Manage Tags</h3>
        <TagManager tags={tags} setTags={setTags} channelId={channelId} />
      </div>
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      <EventModal
        show={showModal}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        tags={tags}
        selectedEventId={selectedEventId}
        editMode={editMode}
        setEditMode={setEditMode}
        handleSaveEvent={handleSaveEvent}
        handleCancel={() => setShowModal(false)}
        handleDeleteEvent={requestDeleteEvent}
        handleDeleteSeries={requestDeleteSeries}
      />
      <div style={{ margin: "0 auto", maxWidth: 1200 }}>
        <CalendarWrapper
          events={events}
          tags={tags}
          handleDateClick={handleDateClick}
          handleEventClick={handleEventClick}
          eventsKey={eventsKey}
          debug={debug}
        />
      </div>
    </div>
  );
};

export default App;
