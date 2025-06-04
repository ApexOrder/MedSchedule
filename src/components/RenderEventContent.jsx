import React, { useState } from "react";
import hexToRgb from "../utils/hexToRgb";

// Custom renderer for FullCalendar event pills
function RenderEventContent(arg) {
  const [hovered, setHovered] = useState(false);

  const tagColor = arg.event.extendedProps.tagColor || "#3b82f6";
  const pillStyle = {
    background: `linear-gradient(to right, rgba(${hexToRgb(tagColor)}, 0) 0%, ${tagColor} 100%)`,
    color: "#fff",
    margin: "0 0 2px 0",
    padding: "8px 14px",
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: hovered
      ? "0 6px 18px rgba(0,0,0,0.32)"
      : "0 2px 6px rgba(0,0,0,0.15)",
    cursor: "pointer",
    userSelect: "none",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    display: "block",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    filter: hovered ? "brightness(1.08)" : "none",
    transition: "box-shadow 0.2s, filter 0.2s",
  };

  // Tooltip
  const tooltip = `
Title: ${arg.event.title}
Tag: ${arg.event.extendedProps.tagName || "-"}
Notes: ${arg.event.extendedProps.notes || "-"}
Created by: ${arg.event.extendedProps.createdBy || "-"}
  `.trim();

  return (
    <div
      style={pillStyle}
      title={tooltip}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {arg.event.title}
    </div>
  );
}

export default RenderEventContent;
