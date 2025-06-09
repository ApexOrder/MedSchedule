import React from "react";

const EventModal = ({
  show,
  newEvent,
  setNewEvent,
  tags,
  selectedEventId,
  editMode,
  setEditMode,
  handleSaveEvent,
  handleCancel,
  handleDeleteEvent,
  handleDeleteSeries
}) => {
  if (!show) return null;

  return (
    <div
      className="modal-fade"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        background: "#2d2d2d",
        padding: 20,
        borderRadius: 8,
        zIndex: 9999,
        width: 400,
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        transformOrigin: "center center",
      }}
    >
      <h3 style={{ color: "#fff", marginBottom: 4 }}>
        {selectedEventId !== null ? "Edit Event" : "New Event"}
      </h3>
      {selectedEventId !== null && newEvent.createdAt && (
        <div style={{ color: "#aaa", fontSize: 12, marginBottom: 10 }}>
          Created: {new Date(newEvent.createdAt).toLocaleString()} <br />
          Created by: {newEvent.createdBy || "Unknown"}
        </div>
      )}
      <input
        type="text"
        placeholder="Title"
        value={newEvent.title}
        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #555" }}
      />
      {selectedEventId !== null && newEvent.isRecurring && (
        <div style={{ marginBottom: 10, color: "#fff" }}>
          <label style={{ marginRight: 12 }}>
            <input
              type="radio"
              name="editMode"
              value="single"
              checked={editMode === "single"}
              onChange={() => setEditMode("single")}
            />{" "}
            Edit this event only
          </label>
          <label>
            <input
              type="radio"
              name="editMode"
              value="future"
              checked={editMode === "future"}
              onChange={() => setEditMode("future")}
            />{" "}
            Edit this and future events
          </label>
        </div>
      )}
      <textarea
        placeholder="Notes"
        value={newEvent.notes}
        onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
        style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #555" }}
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 10,
          gap: 8,
          color: "#fff",
        }}
      >
        <input
          type="checkbox"
          checked={newEvent.isRecurring}
          onChange={(e) => setNewEvent({ ...newEvent, isRecurring: e.target.checked })}
        />
        <span>Recurring event</span>
      </label>
      {newEvent.isRecurring && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ color: "#fff", display: "block", marginBottom: 4 }}>
            Interval (days):
          </label>
          <input
            type="number"
            min="1"
            value={newEvent.interval}
            onChange={(e) => setNewEvent({ ...newEvent, interval: Number(e.target.value) })}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #555" }}
          />
          <label style={{ color: "#fff", display: "block", marginTop: 10, marginBottom: 4 }}>
            End date:
          </label>
          <input
            type="date"
            value={newEvent.endDate}
            onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #555" }}
          />
        </div>
      )}
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 0 0" }}>
  <input
    type="checkbox"
    checked={newEvent.completed || false}
    onChange={e => setNewEvent(prev => ({ ...prev, completed: e.target.checked }))}
    style={{ width: 18, height: 18, accentColor: "#ff9100" }}
  />
  <span style={{ fontSize: 15, color: "#fff" }}>Mark as completed</span>
</label>

      <label style={{ color: "#fff", display: "block", marginBottom: 4 }}>
        Event Tag:
      </label>
      <select
        value={newEvent.tagName || ""}
        onChange={(e) => setNewEvent({ ...newEvent, tagName: e.target.value || null })}
        style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 4, border: "1px solid #555" }}
      >
        <option value="">-- None --</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.name}>
            {tag.name}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleSaveEvent}
          style={{
            background: "#10b981",
            padding: 10,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            flex: "1 1 45%",
            transition: "filter 0.3s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          style={{
            background: "#ef4444",
            padding: 10,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            flex: "1 1 45%",
            transition: "filter 0.3s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
        >
          Cancel
        </button>
      </div>
      {selectedEventId !== null && (
        <>
          <button
            className="delete-event"
            onClick={handleDeleteEvent}
            style={{
              marginTop: 12,
              width: "100%",
              backgroundColor: "#b91c1c",
              color: "#fff",
              border: "none",
              padding: 10,
              borderRadius: 4,
              cursor: "pointer",
              transition: "filter 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            Delete Event
          </button>
          {newEvent.isRecurring && (
            <button
              className="delete-event"
              onClick={handleDeleteSeries}
              style={{
                marginTop: 8,
                width: "100%",
                backgroundColor: "#7f1d1d",
                color: "#fff",
                border: "none",
                padding: 10,
                borderRadius: 4,
                cursor: "pointer",
                transition: "filter 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              Delete Series
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default EventModal;
