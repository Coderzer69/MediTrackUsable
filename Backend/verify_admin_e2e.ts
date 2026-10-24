const API_BASE = 'http://localhost:3000/api';

async function request(path: string, options: any = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data?.error || res.statusText || 'Request failed';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { status: res.status, data };
}

async function runAdminVerification() {
  console.log('====================================================');
  console.log('   STARTING ADMIN PANEL END-TO-END VERIFICATION    ');
  console.log('====================================================\n');

  try {
    // 1. Admin Login
    console.log('[1/7] Testing Admin Login...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@meditrack.com',
        password: 'password123',
      },
    });

    const { token, user: adminUser } = loginRes.data;
    if (!token || adminUser.role !== 'ADMIN') {
      throw new Error(`Login failed or user is not ADMIN: ${JSON.stringify(loginRes.data)}`);
    }
    console.log(`✓ Admin logged in successfully as: ${adminUser.name} (${adminUser.email})`);

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Token Refresh / Verify Me
    console.log('\n[2/7] Testing GET /api/auth/me...');
    const meRes = await request('/auth/me', { headers: authHeaders });
    if (!meRes.data.user || meRes.data.user.role !== 'ADMIN') {
      throw new Error(`GET /auth/me did not return admin user: ${JSON.stringify(meRes.data)}`);
    }
    console.log(`✓ Token verified: ${meRes.data.user.name} (${meRes.data.user.role})`);

    // 3. Dashboard Stats
    console.log('\n[3/7] Testing GET /api/admin/dashboard-stats...');
    const statsRes = await request('/admin/dashboard-stats', { headers: authHeaders });
    console.log('✓ Dashboard Stats:', statsRes.data);

    // 4. Doctor CRUD & Verification Workflow
    console.log('\n[4/7] Testing Doctor CRUD & Approval/Rejection Workflow...');
    const testDocEmail = `test.doc.${Date.now()}@meditrack.test`;

    // 4a. Create Doctor
    const createDocRes = await request('/admin/doctors', {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: 'Dr. Automated Tester',
        email: testDocEmail,
        password: 'DocPassword123!',
        specialization: 'Neurology',
        licenseNumber: `LIC-${Date.now()}`,
        verificationStatus: 'PENDING',
      },
    });
    const doctorProfile = createDocRes.data.doctor;
    const doctorId = doctorProfile.id;
    console.log(`✓ Doctor created: ID ${doctorId}, Status: ${doctorProfile.verificationStatus}`);

    // 4b. Get Doctor by ID
    const getDocRes = await request(`/admin/doctors/${doctorId}`, { headers: authHeaders });
    console.log(`✓ Fetched doctor by ID: ${getDocRes.data.user?.name} - ${getDocRes.data.specialization}`);

    // 4c. Update Doctor Details
    const updateDocRes = await request(`/admin/doctors/${doctorId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        name: 'Dr. Automated Tester (Updated)',
        specialization: 'Pediatric Neurology',
      },
    });
    console.log(`✓ Doctor updated: ${updateDocRes.data.message}`);

    // 4d. Reject Doctor with Reason
    const rejectionReason = 'Medical registration council verification certificate illegible';
    const rejectRes = await request(`/admin/doctors/${doctorId}/verify`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        status: 'REJECTED',
        rejectionReason: rejectionReason,
      },
    });
    if (rejectRes.data.doctor?.rejectionReason !== rejectionReason) {
      throw new Error(`Rejection reason not stored properly: ${JSON.stringify(rejectRes.data)}`);
    }
    console.log(`✓ Doctor rejected with custom reason: "${rejectRes.data.doctor.rejectionReason}"`);

    // 4e. Approve Doctor
    const approveRes = await request(`/admin/doctors/${doctorId}/verify`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        status: 'APPROVED',
      },
    });
    if (approveRes.data.doctor?.verificationStatus !== 'APPROVED') {
      throw new Error(`Doctor status not APPROVED: ${JSON.stringify(approveRes.data)}`);
    }
    console.log(`✓ Doctor verified & APPROVED! Verified by Admin ID: ${approveRes.data.doctor.verifiedById}`);

    // 4f. Delete Doctor
    const delDocRes = await request(`/admin/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log(`✓ Doctor deleted successfully: ${delDocRes.data.message}`);

    // 5. Patient CRUD Workflow
    console.log('\n[5/7] Testing Patient CRUD & QR Identification Workflow...');
    const testPatEmail = `test.patient.${Date.now()}@meditrack.test`;

    // 5a. Create Patient
    const createPatRes = await request('/admin/patients', {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: 'Patient Auto Test',
        email: testPatEmail,
        password: 'PatientPass123!',
      },
    });
    const createdPatient = createPatRes.data.patient;
    const patientId = createdPatient.id;
    if (!createdPatient.qrCodeIdentifier) {
      throw new Error(`Patient created without qrCodeIdentifier! ${JSON.stringify(createdPatient)}`);
    }
    console.log(`✓ Patient created with QR Identifier: "${createdPatient.qrCodeIdentifier}"`);

    // 5b. Update Patient
    const updatePatRes = await request(`/admin/patients/${patientId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        name: 'Patient Auto Test (Updated)',
      },
    });
    console.log(`✓ Patient updated: ${updatePatRes.data.message}`);

    // 5c. Delete Patient
    const delPatRes = await request(`/admin/patients/${patientId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log(`✓ Patient deleted: ${delPatRes.data.message}`);

    // 6. Inspect Admin Views: Treatments, History Requests & Audit Logs
    console.log('\n[6/7] Testing Admin Views (Treatments, History Requests, Audit Logs)...');
    const [treatmentsRes, requestsRes, logsRes] = await Promise.all([
      request('/admin/treatments', { headers: authHeaders }),
      request('/admin/history-requests', { headers: authHeaders }),
      request('/admin/audit-logs', { headers: authHeaders }),
    ]);

    console.log(`✓ Treatments retrieved: ${treatmentsRes.data.length}`);
    console.log(`✓ History Access Requests retrieved: ${requestsRes.data.length}`);
    console.log(`✓ Audit Logs retrieved: ${logsRes.data.length}`);

    // Verify recent audit log
    const recentAudit = logsRes.data[0];
    console.log(`✓ Latest Audit Event: "${recentAudit.action}" by ${recentAudit.user?.name || 'System'} (${recentAudit.user?.role})`);

    // 7. Test Admin Profile Update
    console.log('\n[7/7] Testing PUT /api/admin/profile...');
    const profileRes = await request('/admin/profile', {
      method: 'PUT',
      headers: authHeaders,
      body: {
        name: 'Super Admin Updated',
      },
    });
    console.log(`✓ Admin profile updated: ${profileRes.data.user.name}`);

    // Revert admin name
    await request('/admin/profile', {
      method: 'PUT',
      headers: authHeaders,
      body: {
        name: 'Super Administrator',
      },
    });
    console.log('✓ Restored Super Administrator name');

    console.log('\n====================================================');
    console.log('   ALL ADMIN PANEL WORKFLOWS & APIs PASSED 100%!    ');
    console.log('====================================================');
  } catch (err: any) {
    console.error('\n❌ Admin Verification Error:', err.data || err.message);
    process.exit(1);
  }
}

runAdminVerification();
