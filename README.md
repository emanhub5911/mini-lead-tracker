# Mini Lead Tracker

A simple lead tracker for a small sales team. Built with plain HTML, CSS and JavaScript: no frameworks, no installs, no backend.

## Features
- Add leads with name, company, phone, source (LinkedIn or Website) and notes
- A board with 5 stages: New, Contacted, Interested, Won, Lost
- Move a lead between stages with the dropdown on its card
- Edit and delete leads
- A top bar with the total lead count and the count for each stage
- Data is saved in the browser (localStorage), so it stays after a refresh

## Run it
Open `index.html` in any modern browser. That's it.

> Note: data is stored per browser and per device. It is not shared between team members.

## Files
- `index.html`: page structure
- `style.css`: styling and responsive layout
- `app.js`: data, storage, rendering and event handling
