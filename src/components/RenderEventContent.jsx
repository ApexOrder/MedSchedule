import React, { useState } from "react";
import ReactDOM from "react-dom";
import hexToRgb from "../utils/hexToRgb";

const TooltipBubble = ({ mouseX, mouseY, event }) => {
  if (mouseX === null || mouseY === null) return null;
  return ReactDOM.createPortal(
    <div
      className="calendar-tooltip-bubble"
      style={{
        position: "fixed",
        top: mouseY - 10,
        left: mouseX + 10,
        zIndex: 99999,
      }}
    >
      <div><strong>Title:</strong> {event.title}</div>
      <div><strong>Tag:</strong> {event.extendedProps.tagName || "-"}</div>
      <div><strong>Notes:</strong> {event.extendedProps.notes || "-"}</div>
      <div><strong>Creator:</strong> {event.extendedProps.createdBy || "-"}</div>
    </div>,
    document.body
  );
};

function RenderEventContent(arg) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: null, y: null });

  const tagColor = arg.event.extendedProps.tagColor || "#3b82f6";
  const pillStyle = {
    background: `linear-gradient(to right, rgba(${hexToRgb(tagColor)}, 0) 0%, ${tagColor} 100%)`,
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 600,
    width: "100%",
    cursor: "pointer",
    userSelect: "none",
    boxShadow: hovered
      ? "0 6px 18px rgba(0,0,0,0.32)"
      : "0 2px 6px rgba(0,0,0,0.15)",
    filter: hovered ? "brightness(1.08)" : "none",
    transition: "box-shadow 0.2s, filter 0.2s",
    position: "relative",
    boxSizing: "border-box",
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div
        style={pillStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseMove={e =>
          setMousePos({ x: e.clientX, y: e.clientY })
        }
        onMouseLeave={() => {
          setHovered(false);
          setMousePos({ x: null, y: null });
        }}
      >
        {arg.event.title}
      </div>
      {hovered && (
        <TooltipBubble
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          event={arg.event}
        />
      )}
    </>
  );
}

export default RenderEventContent;
