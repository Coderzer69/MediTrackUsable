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

