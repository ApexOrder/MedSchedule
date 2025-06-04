import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import hexToRgb from "../utils/hexToRgb";
import React from "react";

const TagManager = ({ tags, setTags, channelId, debug }) => {
  const handleDeleteTag = async (tagId) => {
    debug(`🟠 [TagManager] Attempting to delete tag: ${tagId}`);
    try {
      await deleteDoc(doc(db, "tags", tagId));
      debug(`🟢 [TagManager] Successfully deleted tag: ${tagId}`);
      setTags(tags.filter(tag => tag.id !== tagId));
    } catch (err) {
      debug(`🔴 [TagManager] Failed to delete tag: ${tagId} | Error: ${err.message}`);
      alert("Failed to delete tag: " + err.message);
    }
  };

  return (
    <div>
      {/* ...Tag adding form... */}
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
              padding: "6px 14px 6px 18px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              userSelect: "none",
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {tag.name}
            <button
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                marginLeft: 8,
                cursor: "pointer",
                fontSize: 13,
                opacity: 0.7,
                transition: "opacity 0.14s, color 0.14s",
              }}
              title="Delete tag"
              onClick={e => {
                e.stopPropagation();
                handleDeleteTag(tag.id);
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TagManager;
