import hexToRgb from "../utils/hexToRgb";

function RenderEventContent(arg) {
  const tagColor = arg.event.extendedProps.tagColor || "#3b82f6";
  const title = arg.event.title;
  return (
    <div
      className="event-pill"
      style={{
        background: `linear-gradient(to right, rgba(${hexToRgb(tagColor)}, 0) 0%, ${tagColor} 100%)`,
        color: "#fff",
        padding: "8px 14px",
        borderRadius: 16,
        fontSize: 14,
        fontWeight: 600,
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        userSelect: "none",
        cursor: "pointer",
        margin: "0 auto"
      }}
      title={`${title}\nTag: ${arg.event.extendedProps.tagName || "-"}\nNotes: ${arg.event.extendedProps.notes || "-"}\nCreator: ${arg.event.extendedProps.createdBy || "-"}`}
    >
      {title}
    </div>
  );
}

export default RenderEventContent;
