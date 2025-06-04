import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import hexToRgb from "../utils/hexToRgb";

const TagManager = ({ tags, setTags, channelId }) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const addTagToFirestore = async (tag) => {
    const docRef = await addDoc(collection(db, "tags"), tag);
    return docRef.id;
  };

  const addTag = async () => {
    if (!newName.trim() || !channelId) return;
    const newTag = {
      id: null,
      name: newName.trim(),
      color: newColor,
      channelId,
    };
    const id = await addTagToFirestore(newTag);
    newTag.id = id;
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
              color: "#fff",
              marginRight: 6,
              marginBottom: 6,
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              cursor: "default",
              userSelect: "none",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
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
