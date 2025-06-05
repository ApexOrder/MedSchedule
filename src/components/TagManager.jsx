import React, { useState } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import hexToRgb from "../utils/hexToRgb";

const TagManager = ({ tags, setTags, channelId, debug = () => {} }) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Tag add handler
  const handleAddTag = async () => {
  if (!newName.trim() || !channelId) return;
  setIsAdding(true);

  try {
    const tag = {
      name: newName.trim(),
      color: newColor,
      channelId: channelId,
    };
    debug(`[TagManager] Adding tag: ${JSON.stringify(tag)}`);
    await addDoc(collection(db, "tags"), tag);
    debug(`[TagManager] Tag created.`);
    setNewName("");
  } catch (err) {
    debug(`[TagManager] Failed to add tag: ${err.message}`);
  } finally {
    setIsAdding(false);
  }
};


  // Tag delete handler
  const handleDeleteTag = async (tagId) => {
    if (!tagId) {
      debug(`[TagManager] Attempting to delete tag: null`);
      return;
    }
    debug(`[TagManager] Attempting to delete tag: ${tagId}`);
    setDeletingId(tagId);

    try {
      await deleteDoc(doc(db, "tags", tagId));
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      debug(`[TagManager] Tag deleted: ${tagId}`);
    } catch (err) {
      debug(`🔴 [TagManager] Failed to delete tag: ${tagId} | Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Add Tag Form */}
      <div style={{ marginBottom: 14, display: "flex", gap: 8 }}>
        <input
          placeholder="Tag name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{
            padding: "7px 8px",
            borderRadius: 7,
            border: "1px solid #555",
            minWidth: 70,
            background: "#242436",
            color: "#fff",
          }}
        />
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          style={{
            width: 36, height: 32, borderRadius: 8,
            border: "1px solid #555", background: "#fff", padding: 0
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

      {/* Tag Pills */}
      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
  {tags.map((tag) => (
    <span
      key={tag.id}
      className="tag-pill"
      title={tag.name}
      style={{
        background: `linear-gradient(to right, rgba(${hexToRgb(tag.color)}, 0) 0%, ${tag.color} 100%)`,
        color: "#fff",
        padding: "2px 10px 2px 12px",   // much slimmer pill
        borderRadius: 13,
        fontSize: 12.5,
        fontWeight: 600,
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        userSelect: "none",
        display: "inline-flex",
        alignItems: "center",
        minHeight: 22,
        gap: 5,
        opacity: deletingId === tag.id ? 0.5 : 1,
        cursor: deletingId === tag.id ? "wait" : "default",
        marginRight: 0,
        marginBottom: 0,
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
    >
      {tag.name}
      <button
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          marginLeft: 7,
          cursor: deletingId === tag.id ? "wait" : "pointer",
          fontSize: 14,
          opacity: deletingId === tag.id ? 0.4 : 0.7,
          display: "flex",
          alignItems: "center",
          padding: 0,
          height: 18,
          width: 18,
          lineHeight: 1,
          borderRadius: "50%",
          transition: "opacity 0.14s, color 0.14s",
        }}
        title="Delete tag"
        onClick={e => {
          e.stopPropagation();
          handleDeleteTag(tag.id);
        }}
        disabled={deletingId === tag.id}
      >✕</button>
    </span>
  ))}
</div>

    </div>
  );
};

export default TagManager;
