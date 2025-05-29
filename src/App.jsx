import React, { useEffect, useState } from "react";
import { app, authentication } from "@microsoft/teams-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const App = () => {
  const [context, setContext] = useState(null);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Initialize Teams SDK
    app.initialize().then(() => {
      app.getContext().then((ctx) => {
        setContext(ctx);
        console.log("✅ Teams context:", ctx);

        // Try to get the authenticated user
        authentication
          .getAuthToken()
          .then((token) => {
            // Optionally decode JWT token here if needed
            authentication.getUser().then((user) => {
              setUser(user);
              console.log("✅ Authenticated user:", user);
            });
          })
          .catch((err) => {
            console.error("❌ Auth error:", err);
            setUser({ displayName: "Unauthenticated", email: "N/A" });
          });
      });
    });
  }, []);

  const handleDateClick = (info) => {
    const title = prompt("Enter event title");
    if (title) {
      setEvents([...events, { title, date: info.dateStr }]);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Care Calendar</h2>

      {/* 🔍 Debug label */}
      <div style={{
        padding: "10px",
        marginBottom: "15px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        background: "#f0f0f0",
        fontFamily: "monospace"
      }}>
        {user ? (
          <>
            👤 <strong>{user.displayName}</strong> ({user.email})
          </>
        ) : (
          <>🔄 Authenticating…</>
        )}
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        dateClick={handleDateClick}
        events={events}
      />
    </div>
  );
};

export default App;
