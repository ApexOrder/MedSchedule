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
      <input
        placeholder="Tag name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        style={{ padding: 6, marginRight: 8, borderRadius: 4, border: "1px solid #555" }}
      />
      <input
        type="color"
        value={newColor}
        onChange={(e) => setNewColor(e.target.value)}
        style={{ marginRight: 8, width: 40, height: 30, verticalAlign: "middle", borderRadius: 4, border: "1px solid #555" }}
      />
      <button
        onClick={addTag}
        style={{
          padding: "6px 12px",
          borderRadius: 4,
          border: "none",
          backgroundColor: "#f97316",
          color: "#fff",
          cursor: "pointer",
          transition: "filter 0.3s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
      >
        Add Tag
      </button>

      <div style={{ marginTop: 10 }}>
        {tags.map((tag) => (
          <span
  key={tag.id}
  className="tag-pill"
  title={tag.name}
  style={{
    background: `linear-gradient(to right, rgba(${hexToRgb(tag.color)}, 0) 0%, ${tag.color} 100%)`,
    color: tag.color.toLowerCase() === "#ffffff" ? "#222" : "#fff", // <-- NEW
    marginRight: 6,
    marginBottom: 6,
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: `0 2px 6px ${tag.color}55`,
    cursor: "default",
    userSelect: "none",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    display: "inline-block",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "scale(1.1)";
    e.currentTarget.style.boxShadow = `0 4px 12px ${tag.color}99`;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = `0 2px 6px ${tag.color}55`;
  }}
>
  {tag.name}
</span>


        ))}
      </div>
    </div>
  );
};

export default TagManager;
