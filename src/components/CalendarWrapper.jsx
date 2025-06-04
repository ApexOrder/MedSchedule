import React, { useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
// ...other imports

const CalendarWrapper = ({ events, tags, handleDateClick, handleEventClick, eventsKey, debug }) => {
  // INFINITE LOOP - BAD:
  // debug("[CalendarWrapper] Raw events prop:", events);

  // CORRECT: useEffect to log only when events change
  useEffect(() => {
    debug("🟦 [CalendarWrapper] Raw events prop:");
    debug(events);
    // if you want, also log the mapped output:
    const mapped = events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.date,
      color: e.color,
      extendedProps: {
        notes: e.notes,
        createdBy: e.createdBy,
        tagName: e.tagName,
        tagColor: tags.find(t => t.name === e.tagName)?.color || null,
      }
    }));
    debug("🟩 [CalendarWrapper] Final mapped events to FullCalendar:");
    debug(mapped);
  }, [events, tags, debug]);

  // ...rest of your CalendarWrapper rendering
  return (
    <FullCalendar
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      events={events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.date,
        color: e.color,
        extendedProps: {
          notes: e.notes,
          createdBy: e.createdBy,
          tagName: e.tagName,
          tagColor: tags.find(t => t.name === e.tagName)?.color || null,
        }
      }))}
      dateClick={handleDateClick}
      eventClick={handleEventClick}
      key={eventsKey}
      // ...other props
    />
  );
};

export default CalendarWrapper;
