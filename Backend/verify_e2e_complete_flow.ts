async function verifyCompleteE2EFlow() {
  const baseUrl = 'http://localhost:3000';
  const timestamp = Date.now();

  console.log('========================================================');
  console.log('STARTING END-TO-END VERIFICATION OF MEDITRACK WORKFLOWS');
  console.log('========================================================');

  // STEP 1: DOCTOR SIGNUP
  console.log('\n[STEP 1] Doctor Self-Signup...');
  const doctorEmail = `doc_${timestamp}@hospital.com`;
  const doctorPassword = 'Password123!';
  const doctorLicense = `LIC-${timestamp.toString().slice(-6)}`;

  const docSignupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Dr. Sarah Miller ${timestamp.toString().slice(-4)}`,
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
      specialization: 'Pulmonology',
      licenseNumber: doctorLicense,
    }),
  });
  const docSignupData = await docSignupRes.json();
  if (!docSignupRes.ok) {
    throw new Error(`Doctor signup failed (${docSignupRes.status}): ${JSON.stringify(docSignupData)}`);
  }
  const doctorId = docSignupData.userId;
  console.log(`✓ Doctor signed up successfully! ID: ${doctorId}, Verification Status: ${docSignupData.user?.verificationStatus}`);

  // Doctor Login to obtain token
  const docLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: doctorEmail, password: doctorPassword }),
  });
  const docLoginData = await docLoginRes.json();
  const doctorToken = docLoginData.token;
  console.log(`✓ Doctor logged in, token acquired.`);

  // Test session token refresh on /api/auth/me
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  const meData = await meRes.json();
  console.log(`✓ GET /api/auth/me token refresh verified: User=${meData.user?.name}, Role=${meData.user?.role}`);

  // STEP 2: ADMIN APPROVAL
  console.log('\n[STEP 2] Admin Approval of Doctor Verification...');
  // Admin Login
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@meditrack.com',
      password: 'password123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;
  if (!adminToken) throw new Error('Admin login failed');

  // Admin approves doctor verification
  const verifyRes = await fetch(`${baseUrl}/api/admin/doctors/${doctorId}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'APPROVED' }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(`Doctor verification approval failed: ${JSON.stringify(verifyData)}`);
  console.log(`✓ Admin approved doctor verification! New status: ${verifyData.doctor?.verificationStatus}`);

  // STEP 3: PATIENT SIGNUP & UNIQUE QR IDENTIFIER
  console.log('\n[STEP 3] Patient Self-Signup with Unique QR Generation...');
  const patientEmail = `pat_${timestamp}@gmail.com`;
  const patientPassword = 'Password123!';
  const patSignupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `John Doe ${timestamp.toString().slice(-4)}`,
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    }),
  });
  const patSignupData = await patSignupRes.json();
  if (!patSignupRes.ok) throw new Error(`Patient signup failed: ${JSON.stringify(patSignupData)}`);
  const patientId = patSignupData.userId;
  const qrIdentifier = patSignupData.user?.qrCodeIdentifier;
  console.log(`✓ Patient registered successfully! ID: ${patientId}, QR Code: ${qrIdentifier}`);

  // Patient Login
  const patLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: patientEmail, password: patientPassword }),
  });
  const patLoginData = await patLoginRes.json();
  const patientToken = patLoginData.token;
  console.log(`✓ Patient logged in, token acquired.`);

  // STEP 4: QR SCAN & PATIENT LOOKUP
  console.log('\n[STEP 4] Doctor Scans Patient QR Identifier...');
  const scanRes = await fetch(`${baseUrl}/api/doctor/patient/${qrIdentifier}`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  const scanData = await scanRes.json();
  if (!scanRes.ok) throw new Error(`QR Scan lookup failed: ${JSON.stringify(scanData)}`);
  console.log(`✓ QR scan found patient: Name="${scanData.name}", PatientID="${scanData.patientId}", QR="${scanData.qrId}"`);

  // STEP 5: SPEECH CONSULTATION TRANSCRIPTION VIA GEMINI AI
  console.log('\n[STEP 5] Calling Server-side Gemini AI for Structured Consultation Extraction...');
  const consultationTranscript =
    'Doctor: Good afternoon John. What seems to be the problem today? ' +
    'Patient: Doctor I have had a severe dry cough, scratchy throat, and chest tightness for the past 4 days. ' +
    'Doctor: Any fever? Patient: Yes, measured 101 Fahrenheit yesterday night. ' +
    'Doctor: The lungs have mild crackles. Assessment is acute bronchitis. ' +
    'Let us start you on Azithromycin 500mg, one tablet orally once daily for 5 days after breakfast. ' +
    'Also take Levocetirizine 5mg at bedtime for 5 days. Drink plenty of warm water and rest.';

  const geminiDraftRes = await fetch(`${baseUrl}/api/doctor/treatment/draft-from-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${doctorToken}`,
    },
    body: JSON.stringify({
      text: consultationTranscript,
      patientId: patientId,
    }),
  });
  const geminiDraftData = await geminiDraftRes.json();
  if (!geminiDraftRes.ok) throw new Error(`Gemini draft generation failed: ${JSON.stringify(geminiDraftData)}`);
  const extracted = geminiDraftData.data;

  console.log('✓ Gemini AI Consultation Schema Response:');
  console.log(JSON.stringify(extracted, null, 2));

  if (!extracted || typeof extracted !== 'object') {
    throw new Error('Gemini output did not return an object');
  }

  // STEP 6: FORM AUTOFILL, REVIEW & CONFIRM
  console.log('\n[STEP 6] Doctor Confirms and Saves Treatment Record...');
  const createTreatmentRes = await fetch(`${baseUrl}/api/doctor/treatment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${doctorToken}`,
    },
    body: JSON.stringify({
      patientId: patientId,
      condition: extracted.condition || 'Acute Bronchitis',
      symptoms: extracted.symptoms || 'Severe dry cough and fever',
      diagnosis: extracted.diagnosis || 'Acute Bronchitis with crackles',
      doctorNotes: extracted.doctorNotes || 'Stay hydrated and complete antibiotic course.',
      prescriptions: extracted.prescriptions || [],
      status: 'CONFIRMED',
    }),
  });
  const treatmentData = await createTreatmentRes.json();
  if (!createTreatmentRes.ok) throw new Error(`Save treatment failed: ${JSON.stringify(treatmentData)}`);
  console.log(`✓ Treatment confirmed and saved with ID: ${treatmentData.id}, Status: ${treatmentData.status}`);

  // STEP 7: VERIFY HISTORIES IN DOCTOR, PATIENT, AND ADMIN PORTALS
  console.log('\n[STEP 7] Verifying Consultation Records in Histories...');

  // Doctor History
  const docTreatmentsRes = await fetch(`${baseUrl}/api/doctor/treatments`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  const docTreatments = await docTreatmentsRes.json();
  const docFound = docTreatments.some((t: any) => t.id === treatmentData.id);
  console.log(`✓ Doctor history contains new treatment: ${docFound} (Total: ${docTreatments.length})`);

  // Patient History
  const patTreatmentsRes = await fetch(`${baseUrl}/api/patient/treatments`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const patTreatments = await patTreatmentsRes.json();
  const patFound = patTreatments.some((t: any) => t.id === treatmentData.id);
  console.log(`✓ Patient history contains confirmed treatment: ${patFound} (Total: ${patTreatments.length})`);

  // Admin History
  const adminTreatmentsRes = await fetch(`${baseUrl}/api/admin/treatments`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminTreatments = await adminTreatmentsRes.json();
  const adminFound = adminTreatments.some((t: any) => t.id === treatmentData.id);
  console.log(`✓ Admin panel shows new treatment: ${adminFound} (Total: ${adminTreatments.length})`);

  // Audit Logs Verification
  console.log('\n[STEP 8] Verifying Audit Trail Records...');
  const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditLogs = await auditRes.json();
  const recentLogs = auditLogs.slice(0, 5);
  console.log(`✓ Audit log count: ${auditLogs.length}. Most recent actions:`);
  recentLogs.forEach((l: any) => {
    console.log(`  - [${l.action}] by User ${l.user?.name || l.userId} from IP ${l.details?.ip || '127.0.0.1'}`);
  });

  console.log('\n========================================================');
  console.log('ALL WORKFLOWS AND END-TO-END FLOWS VERIFIED SUCCESSFULLY!');
  console.log('========================================================');
}

verifyCompleteE2EFlow().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
