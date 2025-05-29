import React, { useEffect, useState } from "react";
import { app } from "@microsoft/teams-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const App = () => {
    const [context, setContext] = useState(null);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        app.initialize().then(() => {
            app.getContext().then((ctx) => {
                setContext(ctx);
                console.log("Teams context:", ctx);
            });
        });
    }, []);

    const handleDateClick = (info) => {
        const title = prompt("Enter event title.");
        if (title) {
            setEvents([...events, { title, date: info.dateStr }]);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Care Calendar</h2>
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
