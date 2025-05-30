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
  const [editSeries, setEditSeries] = useState(false);

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

  // ✅ Move debug function here
  const debug = (msg) => setAuthDebug((prev) => [...prev, msg]);

  useEffect(() => {
    debug("🌐 iframe origin: " + window.location.origin);
    ...

    debug("\ud83d\udd20 Initializing Microsoft Teams SDK...");

    app.initialize()
      .then(() => {
        debug("\ud83d\udfe2 Teams SDK initialized.");
        return app.getContext();
      })
      .then(() => {
        debug("\ud83d\udfe2 Got Teams context.");
        authentication.getAuthToken({
          successCallback: (token) => {
            debug("\u2705 Auth token acquired.");

            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              debug("\ud83d\udccf Token audience: " + payload.aud);
            } catch (e) {
              debug("\u274c Failed to decode token: " + e.message);
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
      .catch((err) => debug("\u274c Initialization failed: " + JSON.stringify(err)));
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
  setEditSeries(false);
};



  const handleEventClick = (clickInfo) => {
    const index = events.findIndex(
      (e) => e.title === clickInfo.event.title && e.date === clickInfo.event.startStr
    );
    if (index !== -1) {
      setNewEvent(events[index]);
      setSelectedEventIndex(index);
      setShowModal(true);
      setEditSeries(false);
    }
  };

  const handleSaveEvent = () => {
    const { title, date, isRecurring, interval, endDate } = newEvent;
    if (!title || !date) return;

    let updatedEvents = [...events];

    if (selectedEventIndex !== null) {
      const editedEvent = events[selectedEventIndex];

      if (editSeries && editedEvent.originDate) {
        updatedEvents = updatedEvents.filter((e) => {
          if (e.originDate !== editedEvent.originDate) return true;
          return new Date(e.date) < new Date(editedEvent.date);
        });

        let start = new Date(date);
        const end = new Date(endDate);
        while (start <= end) {
          updatedEvents.push({
            ...newEvent,
            date: start.toISOString().split("T")[0],
            originDate: newEvent.originDate || date,
            createdBy: newEvent.createdBy,
            createdAt: newEvent.createdAt
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        updatedEvents[selectedEventIndex] = { ...newEvent };
      }
    } else {
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
            createdAt
          });
          start.setDate(start.getDate() + parseInt(interval));
        }
      } else {
        updatedEvents.push({
          ...newEvent,
          createdBy: user?.displayName || "Unknown",
          createdAt: new Date().toISOString()
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
    <div style={{ padding: 20, background: '#1e1e1e', color: '#fff', minHeight: '100vh' }}>
      <h2 style={{ color: '#f97316', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>Care Calendar</h2>

      <div style={{ background: '#2d2d2d', padding: 12, borderRadius: 6, marginBottom: 10 }}>
        {user ? (
          <>👤 <strong>{user.displayName}</strong> ({user.email})</>
        ) : (
          <>🔄 Authenticating…</>
        )}
      </div>

      {authDebug.length > 0 && (
        <div style={{ background: '#3a3a3a', padding: 10, borderRadius: 6, fontSize: 12, fontFamily: 'monospace', marginBottom: 20 }}>
          <strong>🔧 Auth Debug Log:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 5 }}>{authDebug.join("\n")}</pre>
        </div>
      )}

      <div style={{ margin: '0 auto', maxWidth: '1200px' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{ start: "dayGridMonth,timeGridWeek,timeGridDay", center: "title", end: "prev,next today" }}
          initialView="dayGridMonth"
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={events.map(evt => ({
            title: evt.title,
            start: evt.date,
            color: evt.color,
            extendedProps: {
              notes: evt.notes,
              createdBy: evt.createdBy
            }
          }))}
          eventDidMount={(info) => {
            const { notes, createdBy } = info.event.extendedProps;
            const title = info.event.title;

            const tooltip = document.createElement("div");
            tooltip.innerHTML = `
              <div style='background:#333;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;white-space:pre-line;'>
                \ud83d\udcdd <strong>${title}</strong><br/>
                \ud83d\udcac ${notes || "No notes"}<br/>
                \ud83d\udc64 ${createdBy || "Unknown"}
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
          }}
        />
      </div>
    </div>
  );
};

export default App;

