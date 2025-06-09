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
import hexToRgb from "./utils/hexToRgb";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(null);
  const [authDebug, setAuthDebug] = useState([]);
  const [showDebug, setShowDebug] = useState(false);

  const [notificationDebug, setNotificationDebug] = useState([]);
  const [fetchingNotifDebug, setFetchingNotifDebug] = useState(false);

  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editMode, setEditMode] = useState("single");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isPastEvent, setIsPastEvent] = useState(false);
  const [channelId, setChannelId] = useState(null);
  const [showTagManager, setShowTagManager] = useState(false);

  // Add lastEditedBy everywhere newEvent exists
  const [newEvent, setNewEvent] = useState({
    id: null,
    title: "",
    notes: "",
    date: "",
    isRecurring: false,
    interval: 7,
    endDate: "",
    color: "#ffffff",
    createdBy: "",
    createdByUser: "",
    createdAt: "",
    lastEdited: new Date().toISOString(),
    lastEditedBy: "",
    originDate: "",
    tagName: null,
    channelId: null,
    completed: false,
  });

  const fetchAccessToken = async () => {
    const res = await fetch('/api/debugToken');
    const data = await res.json();
    if (data.access_token) {
      debug("🔓 Current Graph access token:\n" + data.access_token);
    } else {
      debug("❌ Failed to get token: " + (data.error || "Unknown error"));
    }
  };

  const eventsKey = useMemo(() => JSON.stringify(events), [events]);
  const debug = (msg) =>
    setAuthDebug((prev) => [...prev, typeof msg === "string" ? msg : JSON.stringify(msg, null, 2)]);

  // Function to fetch notification cron debug log
  const fetchNotificationDebug = async () => {
    setFetchingNotifDebug(true);
    setNotificationDebug(["Fetching..."]);
    try {
      const res = await fetch("/api/sendNotifications");
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
        setNotificationDebug(data.debug || ["No debug info returned."]);
      } catch (e) {
        setNotificationDebug([
          `Fetch error: ${e.message}`,
          "Raw response:",
          text.slice(0, 1000)
        ]);
      }
    } catch (err) {
      setNotificationDebug([`Fetch error: ${err.message}`]);
    }
    setFetchingNotifDebug(false);
  };

  // MS Teams Context/Auth
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

  // Events and tags (per channel)
  useEffect(() => {
    debug("⏳ Firestore effect running. channelId: " + channelId);

    if (!channelId) {
      debug("❌ No channelId yet, skipping Firestore subscription.");
      setEvents([]);
      setTags([]);
      return;
    }

    // Events Query
    let eventsQuery = query(
      collection(db, "events"),
      where("channelId", "==", channelId),
      orderBy("date", "asc")
    );
    debug("🔍 Firestore events query created with channelId: " + channelId);

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      debug("📦 Firestore events snapshot:", eventsData);
      setEvents(eventsData);
    });

    // Tags Query
    let tagsQuery = query(
      collection(db, "tags"),
      where("channelId", "==", channelId)
    );
    debug("🔍 Firestore tags query created with channelId: " + channelId);

    const unsubscribeTags = onSnapshot(tagsQuery, (snapshot) => {
      const tagsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      debug(`🏷️ [${tagsData.length}] tags for channelId: ${channelId}`);
      setTags(tagsData);
    });

    return () => {
      debug("🧹 Firestore unsubscribe called for channelId: " + channelId);
      unsubscribeEvents();
      unsubscribeTags();
    };
  }, [channelId]);

  // Helper to check if a date is in the past
  const isPastDate = (dateStr) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // Calendar Handlers
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
    const editor = user?.displayName || user?.username || "Unknown";
    setNewEvent({
      id: null,
      title: "",
      notes: "",
      date: info.dateStr,
      isRecurring: false,
      interval: 7,
      endDate: "",
      color: "#ffffff",
      createdBy: user?.email || "unknown@example.com",
      createdByUser: editor,
      createdAt,
      lastEdited: new Date().toISOString(),
      lastEditedBy: editor,
      originDate: info.dateStr,
      tagName: null,
      channelId,
      completed: false,
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
    const now = new Date().toISOString();
    const editor = user?.displayName || user?.username || "Unknown";
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
          channelId,
          lastEdited: now,
          lastEditedBy: editor,
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
            lastEdited: now,
            lastEditedBy: editor,
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
            createdBy: user?.email || "unknown@example.com",
            createdAt,
            lastEdited: now,
            lastEditedBy: editor,
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
            createdBy: user?.email || "unknown@example.com",
            createdAt: now,
            lastEdited: now,
            lastEditedBy: editor,
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
      color: "#ffffff",
      createdBy: "",
      createdByUser: "",
      createdAt: "",
      lastEdited: new Date().toISOString(),
      lastEditedBy: "",
      originDate: "",
      tagName: null,
      channelId: null,
      completed: false,
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

  // --------- RENDER ---------
  return (
    <div style={{
      padding: 20,
      background: "#1e1e1e",
      color: "#fff",
      minHeight: "100vh",
      fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
      position: "relative"
    }}>
      {/* Debug Toggle */}
      <button
        onClick={() => setShowDebug(d => !d)}
        style={{
          position: "fixed",
          top: 22,
          right: 28,
          zIndex: 3333,
          background: showDebug ? "#f97316" : "#444",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "6px 18px",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: showDebug ? "0 2px 8px #0007" : "",
          transition: "background 0.25s, box-shadow 0.25s",
        }}
        title={showDebug ? "Hide debug window" : "Show debug window"}
      >
        {showDebug ? "Hide Debug" : "Show Debug"}
      </button>
      <button onClick={fetchAccessToken} style={{marginLeft:10}}>Show App Access Token</button>

      <h2 style={{
        color: "#f97316",
        fontSize: 26,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 18,
        letterSpacing: 0.5,
        textShadow: "0 2px 12px #0007"
      }}>
        Care Calendar
      </h2>

      {/* Tags row at top */}
      <div style={{
        background: "#232338",
        borderRadius: 10,
        margin: "0 auto 22px",
        padding: "16px 22px",
        maxWidth: 830,
        minHeight: 52,
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 24px #0001"
      }}>
        <span style={{
          color: "#f97316",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: 0.5,
          marginRight: 9
        }}>Tags</span>
        <div style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          maxWidth: 550,
        }}>
          {tags.length === 0 && <span style={{ opacity: 0.6, fontSize: 13 }}>No tags for this channel yet.</span>}
          {tags.map(tag => (
            <span
              key={tag.id}
              style={{
                background: `linear-gradient(to right, rgba(${hexToRgb(tag.color)},0), ${tag.color} 96%)`,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13.5,
                borderRadius: 18,
                padding: "5px 14px",
                boxShadow: "0 2px 6px #0003",
                letterSpacing: 0.1,
                marginRight: 2,
                userSelect: "none",
                textShadow: "0 1px 2px #0005",
                transition: "box-shadow .22s, transform .22s",
                cursor: "pointer"
              }}
              title={tag.name}
            >{tag.name}</span>
          ))}
        </div>
        <button
          onClick={() => setShowTagManager(true)}
          style={{
            marginLeft: "auto",
            background: "#35386a",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "8px 17px",
            fontWeight: 700,
            fontSize: 14.5,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow: "0 2px 8px #0002",
            transition: "background .22s",
          }}
        >Manage Tags</button>
      </div>

      {/* Tag Manager Modal */}
      {showTagManager && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(25,28,38,0.82)",
            backdropFilter: "blur(2px)",
            zIndex: 2222,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s",
          }}
          onClick={() => setShowTagManager(false)}
        >
          <div
            style={{
              background: "#232338",
              borderRadius: 20,
              minWidth: 340,
              maxWidth: 420,
              width: "94vw",
              boxShadow: "0 12px 32px #0007",
              padding: "30px 32px 24px 32px",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              alignItems: "center"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowTagManager(false)}
              style={{
                position: "absolute",
                top: 15, right: 18,
                background: "none",
                color: "#fff",
                fontSize: 22,
                border: "none",
                cursor: "pointer",
                opacity: 0.65,
                transition: "opacity 0.15s",
              }}
              title="Close"
              onMouseEnter={e => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={e => (e.currentTarget.style.opacity = 0.65)}
            >✕</button>

            <h3 style={{
              color: "#f97316",
              margin: 0,
              textAlign: "center",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}>
              Manage Tags
            </h3>

            <div style={{ width: "100%" }}>
              <TagManager tags={tags} setTags={setTags} channelId={channelId} debug={debug} />
            </div>
          </div>
        </div>
      )}

      {/* User display */}
      <div style={{
        background: "#29293e",
        padding: "9px 18px",
        borderRadius: 9,
        margin: "0 auto 12px",
        maxWidth: 430,
        fontSize: 15,
        letterSpacing: 0.1
      }}>
        {user ? (
          <>👤 <strong>{user.displayName}</strong> ({user.email})</>
        ) : (<>🔄 Authenticating…</>)}
      </div>

      {/* Debug Window */}
      {showDebug && (
        <div
          style={{
            background: "#3a3a3a",
            padding: 15,
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "monospace",
            margin: "20px auto",
            maxWidth: 950,
            minHeight: 80,
            maxHeight: 350,
            overflowY: "auto",
            boxShadow: "0 6px 30px #0003"
          }}
        >
          <strong>🔧 Auth Debug Log:</strong>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 5 }}>{authDebug.join("\n")}</pre>
          <button
            onClick={fetchNotificationDebug}
            disabled={fetchingNotifDebug}
            style={{
              marginTop: 12,
              background: "#35386a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 18px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            {fetchingNotifDebug ? "Fetching..." : "Fetch Notification Debug"}
          </button>
          {notificationDebug.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <strong>🕓 Notification Cron Debug:</strong>
              <pre style={{ whiteSpace: "pre-wrap" }}>{notificationDebug.join("\n")}</pre>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {/* Event Modal */}
      {showModal && (
  <div
    style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(30,32,44,0.77)",
      zIndex: 2000,
      display: "flex",
      alignItems: "flex-start", // top
      justifyContent: "center",
      overflowY: "auto",
    }}
    onClick={() => setShowModal(false)}
  >
    <div
      style={{
        marginTop: 48, // how far down from top
        maxWidth: 420,
        minWidth: 330,
        width: "98vw",
        borderRadius: 18,
        boxShadow: "0 12px 32px #000a",
        background: "#232338",
        position: "relative",
      }}
      onClick={e => e.stopPropagation()}
    >
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
    </div>
  </div>
)}


      {/* Calendar */}
      <div style={{ margin: "0 auto", maxWidth: 1200 }}>
        <CalendarWrapper
          events={events}
          tags={tags}
          handleDateClick={handleDateClick}
          handleEventClick={handleEventClick}
          eventsKey={eventsKey}
          debug={debug}
          eventDidMount={info => {
            const title = info.event.title || "";
            const notes = info.event.extendedProps.notes || "";
            const creator = info.event.extendedProps.createdByUser || "";
            let tooltip = `${title}`;
            if (notes) tooltip += `\nNotes: ${notes}`;
            if (creator) tooltip += `\nCreator: ${creator}`;
            info.el.setAttribute("data-tooltip", tooltip);
            info.el.removeAttribute("title");
          }}
        />
      </div>
    </div>
  );
};

export default App;
