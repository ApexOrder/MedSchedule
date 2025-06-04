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
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editMode, setEditMode] = useState("single");
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

  // Limit the debug log to 200 entries for sanity
  const debug = (msg) =>
    setAuthDebug((prev) => {
      const next = [...prev, typeof msg === "string" ? msg : JSON.stringify(msg, null, 2)];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });

  const eventsKey = useMemo(() => JSON.stringify(events), [events]);

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

  // MAIN Firestore effect
  useEffect(() => {
    debug("⏳ Firestore effect running. channelId: " + channelId);

    if (!channelId) {
      debug("❌ No channelId yet, skipping Firestore subscription.");
      setEvents([]);
      setTags([]);
      return;
    }

    // EVENTS
    let eventsQuery = query(
      collection(db, "events"),
      where("channelId", "==", channelId),
      orderBy("date", "asc")
    );
    debug("🔍 Firestore events query created with channelId: " + channelId);

   const unsubscribeEvents = onSnapshot(
  eventsQuery,
  (snapshot) => {
    debug("📦 Firestore events snapshot FIRED!");
    const eventsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    debug("📦 Firestore events snapshot:", eventsData);
    setEvents(eventsData);
  },
  (error) => {
    debug("❌ Firestore onSnapshot ERROR: " + error.message);
  }
);



    // TAGS
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
          (e) => e.originDate === originDate && new Date(e.date) >= new Date(newEvent.date)
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
            id: Math.random().toString(36).substr(2, 9), // unique enough for temp use
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
      <h2 style={{ color: "#f97316", fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20 }}>
        Care Calendar
      </h2>
      <div style={{ background: "#2d2d2d", padding: 12, borderRadius: 6, marginBottom: 10 }}>
        {user ? (
          <>👤 <strong>{user.displayName}</strong> ({user.email})</>
        ) : (<>🔄 Authenticating…</>)}
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
