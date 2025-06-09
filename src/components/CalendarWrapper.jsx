import React, { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import RenderEventContent from "./RenderEventContent";

// Utility: Helper to format the event as needed for FullCalendar
const mapEventsToFullCalendar = (events, tags) => {
  return events.map(evt => {
    // Try to find tag for this event to get the color
    const tagObj = tags.find(t => t.name === evt.tagName);
    const tagColor = tagObj?.color || evt.color || "#3b82f6";
    return {
      id: evt.id,
      title: evt.title,
      start: evt.date,
      color: tagColor,
      extendedProps: {
        notes: evt.notes,
        createdBy: evt.createdBy,
        createdByUser: evt.createdByUser, // <--- add this!
        tagName: evt.tagName,
        tagColor: tagColor,
        completed: evt.completed, // <-- Make sure this line is present!
      },
    };
  });
};

const CalendarWrapper = ({
  events = [],
  tags = [],
  handleDateClick,
  handleEventClick,
  eventsKey,
  debug,
  eventDidMount, // <-- NEW!
}) => {
  // Only recalculate when the list of events actually changes
  const fullCalendarEvents = useMemo(() => {
    const mapped = mapEventsToFullCalendar(events, tags);
    return mapped;
    // eslint-disable-next-line
  }, [eventsKey, tags]);

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
        eventContent={RenderEventContent}
        eventDidMount={eventDidMount}   // <-- ADD THIS!
      />
    </div>
  );
};

export default CalendarWrapper;
