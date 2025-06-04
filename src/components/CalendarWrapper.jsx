import React, { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// Utility: Helper to format the event as needed for FullCalendar
const mapEventsToFullCalendar = (events) => {
  return events.map(evt => ({
    id: evt.id,
    title: evt.title,
    start: evt.date,
    color: evt.color || "#f97316",
    extendedProps: {
      notes: evt.notes,
      createdBy: evt.createdBy,
      tagName: evt.tagName,
      tagColor: evt.tagColor,
    },
  }));
};

const CalendarWrapper = ({
  events = [],
  tags = [],
  handleDateClick,
  handleEventClick,
  eventsKey, // useMemo in parent
  debug,
}) => {
  // Only recalculate when the list of events actually changes
  const fullCalendarEvents = useMemo(() => {
    debug("🟦 [CalendarWrapper] Raw events prop:");
    debug(JSON.stringify(events, null, 2));
    const mapped = mapEventsToFullCalendar(events);
    debug("🟩 [CalendarWrapper] Final mapped events to FullCalendar:");
    debug(JSON.stringify(mapped, null, 2));
    return mapped;
    // eslint-disable-next-line
  }, [eventsKey]); // Use the memoized key for stability

  return (
    <div style={{ background: "#181818", padding: 10, borderRadius: 10 }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        events={fullCalendarEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        nowIndicator
        dayMaxEvents={2}
        eventDisplay="block"
        fixedWeekCount={false}
      />
    </div>
  );
};

export default CalendarWrapper;
