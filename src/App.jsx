import React, { useEffect, useState } from "react"; import { app, authentication } from "@microsoft/teams-js"; import FullCalendar from "@fullcalendar/react"; import dayGridPlugin from "@fullcalendar/daygrid"; import timeGridPlugin from "@fullcalendar/timegrid"; import interactionPlugin from "@fullcalendar/interaction"; import "./index.css"; import "./App.css";

const App = () => { const [user, setUser] = useState(null); const [events, setEvents] = useState([]); const [showModal, setShowModal] = useState(false); const [selectedEventIndex, setSelectedEventIndex] = useState(null); const [editSeries, setEditSeries] = useState(false); const [newEvent, setNewEvent] = useState({ title: "", notes: "", date: "", isRecurring: false, interval: 7, endDate: "", color: "#f97316", originDate: null });

useEffect(() => { app.initialize().then(() => { app.getContext().then(() => { authentication.getAuthToken().then(() => { authentication.getUser().then((u) => setUser(u)); }); }); }); }, []);

const handleDateClick = (info) => { setNewEvent({ title: "", notes: "", date: info.dateStr, isRecurring: false, interval: 7, endDate: "", color: "#f97316", originDate: info.dateStr }); setSelectedEventIndex(null); setEditSeries(false); setShowModal(true); };

const handleEventClick = (clickInfo) => { const event = events.find( (e) => e.title === clickInfo.event.title && e.date === clickInfo.event.startStr ); if (event) { setNewEvent(event); setSelectedEventIndex(events.indexOf(event)); setShowModal(true); } };

const handleSaveEvent = () => { const { title, date, isRecurring, interval, endDate, color, originDate, notes } = newEvent; if (!title || !date) return;

let updatedEvents = [...events];

if (selectedEventIndex !== null) {
  if (editSeries && originDate) {
    updatedEvents = updatedEvents.filter((e) => {
      if (e.originDate !== originDate) return true;
      return new Date(e.date) < new Date(date);
    });

    let start = new Date(date);
    const end = new Date(endDate);
    while (start <= end) {
      updatedEvents.push({ title, notes, date: start.toISOString().split("T")[0], color, originDate });
      start.setDate(start.getDate() + parseInt(interval));
    }
  } else {
    updatedEvents[selectedEventIndex] = { ...newEvent };
  }
} else {
  if (isRecurring && endDate) {
    let start = new Date(date);
    const end = new Date(endDate);
    while (start <= end) {
      updatedEvents.push({ title, notes, date: start.toISOString().split("T")[0], color, originDate: date });
      start.setDate(start.getDate() + parseInt(interval));
    }
  } else {
    updatedEvents.push({ ...newEvent, originDate: date });
  }
}

setEvents(updatedEvents);
setShowModal(false);
setSelectedEventIndex(null);
setEditSeries(false);
setNewEvent({
  title: "",
  notes: "",
  date: "",
  isRecurring: false,
  interval: 7,
  endDate: "",
  color: "#f97316",
  originDate: null
});

};

const deleteEvent = () => { if (selectedEventIndex !== null) { const updated = events.filter((_, idx) => idx !== selectedEventIndex); setEvents(updated); setShowModal(false); } };

const deleteSeries = () => { if (newEvent.originDate) { const updated = events.filter((e) => e.originDate !== newEvent.originDate); setEvents(updated); setShowModal(false); } };

return ( <div style={{ padding: 20, background: '#1e1e1e', color: '#fff', minHeight: '100vh' }}> <h2 style={{ color: '#f97316', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>Care Calendar</h2>

<div style={{ background: '#2d2d2d', padding: 12, borderRadius: 6, marginBottom: 20 }}>
    {user ? (
      <>👤 <strong>{user.displayName}</strong> ({user.email})</>
    ) : (
      <>🔄 Authenticating…</>
    )}
  </div>

  <div style={{ margin: '0 auto', maxWidth: '1200px' }}>
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      headerToolbar={{ start: "dayGridMonth,timeGridWeek,timeGridDay", center: "title", end: "prev,next today" }}
      initialView="dayGridMonth"
      dateClick={handleDateClick}
      eventClick={handleEventClick}
      events={events.map(evt => ({ title: evt.title, start: evt.date, color: evt.color }))}
    />
  </div>

  {showModal && (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#2d2d2d', padding: 24, borderRadius: 8, width: '100%', maxWidth: 400 }}>
        <h3 style={{ fontSize: 18, fontWeight: '600', color: '#f97316', marginBottom: 16 }}>{selectedEventIndex !== null ? 'Edit Event' : 'Add Event'}</h3>
        <input
          type="text"
          placeholder="Event Title"
          style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, background: '#3a3a3a', color: '#fff', border: 'none' }}
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <textarea
          placeholder="Notes (optional)"
          style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, background: '#3a3a3a', color: '#fff', border: 'none' }}
          value={newEvent.notes}
          onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <label style={{ fontSize: 14 }}>Recurring:</label>
          <input
            type="checkbox"
            checked={newEvent.isRecurring}
            onChange={(e) => setNewEvent({ ...newEvent, isRecurring: e.target.checked })}
          />
        </div>
        {newEvent.isRecurring && (
          <>
            <input
              type="number"
              placeholder="Repeat every X days"
              style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, background: '#3a3a3a', color: '#fff', border: 'none' }}
              value={newEvent.interval}
              onChange={(e) => setNewEvent({ ...newEvent, interval: e.target.value })}
            />
            <input
              type="date"
              placeholder="End Date"
              style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, background: '#3a3a3a', color: '#fff', border: 'none' }}
              value={newEvent.endDate}
              onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
            />
          </>
        )}
        {selectedEventIndex !== null && newEvent.originDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <label style={{ fontSize: 14 }}>Edit entire series:</label>
            <input
              type="checkbox"
              checked={editSeries}
              onChange={(e) => setEditSeries(e.target.checked)}
            />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
          {selectedEventIndex !== null && (
            <>
              <button style={{ padding: '8px 12px', borderRadius: 4, background: '#a00', color: '#fff', border: 'none' }} onClick={deleteEvent}>Delete Event</button>
              {newEvent.originDate && (
                <button style={{ padding: '8px 12px', borderRadius: 4, background: '#a00', color: '#fff', border: 'none' }} onClick={deleteSeries}>Delete Series</button>
              )}
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 16px', borderRadius: 4, background: '#555', color: '#fff', border: 'none' }} onClick={() => setShowModal(false)}>Cancel</button>
            <button style={{ padding: '8px 16px', borderRadius: 4, background: '#f97316', color: '#fff', border: 'none' }} onClick={handleSaveEvent}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )}
</div>

); };

export default App;

