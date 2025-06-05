import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  let bigint = parseInt(hex, 16);
  let r, g, b;
  if (hex.length === 6) {
    r = (bigint >> 16) & 255;
    g = (bigint >> 8) & 255;
    b = bigint & 255;
  } else if (hex.length === 3) {
    r = (bigint >> 8) & 15;
    g = (bigint >> 4) & 15;
    b = bigint & 15;
    r = (r << 4) | r;
    g = (g << 4) | g;
    b = (b << 4) | b;
  } else {
    return "0,0,0";
  }
  return `${r},${g},${b}`;
}

const TagManager = ({ tags, setTags, channelId }) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#ffffff");

  const addTagToFirestore = async (tag) => {
    await addDoc(collection(db, "tags"), tag);
  };

  const addTag = async () => {
    if (!newName.trim() || !channelId) return;
    const newTag = { name: newName.trim(), color: newColor, channelId };
    await addTagToFirestore(newTag);
    setNewName("");
  };

  return (
    <div>
  {/* Input row: name, color, button */}
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
    <input
      placeholder="Tag name"
      value={newName}
      onChange={(e) => setNewName(e.target.value)}
      style={{
        padding: "7px 10px",
        borderRadius: 8,
        border: "1.5px solid #444",
        background: "#1c1d25",
        color: "#fff",
        fontSize: 14,
        outline: "none",
        minWidth: 90
      }}
    />
    <input
      type="color"
      value={newColor}
      onChange={(e) => setNewColor(e.target.value)}
      style={{
        width: 34,
        height: 34,
        border: "none",
        borderRadius: 8,
        background: "#222",
        boxShadow: "0 2px 8px #0002"
      }}
    />
    <button
      onClick={addTag}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        background: "#f97316",
        color: "#fff",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer",
        transition: "background 0.2s",
        marginLeft: 4
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#ff9100")}
      onMouseLeave={e => (e.currentTarget.style.background = "#f97316")}
    >
      Add Tag
    </button>
  </div>

  {/* Tags display */}
  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
    {tags.map((tag) => {
      const tagColor = tag.color || "#3b82f6";
      return (
        <span
          key={tag.id}
          className="tag-pill"
          title={tag.name}
          style={{
            background: `linear-gradient(to right, rgba(${hexToRgb(tagColor)}, 0) 0%, ${tagColor} 100%)`,
            color: tagColor.toLowerCase() === "#ffffff" ? "#222" : "#fff",
            marginRight: 0,
            marginBottom: 0,
            padding: "5px 14px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: tagColor.toLowerCase() === "#ffffff"
              ? "0 2px 6px #bbb3"
              : `0 2px 6px ${tagColor}55`,
            cursor: "default",
            userSelect: "none",
            transition: "transform 0.18s, box-shadow 0.18s",
            fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
            display: "inline-block",
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
          {tag.name}
        </span>
      );
    })}
  </div>
</div>


export default TagManager;
