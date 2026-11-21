# MediTrack - Full Stack Healthcare Management System

## Quick Start
You can launch all services by double clicking `start-all.bat` or running:

### 1. Backend Server (Port 3000)
```bash
cd Backend
npm start
```

### 2. Main Web Application (Port 5173)
```bash
cd Frontend
npm run dev -- --port 5173
```
Accessible at: [http://localhost:5173](http://localhost:5173)

### 3. Dedicated Admin Portal (Port 5174)
```bash
cd admin
npm run dev -- --port 5174
```
Accessible at: [http://localhost:5174](http://localhost:5174)

---

## Pre-Configured Accounts (Password: `password123`)

| Role | Email | Password | Status |
|------|-------|----------|--------|
| **Doctor (Personal)** | `urvishbhardwaj7@gmail.com` | `password123` | Approved |
| **Doctor (Demo)** | `doctor@meditrack.com` | `password123` | Approved |
| **Administrator** | `admin@meditrack.com` | `password123` | Active |
| **Patient** | `patient@meditrack.com` | `password123` | Active |

---

## Google Sign-In Note
Google OAuth requires a live OAuth Client ID registered in Google Cloud Console. If the client is deleted or inactive in Google Cloud, the app displays a clear prompt allowing you to log in with Email & Password or use the 1-Click Demo buttons.
To connect your own Google Client ID:
1. Update `VITE_GOOGLE_CLIENT_ID` in `Frontend/.env`
2. Update `GOOGLE_CLIENT_ID` in `Backend/.env`


---

## Deployment (Render)
The whole monorepo deploys from `render.yaml` (Render Blueprint), branch `main`:

| Service | Type | Root dir | Build | Start / publish |
|---|---|---|---|---|
| `meditrack-api-k2xy-k2xy` | Web Service (Node 22) | `Backend` | `npm ci --include=dev && npm run build` | `node dist/server.js`, health `/health` |
| `meditrack-web-k2xy-k2xy` | Static Site | `frontend` | `npm ci && npm run build` | `dist`, SPA rewrite `/*` → `/index.html` |
| `meditrack-admin-k2xy-k2xy` | Static Site | `admin` | `npm ci && npm run build` | `dist` |

- Database: the existing Neon Postgres (`DATABASE_URL`).
- Uploaded files (medical records, doctor documents, avatars) are stored in the
  `StoredFile` table, so they survive redeploys. Medical records are only served
  through authenticated routes.
- Backend env vars: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`,
  `GEMINI_MODEL`, `CORS_ORIGINS` (comma-separated frontend URLs), `NODE_ENV`.
- Frontend env vars (public, build time): `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`.
- Google sign-in: add the deployed frontend URL to the OAuth client's
  "Authorized JavaScript origins" in Google Cloud Console.
- `GET /health` = liveness, `GET /health/db` = database check.
- Prescription emails: when a doctor confirms a treatment (or amends a confirmed one),
  the patient gets the prescription by email through Brevo. Needs `BREVO_API_KEY` and
  `EMAIL_FROM_ADDRESS` (a sender verified in Brevo); optional `EMAIL_FROM_NAME`, `APP_URL`.
  Results are recorded in the audit log as `PRESCRIPTION_EMAIL_SENT` / `PRESCRIPTION_EMAIL_FAILED`.
- Patient language: each patient picks a prescription language (Profile → Personal Information;
  defaults to the app language at sign-up). On confirm, the prescription is translated with Gemini
  (medicine names and strengths always stay in English), voiced with ElevenLabs (`eleven_v4`),
  stored privately (`TreatmentTranslation` + `StoredFile`), shown in the patient's treatment view
  with a play button, and emailed in that language. The doctor can override the language per consultation.
- Doctor dictation: with `ELEVENLABS_API_KEY` set, the mic records audio and ElevenLabs Scribe
  (`scribe_v2_medical`) transcribes it in any language; Gemini then fills the form in English.
