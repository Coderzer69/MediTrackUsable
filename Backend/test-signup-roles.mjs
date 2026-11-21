// Checks that sign-up keeps each email in its own role. Creates one throwaway
// patient (synctest.*@example.com) and deletes it again at the end.
const API = 'http://localhost:3000/api';
const post = async (path, body, token) => {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const results = {};
// 1. Patient sign-up with a Google account that is already a doctor -> refused, not logged in as doctor
const r1 = await post('/auth/oauth-login', { isGoogleAuth: true, email: 'surgeprime85@gmail.com', name: 'x', role: 'PATIENT' });
results.patientSignupWithDoctorGoogle = { status: r1.status, gotToken: !!r1.body?.token, message: r1.body?.error };
// 2. Doctor sign-up with a patient's Google account -> refused, role unchanged
const r2 = await post('/auth/oauth-login', { isGoogleAuth: true, email: 'patient@meditrack.com', name: 'x', role: 'DOCTOR' });
results.doctorSignupWithPatientGoogle = { status: r2.status, gotToken: !!r2.body?.token };
const p = await post('/auth/login', { email: 'patient@meditrack.com', password: 'password123' });
results.patientStillPatient = p.body?.user?.role;
// 3. Normal email patient sign-up -> patient
const email = `synctest.signup.${Date.now()}@example.com`;
const reg = await post('/auth/register', { name: 'Signup Test Patient', email, password: 'test1234', role: 'PATIENT' });
const log = await post('/auth/login', { email, password: 'test1234' });
results.emailPatientSignup = { register: reg.status, role: log.body?.user?.role, hasQr: !!log.body?.user?.qrCodeIdentifier };
// 4. Registering the same email again -> clear message
const dup = await post('/auth/register', { name: 'x', email, password: 'test1234', role: 'PATIENT' });
results.duplicateEmail = { status: dup.status, message: dup.body?.error };
// cleanup
const admin = await post('/auth/login', { email: 'admin@meditrack.com', password: 'password123' });
const del = await fetch(`${API}/admin/patients/${reg.body?.user?.id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + admin.body?.token } });
results.cleanupDeleted = del.status;
console.log(JSON.stringify(results, null, 2));
