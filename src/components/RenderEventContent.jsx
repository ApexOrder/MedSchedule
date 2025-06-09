import hexToRgb from "../utils/hexToRgb";

function RenderEventContent(arg) {
  const tagColor = arg.event.extendedProps.tagColor || "#3b82f6";
  const title = arg.event.title;
  const completed = arg.event.extendedProps.completed;

  const borderRadius = 18; // Adjust as needed

  return (
    <div
      className="event-pill"
      style={{
        background: `linear-gradient(to right, rgba(${hexToRgb(tagColor)}, 0) 0%, ${tagColor} 100%)`,
        color: tagColor.toLowerCase() === "#ffffff" ? "#222" : "#fff",
        boxShadow: tagColor.toLowerCase() === "#ffffff"
          ? "0 2px 6px #bbb3"
          : `0 2px 6px ${tagColor}55`,
        padding: "2px 14px",
        borderRadius: borderRadius,
        fontSize: 14,
        fontWeight: 600,
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        userSelect: "none",
        cursor: "pointer",
        margin: "0 auto",
        transition: "box-shadow 0.18s, transform 0.18s, background 0.13s",
        opacity: completed ? 0.6 : 1, // faded if completed
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow =
          tagColor.toLowerCase() === "#ffffff"
            ? "0 4px 18px #bbb4"
            : `0 4px 18px ${tagColor}99`;
        e.currentTarget.style.transform = "scale(1.06)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow =
          tagColor.toLowerCase() === "#ffffff"
            ? "0 2px 6px #bbb3"
            : `0 2px 6px ${tagColor}55`;
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {/* ✔️ icon for completed */}
      {completed && (
        <span
          style={{
            marginRight: 6,
            color: "#3ecc59", // or your accent, or white if you prefer
            fontWeight: 900,
            fontSize: 16,
            verticalAlign: "middle",
            filter: "drop-shadow(0 0 1px #222)"
          }}
          title="Completed"
        >
          ✔️
        </span>
      )}
      {title}
    </div>
  );
}

export default RenderEventContent;
