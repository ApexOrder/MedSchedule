import React, { useState } from "react";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import hexToRgb from "../utils/hexToRgb";

const TagManager = ({ tags, setTags, channelId }) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Add new tag (prevent duplicates)
  const handleAddTag = async () => {
    if (!newName.trim() || !channelId) return;
    if (tags.some(tag => tag.name.toLowerCase() === newName.trim().toLowerCase())) {
      setNewName("");
      return;
    }
    setIsAdding(true);
    try {
      const newTag = {
        name: newName.trim(),
        color: newColor,
        channelId: channelId,
      };
      const docRef = await addDoc(collection(db, "tags"), newTag);
      setTags(prev => [...prev, { ...newTag, id: docRef.id }]);
      setNewName("");
    } catch (err) {
      // Optionally handle error
    }
    setIsAdding(false);
  };

  // Delete tag
  const handleDeleteTag = async (tagId) => {
    if (!tagId) return;
    setDeletingId(tagId);
    try {
      await deleteDoc(doc(db, "tags", tagId));
      setTags(prev => prev.filter(tag => tag.id !== tagId));
    } catch (err) {
      // Optionally handle error
    }
    setDeletingId(null);
  };

  return (
    <div>
      {/* Add Tag Form */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <input
          placeholder="Tag name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{
            padding: 8, borderRadius: 5, border: "1px solid #555",
            background: "#232338", color: "#fff", width: 112,
          }}
        />
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          style={{
            width: 38, height: 32, border: "none",
            background: "none", borderRadius: 8,
          }}
        />
        <button
          onClick={handleAddTag}
          disabled={isAdding}
          style={{
            padding: "7px 16px", borderRadius: 7, border: "none",
            background: "#f97316", color: "#fff", fontWeight: 600,
            fontSize: 14, cursor: isAdding ? "wait" : "pointer",
            transition: "filter 0.18s", opacity: isAdding ? 0.6 : 1,
          }}
        >
          Add Tag
        </button>
      </div>

      {/* Tag List with Delete */}
      <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tags.length === 0 && (
          <span style={{ opacity: 0.6, fontSize: 13 }}>No tags for this channel yet.</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="tag-pill"
            title={tag.name}
            style={{
              background: `linear-gradient(to right, rgba(${hexToRgb(tag.color)}, 0) 0%, ${tag.color} 100%)`,
              color: "#fff",
              padding: "6px 14px 6px 18px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(0,0,0,0.13)",
              userSelect: "none",
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              letterSpacing: 0.1,
              transition: "box-shadow 0.18s, transform 0.16s",
              opacity: deletingId === tag.id ? 0.5 : 1,
            }}
          >
            {tag.name}
            <button
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                marginLeft: 8,
                cursor: deletingId === tag.id ? "wait" : "pointer",
                fontSize: 13,
                opacity: deletingId === tag.id ? 0.4 : 0.7,
                transition: "opacity 0.14s, color 0.14s",
              }}
              title="Delete tag"
              onClick={() => handleDeleteTag(tag.id)}
              disabled={deletingId === tag.id}
            >✕</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TagManager;
