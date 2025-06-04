import React, { useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import hexToRgb from "../utils/hexToRgb";

const CalendarWrapper = ({
  events = [],
  tags = [],
  handleDateClick,
  handleEventClick,
  eventsKey,
  debug = () => {},
}) => {
  // Memoize mapping so it only recalculates when events or tags change
  const calendarEvents = useMemo(() => {
    return events.map((evt, i) => {
      const tag = tags?.find((t) => t.name === evt.tagName);
      return {
        id: evt.id,
        title: evt.title,
        start: evt.date,
        color: tag ? tag.color : evt.color,
        extendedProps: {
          notes: evt.notes,
          createdBy: evt.createdBy,
          tagName: tag ? tag.name : null,
          tagColor: tag ? tag.color : null,
        },
      };
    });
  }, [events, tags]);

  // Log ONLY when events or tags actually change
  useEffect(() => {
    debug("🟩 [CalendarWrapper] Raw events prop:", events);
    debug("🟦 [CalendarWrapper] Final mapped events to FullCalendar:", calendarEvents);
  }, [events, tags, calendarEvents, debug]);

  return (
    <>
      <div style={{
        color: "#fff",
        background: "#222",
        fontSize: 12,
        padding: 6,
        borderRadius: 4,
        marginBottom: 12
      }}>
        <strong>events:</strong>
        <pre>{JSON.stringify(events, null, 2)}</pre>
      </div>
      <FullCalendar
        key={eventsKey}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          start: "dayGridMonth,timeGridWeek,timeGridDay",
          center: "title",
          end: "prev,next today",
        }}
        initialView="dayGridMonth"
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        events={calendarEvents}
        dayCellClassNames={(arg) => {
          const date = arg.date;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (date < today) return ["past-date-cell"];
          return [];
        }}
        eventContent={(arg) => {
          const tagColor = arg.event.extendedProps.tagColor || "#f97316";
          const rgb = hexToRgb(tagColor);
          return (
            <div
              style={{
                width: "100%",
                padding: "6px 12px",
                borderRadius: 30,
                background: `linear-gradient(90deg, rgba(${rgb}, 0) 0%, ${tagColor} 100%)`,
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                userSelect: "none",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
                cursor: "pointer",
              }}
              title={arg.event.title}
            >
              {arg.event.title}
            </div>
          );
        }}
      />
    </>
  );
};

export default CalendarWrapper;
