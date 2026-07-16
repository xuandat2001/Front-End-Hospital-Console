# Elly Healthcare Industry Console Prototype

This folder is a frontend-only copy of `Front-end/` for demos, reviews, and deployment previews that should not depend on backend services.

## How This Differs From The Real Frontend

- `Front-end/` remains the real API-connected frontend.
- `Front-end-prototype/` keeps the same React app structure, components, CSS, assets, dashboard shell, sidebar, right rail, Billing page, Appointment Booking page, Emergency Workflow page, and Messaging UI.
- API calls are routed to local mock data when `VITE_USE_MOCK_DATA=true` and `VITE_DISABLE_API=true`.
- Socket.IO realtime hooks are disabled in mock mode and seeded with mock realtime state.

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The prototype opens directly into the mock hospital dashboard.

## Build

```bash
npm run build
```

## Preview The Build

```bash
npm run preview
```

## Deploy On Render

1. Create a new Static Site on Render.
2. Set the root directory to `Front-end-prototype`.
3. Set build command to `npm install && npm run build`.
4. Set publish directory to `dist`.
5. Add a rewrite rule for SPA refresh/direct routes:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite
6. Add environment variables:
   - `VITE_USE_MOCK_DATA=true`
   - `VITE_DISABLE_API=true`
7. Deploy.

## What Is Mocked

- Session and hospital workspace
- Overview dashboard metrics and activity
- Patient search/profile lookups
- Emergency requests, notifications, summaries, resources, and timelines
- Appointment list, booking, availability, cancel, and complete flows
- In-app messaging conversations, messages, unread counts, and sends
- Billing dashboard mock data
- Knowledge assistant answers and document list
- Reports, departments, staff, rooms, admissions, surgeries, diagnostics, ICU summary

## Connect Later

When the prototype is ready to become a real environment, remove or disable the mock flags and reconnect:

- Hospital access/session resolution
- Patient, hospital, appointment, emergency, messaging, billing, reports, diagnostics, and intelligence APIs
- Socket.IO realtime channels
- Real document upload/download endpoints
