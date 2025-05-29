import React, { useEffect, useState } from "react";
import { app, authentication } from "@microsoft/teams-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./App.css"; // Ensure this is included

const App = () => {
  const [context, setContext] = useState(null);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    app.initialize().then(() => {
      app.getContext().then((ctx) => {
        setContext(ctx);
        console.log("✅ Teams context:", ctx);

        authentication
          .getAuthToken()
          .then((token) => {
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
    <div className="app-container">
      <h2 className="app-title">Care Calendar</h2>

      <div className="debug-label">
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
