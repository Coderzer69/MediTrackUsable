# MediTrack

**E-prescriptions and digital medical records for safer healthcare.** Doctors dictate in any language, and patients get a verified prescription in their own language, as text, voice and email. Medicine names always stay in English.

Built by **Team Valyrian Minds** (ABES Engineering College) for **HackForge 2K26**: Urvish Bhardwaj, Siddharth Rawat, Shivam Lohkana, Sujal Kumar.

## Live demo

| | Link |
|---|---|
| **Main app** (patients and doctors) | https://meditrack-web-k2xy-k2xy.onrender.com |
| **Admin portal** | https://meditrack-admin-k2xy-k2xy.onrender.com |
| **API** | https://meditrack-api-k2xy-k2xy.onrender.com |
| API health | https://meditrack-api-k2xy-k2xy.onrender.com/health |
| Source code | https://github.com/Coderzer69/MediTrackUsable |

> The API runs on Render's free plan and sleeps after 15 minutes without traffic. The first request after that can take 30–60 seconds; open the health link once to wake it up.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@meditrack.com` | `password123` |
| Doctor | `doctor@meditrack.com` | `password123` |
| Patient | `patient@meditrack.com` | `password123` |

A doctor can only prescribe after an admin approves them. If the demo doctor shows "verification pending", approve it in the admin portal under **Doctors**.

These are public demo credentials. Change them before using the app with real patient data.

## Features

**For doctors**
- **Voice dictation in any language.** Speak in English, Hindi, Tamil, or a Hindi-English mix. ElevenLabs Scribe transcribes it and Gemini fills in condition, diagnosis and medicines in English. The doctor reviews before confirming.
- **QR patient lookup.** Scan the patient's QR code to open their profile.
- **Consent-based history.** Request access to a patient's history; it opens only after the patient approves.
- **Verified doctors.** Medical registration is checked by an admin before a doctor can prescribe.

**For patients**
- **Prescriptions in their own language.** 11 languages: English, Hindi, Bengali, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi and Urdu.
  - Translated text with an English/own-language switch.
  - A voice recording with a "Listen to your prescription" button (ElevenLabs).
  - An email copy (Brevo).
- **Medical records vault.** Upload past reports and prescriptions (PDF, JPG, PNG). Authorised doctors can view them read-only.
- **QR identity** and control over who sees their history.

**For admins**
- Approve, reject or suspend doctors; manage patients and treatments.
- Live sync: database changes appear in the panel within seconds.
- A full audit log of every sensitive action.

**Interface:** 6 interface languages, plus dark and light mode.

## How it runs on Render

The whole monorepo is deployed from one Render Blueprint, [`render.yaml`](render.yaml), on branch `main`. Every push to `main` redeploys automatically.

| Service | Render type | Folder | Notes |
|---|---|---|---|
| `meditrack-web-k2xy-k2xy` | Static site (global CDN) | `frontend/` | Every page served by `index.html`, plus security headers |
| `meditrack-admin-k2xy-k2xy` | Static site (global CDN) | `admin/` | Admin portal |
| `meditrack-api-k2xy-k2xy` | Node web service (Ohio) | `Backend/` | Health check `/health`; database check `/health/db` |

Design choices:
- **Database:** Neon PostgreSQL in us-east-2, the same area as the API's Ohio region.
- **Redeploy-proof files:** uploaded files are stored in PostgreSQL (`StoredFile` table), not on Render's temporary disk, so they survive every redeploy. Medical records are only served to logged-in users with permission.
- **Email over HTTPS:** emails go through Brevo's HTTPS API, because Render's free plan blocks email (SMTP) ports.
- **Secrets stay in Render:** secrets live only in Render environment variables, and CORS is limited to the two frontend domains.
- **Deployed with AI:** set up, configured and debugged through the Render MCP server.

**Next on Render:** Workflows (a retryable prescription pipeline), Cron Jobs (medicine reminders in the patient's language), and a Private Service for medical data.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, i18next
- **Backend:** Node.js, Express 5, TypeScript, Prisma 5, PostgreSQL, JWT logins, Helmet, Multer
- **AI and voice:**
  - Google Gemini: consultation structuring and translation
  - ElevenLabs: Scribe `scribe_v2_medical` for speech-to-text, `eleven_v4` for voice
- **Email:** Brevo transactional API
- **Hosting:** Render (Blueprint), Neon PostgreSQL

## Run locally

Requires Node.js 22+.

```bash
# 1. Backend: http://localhost:3000
cd Backend
cp .env.example .env        # fill in the values below
npm install
npx prisma generate
npm start

# 2. Main app: http://localhost:5173
cd frontend
npm install
npm run dev -- --port 5173

# 3. Admin portal: http://localhost:5174
cd admin
npm install
npm run dev -- --port 5174
```

On Windows you can instead double-click `restart-all.bat`, which frees ports 3000, 5173 and 5174 and starts all three apps.

### Environment variables

**Backend (`Backend/.env`)**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Login token signing key (use a long random value) |
| `GOOGLE_CLIENT_ID` | Google sign-in client ID |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Consultation drafting and translation |
| `ELEVENLABS_API_KEY` | Dictation and patient voice (optional: `ELEVENLABS_STT_MODEL`, `ELEVENLABS_TTS_MODEL`, `ELEVENLABS_VOICE_ID`) |
| `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS` | Prescription emails; the sender must be verified in Brevo (optional: `EMAIL_FROM_NAME`) |
| `APP_URL` | Main app URL, used in email links |
| `CORS_ORIGINS` | Comma-separated frontend URLs allowed to call the API (production) |

Optional features turn themselves off when their keys are missing.

**Frontend (`frontend/.env`), all public:**
- `VITE_API_URL`: for example `http://localhost:3000/api`
- `VITE_GOOGLE_CLIENT_ID`

**Admin (`admin/.env`), public:**
- `VITE_API_URL`

### Google sign-in

Add your frontend URL (for example `http://localhost:5173`, or your Render URL) under **Authorized JavaScript origins** of the Google OAuth client. Use that client's ID for both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. While the Google app is in Testing mode, only accounts added as test users can sign in.

## Security notes

- Google sign-in accepts only Google-verified ID tokens, and public sign-up can create only patient or doctor accounts.
- Role-based access control:
  - patients see only their own data;
  - doctors see a patient's history only after the patient approves;
  - admins have full access.
- Medical records and voice recordings are never publicly served. Uploads are checked by file content, not only by extension.
- Medical content is never written to logs.
