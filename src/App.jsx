import React, { useEffect, useState } from "react"; import { app, authentication } from "@microsoft/teams-js"; import FullCalendar from "@fullcalendar/react"; import dayGridPlugin from "@fullcalendar/daygrid"; import timeGridPlugin from "@fullcalendar/timegrid"; import interactionPlugin from "@fullcalendar/interaction"; import "./index.css"; import "./App.css";

const App = () => { const [user, setUser] = useState(null); const [events, setEvents] = useState([]); const [showModal, setShowModal] = useState(false); const [selectedEventIndex, setSelectedEventIndex] = useState(null); const [editSeries, setEditSeries] = useState(false); const [newEvent, setNewEvent] = useState({ title: "", notes: "", date: "", isRecurring: false, interval: 7, endDate: "", color: "#f97316" });

useEffect(() => { app.initialize().then(() => { app.getContext().then(() => { authentication.getAuthToken().then(() => { authentication.getUser().then((u) => setUser(u)); }); }); }); }, []);

const handleDateClick = (info) => { setNewEvent({ ...newEvent, date: info.dateStr }); setSelectedEventIndex(null); setEditSeries(false); setShowModal(true); };

const handleEventClick = (clickInfo) => { const index = events.findIndex( e => e.title === clickInfo.event.title && e.date === clickInfo.event.startStr ); if (index !== -1) { setNewEvent(events[index]); setSelectedEventIndex(index); setEditSeries(events[index].isRecurring); // default to editing the series setShowModal(true); } };

const handleDeleteEvent = (deleteSeries) => { if (selectedEventIndex === null) return; const eventToDelete = events[selectedEventIndex]; const updatedEvents = events.filter(e => { if (deleteSeries && e.originDate === eventToDelete.originDate) { return false; } else if (!deleteSeries && e !== eventToDelete) { return true; } else if (!deleteSeries && e === eventToDelete) { return false; } return true; }); setEvents(updatedEvents); resetForm(); };

const handleSaveEvent = () => { const { title, notes, date, isRecurring, interval, endDate, color } = newEvent; if (!title || !date) return;

let updatedEvents = [...events];

if (selectedEventIndex !== null) {
  const editedEvent = events[selectedEventIndex];

  if (editSeries && editedEvent.isRecurring && editedEvent.originDate) {
    updatedEvents = updatedEvents.filter((e) => {
      if (e.originDate !== editedEvent.originDate) return true;
      return new Date(e.date) < new Date(editedEvent.date);
    });
  } else {
    updatedEvents[selectedEventIndex] = {
      title, notes, date, color,
      ...(editedEvent.isRecurring && editedEvent.originDate && { isRecurring: false })
    };
    setEvents(updatedEvents);
    resetForm();
    return;
  }
}

if (isRecurring && endDate) {
  const recurrenceStart = new Date(date);
  const recurrenceEnd = new Date(endDate);
  let current = new Date(recurrenceStart);

  while (current <= recurrenceEnd) {
    updatedEvents.push({
      title,
      notes,
      date: current.toISOString().split("T")[0],
      color,
      isRecurring,
      interval,
      endDate,
      originDate: date
    });
    current.setDate(current.getDate() + parseInt(interval));
  }
} else {
  updatedEvents.push({ title, notes, date, color });
}

setEvents(updatedEvents);
resetForm();

};

const resetForm = () => { setShowModal(false); setNewEvent({ title: "", notes: "", date: "", isRecurring: false, interval: 7, endDate: "", color: "#f97316" }); setSelectedEventIndex(null); setEditSeries(false); };

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
        {selectedEventIndex !== null && events[selectedEventIndex].isRecurring && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, marginRight: 8 }}>Edit entire series?</label>
            <input
              type="checkbox"
              checked={editSeries}
              onChange={(e) => setEditSeries(e.target.checked)}
            />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button style={{ padding: '8px 16px', borderRadius: 4, background: '#555', color: '#fff', border: 'none' }} onClick={() => setShowModal(false)}>Cancel</button>
          {selectedEventIndex !== null && (
            <>
              <button style={{ padding: '8px 16px', borderRadius: 4, background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => handleDeleteEvent(false)}>Delete Event</button>
              {events[selectedEventIndex].isRecurring && (
                <button style={{ padding: '8px 16px', borderRadius: 4, background: '#b91c1c', color: '#fff', border: 'none' }} onClick={() => handleDeleteEvent(true)}>Delete Series</button>
              )}
            </>
          )}
          <button style={{ padding: '8px 16px', borderRadius: 4, background: '#f97316', color: '#fff', border: 'none' }} onClick={handleSaveEvent}>Save</button>
        </div>
      </div>
    </div>
  )}
</div>

); };

export default App;

