# MediTrack - Digital Care & Smart Medical Records

MediTrack is an end-to-end clinical records management and consultation platform connecting patients, verified healthcare providers, and administrators. It features voice-assisted medical transcription powered by Google Gemini, cryptographic patient QR identifiers, role-based access control, and complete audit trails.

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |               Web Frontend                  |
                                      |      React 19 + Vite + Tailwind CSS         |
                                      +----------------------+----------------------+
                                                             |
                                                             | REST APIs (Axios)
                                                             v
                                      +---------------------------------------------+
                                      |               Express Backend               |
                                      |         TypeScript + JWT + Multer           |
                                      +-------+--------------------+----------------+
                                              |                    |
                                              v                    v
                   +------------------------------------+   +------------------------------------+
                   |          Neon PostgreSQL           |   |           Google Gemini            |
                   |       (Prisma ORM Database)        |   |   (Scribe Consultation Engine)     |
                   +------------------------------------+   +------------------------------------+
```

---

## Key Flows

1. **Authentication & Roles:**
   - **Patient:** Self-signup or admin-created; assigned a unique cryptographic QR identifier (`PT-XXXXXXXX`).
   - **Doctor:** Self-signup with medical license upload. Verification state defaults to `PENDING`. Only verified doctors can confirm treatments or view patient histories.
   - **Admin:** Root platform administrator managing doctors, patients, clinical consultations, and security audit logs.
   - **Token Refresh & Profile:** Persistent sessions validated on boot via `GET /api/auth/me`.

2. **Admin Operations (`/admin`):**
   - **Full Doctor CRUD:** Add doctor with initial credentials, edit information, delete accounts with cascade cleanup.
   - **Verification Workflow:** Approve or reject doctor applications with customized rejection feedback.
   - **Full Patient CRUD:** Create patients with automated QR generation, update profiles, or delete accounts.
   - **Treatments View:** Overview of all consultation records across the clinic.
   - **Audit Logs:** Real-time log of security, access, and modification actions with client IP, action name, user, and timestamps.

3. **Consultations & AI Medical Scribe (`/doctor/dashboard`):**
   - **Patient Identification:** Scan QR code using device camera with graceful fallback to manual QR/Patient ID input.
   - **Live Voice Transcription:** Doctor speaks into the microphone; live transcription runs in real-time via Web Speech API.
   - **Audio Fallback:** Direct audio recording via `MediaRecorder` streamed to server-side Gemini AI for browsers without Web Speech support.
   - **Gemini Structured Extraction:** Extracts symptoms, formal diagnosis, condition, clinical notes, and prescription dosages/instructions into strict normalized JSON.
   - **Review & Confirm:** Doctor edits and approves prescriptions before confirming to permanent history.

4. **Patient Portal (`/patient/dashboard`):**
   - Live display and download of unique patient QR code.
   - History of confirmed treatments, diagnosed conditions, and active prescriptions.
   - Medical history access control: review, approve, or deny 24-hour access requests from attending physicians.
   - Account settings with live profile update and password change.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### 1. Backend Setup

```bash
cd Backend
npm install
```

Configure your environment variables in `Backend/.env` (see `Backend/.env.example`):
```env
PORT=3000
DATABASE_URL="your-postgresql-connection-string"
JWT_SECRET="your-secure-jwt-secret"
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
```

Initialize the database schema:
```bash
npx prisma db push
```

Start the backend server:
```bash
# Development mode with hot reload
npm run dev

# Or production build & start
npm run build
npm start
```
The backend starts at `http://localhost:3000`. Test health status at `http://localhost:3000/health`.

### 2. Frontend Setup (Patients & Doctors Portal)

```bash
cd Frontend
npm install
```

Configure environment in `Frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

Start the Vite development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Admin Portal Setup (Dedicated Admin Application)

```bash
cd admin
npm install
```

Configure environment in `admin/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

Start the Vite development server:
```bash
npm run dev
```
Open the designated port (e.g. `http://localhost:5174` or as displayed by Vite) in your browser.

---

## Seed Accounts & Testing Credentials

| Role | Email | Password | Access / Status |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@meditrack.com` | `password123` | Root admin panel (`/admin` in both apps) |
| **Verified Doctor** | `doctor.verified@meditrack.com` | `password123` | Approved doctor (`/doctor/dashboard`) |
| **Patient** | `patient.demo@meditrack.com` | `password123` | Patient dashboard (`/patient/dashboard`) |

---

## API Routes Directory

### Auth Routes (`/api/auth`)
- `GET /me` - Get current authenticated user and role details.
- `POST /register` - Register new patient or doctor account.
- `POST /login` - Password login, returns JWT token and user profile.
- `POST /oauth/google` - Sign in / register with Google OAuth credential.

### Admin Routes (`/api/admin`)
- `GET /dashboard-stats` - Aggregate metrics (doctors, patients, treatments, pending verifications).
- `PUT /profile` & `PATCH /profile` - Update admin profile name and password credentials.
- `GET /doctors` - List all doctors with profile details.
- `GET /doctors/:id` - Fetch single doctor by profile or user ID.
- `POST /doctors` - Create a new doctor account with verification status.
- `PATCH /doctors/:id` - Update doctor profile and credentials.
- `DELETE /doctors/:id` - Permanently delete doctor.
- `PATCH /doctors/:id/verify` - Approve or reject doctor verification with optional reason.
- `GET /patients` - List all patients and QR identifiers.
- `POST /patients` - Create patient with auto-generated QR code.
- `PATCH /patients/:id` - Update patient details.
- `DELETE /patients/:id` - Delete patient account.
- `GET /treatments` - View all consultation records across system.
- `GET /history-requests` - View doctor-patient history access requests.
- `GET /audit-logs` - Inspect system audit logs with IPs.

### Doctor Routes (`/api/doctor`)
- `GET /profile` & `PATCH /profile` - View and update doctor profile.
- `PATCH /password` - Change doctor password.
- `GET /patients` - Attending patient directory.
- `GET /treatments` - Doctor's treatment history.
- `GET /access-requests` - Sent history access requests.
- `GET /patient/:qrId` - Look up patient by QR identifier.
- `POST /access-requests` - Request 24h history access for patient.
- `GET /patient/:id/history` - View patient historical treatments.
- `POST /treatment/draft-from-audio` - Gemini AI extraction from voice/text transcript or audio file.
- `POST /treatment` - Save new treatment (draft or confirmed).
- `PATCH /treatment/:id` - Update/amend existing treatment.
- `POST /verify` - Upload license and qualification documents.

### Patient Routes (`/api/patient`)
- `GET /profile` & `PATCH /profile` - View and update patient profile.
- `PATCH /password` - Change patient password.
- `GET /treatments` - View own confirmed treatment records.
- `GET /access-requests` - View access requests from doctors.
- `PATCH /access-requests/:id` - Approve or deny doctor history access.
