import React, { useMemo } from "react";
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
  debug,
}) => {
  // Memoize event mapping
  const fullCalendarEvents = useMemo(() => {
    debug("🟦 [CalendarWrapper] Raw events prop:");
    debug(JSON.stringify(events, null, 2));
    const mapped = events.map(evt => {
      // Try to match tag object for richer info (color, etc)
      let tagObj = null;
      if (evt.tagName && tags.length > 0) {
        tagObj = tags.find(tag => tag.name === evt.tagName);
      }
      return {
        id: evt.id,
        title: evt.title,
        start: evt.date,
        color: evt.color || "#f97316",
        extendedProps: {
          ...evt,
          tagName: evt.tagName,
          tagColor: tagObj ? tagObj.color : evt.tagColor || evt.color,
        },
      };
    });
    debug("🟩 [CalendarWrapper] Final mapped events to FullCalendar:");
    debug(JSON.stringify(mapped, null, 2));
    return mapped;
    // eslint-disable-next-line
  }, [eventsKey, tags]);

  // Custom renderer for event pills
  function renderEventContent(eventInfo) {
    // Look for tag color from extendedProps
    const { extendedProps } = eventInfo.event;
    const tagColor = extendedProps.tagColor || "#f97316";
    const eventTitle = eventInfo.event.title;

    // Gradient pill styling (same as TagManager)
    const pillStyle = {
      background: `linear-gradient(to right, rgba(${hexToRgb(tagColor)}, 0) 0%, ${tagColor} 100%)`,
      color: "#fff",
      marginRight: 6,
      marginBottom: 2,
      padding: "6px 14px",
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
      cursor: "pointer",
      userSelect: "none",
      fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
      display: "inline-block",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    };

    return (
      <span style={pillStyle} title={eventTitle}>
        {eventTitle}
      </span>
    );
  }

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
        eventContent={renderEventContent}
      />
    </div>
  );
};

export default CalendarWrapper;
