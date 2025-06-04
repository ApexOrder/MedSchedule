import React, { useState, useRef } from "react";
import hexToRgb from "../utils/hexToRgb";

function RenderEventContent(arg) {
  const [hovered, setHovered] = useState(false);
  const pillRef = useRef(null);

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
    position: "relative",
  };

  const tooltip = (
    <div className="calendar-tooltip-bubble">
      <div><strong>Title:</strong> {arg.event.title}</div>
      <div><strong>Tag:</strong> {arg.event.extendedProps.tagName || "-"}</div>
      <div><strong>Notes:</strong> {arg.event.extendedProps.notes || "-"}</div>
      <div><strong>Creator:</strong> {arg.event.extendedProps.createdBy || "-"}</div>
    </div>
  );

  return (
    <div
      ref={pillRef}
      style={pillStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {arg.event.title}
      {hovered && tooltip}
    </div>
  );
}

export default RenderEventContent;
