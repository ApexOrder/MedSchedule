import React, { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import hexToRgb from "../utils/hexToRgb";


function renderEventContent(arg) {
  const { event } = arg;
  const tagName = event.extendedProps.tagName;
  const tagColor = event.extendedProps.tagColor || "#3b82f6";

  return (
    <div style={{ position: "relative", padding: 4 }}>
      <div style={{ fontWeight: "bold" }}>{event.title}</div>
      {tagName && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            borderRadius: 8,
            padding: "2px 8px",
            marginTop: 2,
            display: "inline-block",
            background: `linear-gradient(90deg, rgba(${hexToRgb(
              tagColor
            )},0.3) 0%, ${tagColor} 100%)`,
          }}
        >
          {tagName}
        </span>
      )}
    </div>
  );
}

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
  eventsKey,
  debug,
}) => {
  const fullCalendarEvents = useMemo(() => {
    debug("🟦 [CalendarWrapper] Raw events prop:");
    debug(JSON.stringify(events, null, 2));
    const mapped = mapEventsToFullCalendar(events);
    debug("🟩 [CalendarWrapper] Final mapped events to FullCalendar:");
    debug(JSON.stringify(mapped, null, 2));
    return mapped;
    // eslint-disable-next-line
  }, [eventsKey]);

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
        eventContent={renderEventContent}
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
