// End-to-end check of patient medical records. Uses a throwaway patient and
// doctor (synctest.*@example.com); everything it creates is removed at the end.
import fs from 'node:fs';
import path from 'node:path';

const API = 'http://localhost:3000/api';
const PRIVATE_DIR = path.resolve('private-uploads/medical-records');
const PUBLIC_DIR = path.resolve('uploads');
const results = {};
const call = async (method, p, token, body, raw = false) => {
  const r = await fetch(API + p, {
    method,
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
  if (raw) return r;
  return { status: r.status, body: await r.json().catch(() => null) };
};
const form = (name, bytes, type, extra = {}) => {
  const f = new FormData();
  f.append('file', new Blob([bytes], { type }), name);
  for (const [k, v] of Object.entries(extra)) f.append(k, v);
  return f;
};
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

const ts = Date.now();
const admin = (await call('POST', '/auth/login', null, { email: 'admin@meditrack.com', password: 'password123' })).body.token;
const pEmail = `synctest.records.patient.${ts}@example.com`, dEmail = `synctest.records.doctor.${ts}@example.com`;
const reg = await call('POST', '/auth/register', null, { name: 'Records Test Patient', email: pEmail, password: 'test1234', role: 'PATIENT' });
const patientId = reg.body.user.id;
const P = (await call('POST', '/auth/login', null, { email: pEmail, password: 'test1234' })).body.token;
await call('POST', '/admin/doctors', admin, { name: 'Records Test Doctor', email: dEmail, password: 'test1234', verificationStatus: 'APPROVED' });
const D = (await call('POST', '/auth/login', null, { email: dEmail, password: 'test1234' })).body.token;
const privateBefore = fs.readdirSync(PRIVATE_DIR).length;
const publicBefore = fs.readdirSync(PUBLIC_DIR).length;

try {
  // Uploads
  const up1 = await call('POST', '/patient/documents', P, form('blood-test.pdf', PDF, 'application/pdf', { title: 'Blood test', category: 'LAB_REPORT' }));
  const up2 = await call('POST', '/patient/documents', P, form('rx.png', PNG, 'image/png', { category: 'PRESCRIPTION' }));
  results.uploadPdf = [up1.status, up1.body?.category, 'fileUrl' in (up1.body || {}) ? 'LEAKS PATH' : 'no storage path exposed'];
  results.uploadPng = [up2.status, up2.body?.title];
  results.storedPrivately = { privateFilesAdded: fs.readdirSync(PRIVATE_DIR).length - privateBefore, publicFilesAdded: fs.readdirSync(PUBLIC_DIR).length - publicBefore };
  // Validation
  results.rejectTxt = (await call('POST', '/patient/documents', P, form('notes.txt', Buffer.from('hello'), 'text/plain'))).body;
  results.rejectFakePdf = (await call('POST', '/patient/documents', P, form('fake.pdf', Buffer.from('not really a pdf'), 'application/pdf'))).body;
  const big = Buffer.alloc(11 * 1024 * 1024); PDF.copy(big);
  const tooBig = await call('POST', '/patient/documents', P, form('huge.pdf', big, 'application/pdf'));
  results.rejectOversize = [tooBig.status, tooBig.body?.error];
  results.privateFilesAfterRejects = fs.readdirSync(PRIVATE_DIR).length - privateBefore;
  // Listing + files
  const list = await call('GET', '/patient/documents', P);
  results.patientList = list.body.map((d) => `${d.title} [${d.category}]`);
  const view = await call('GET', `/patient/documents/${up1.body.id}/file`, P, null, true);
  const dl = await call('GET', `/patient/documents/${up1.body.id}/file?download=1`, P, null, true);
  results.preview = [view.status, view.headers.get('content-type'), view.headers.get('content-disposition')?.split(';')[0]];
  results.download = [dl.status, dl.headers.get('content-disposition')?.split(';')[0]];
  results.noLoginBlocked = (await call('GET', `/patient/documents/${up1.body.id}/file`, null, null, true)).status;
  // Doctor before approval
  results.doctorBeforeApproval = (await call('GET', `/doctor/patient/${patientId}/documents`, D)).status;
  results.doctorFileBeforeApproval = (await call('GET', `/doctor/patient/${patientId}/documents/${up1.body.id}/file`, D, null, true)).status;
  // Request + approve
  await call('POST', '/doctor/access-requests', D, { patientId });
  const reqs = (await call('GET', '/patient/access-requests', P)).body;
  const pending = reqs.find((r) => r.status === 'PENDING');
  results.approve = (await call('PATCH', `/patient/access-requests/${pending.id}`, P, { status: 'APPROVED' })).status;
  const dList = await call('GET', `/doctor/patient/${patientId}/documents`, D);
  results.doctorAfterApproval = [dList.status, dList.body?.length + ' records'];
  const dView = await call('GET', `/doctor/patient/${patientId}/documents/${up1.body.id}/file`, D, null, true);
  const dDl = await call('GET', `/doctor/patient/${patientId}/documents/${up2.body.id}/file?download=1`, D, null, true);
  results.doctorPreview = [dView.status, dView.headers.get('content-type')];
  results.doctorDownload = [dDl.status, dDl.headers.get('content-disposition')?.split(';')[0]];
  results.doctorCannotDelete = [
    (await call('DELETE', `/doctor/patient/${patientId}/documents/${up1.body.id}`, D)).status,
    (await call('DELETE', `/patient/documents/${up1.body.id}`, D)).status,
  ];
  const history = await call('GET', `/doctor/patient/${patientId}/history`, D);
  results.historyIncludesDocs = history.body?.documents?.length;
  // Patient delete removes file
  const before = fs.readdirSync(PRIVATE_DIR).length;
  results.patientDelete = (await call('DELETE', `/patient/documents/${up2.body.id}`, P)).status;
  results.fileRemovedFromDisk = before - fs.readdirSync(PRIVATE_DIR).length === 1;
  await call('DELETE', `/patient/documents/${up1.body.id}`, P);
} catch (e) {
  results.exception = String(e?.stack || e);
} finally {
  const docs = (await call('GET', '/admin/doctors', admin)).body.find((d) => d.user?.email === dEmail);
  if (docs) await call('DELETE', `/admin/doctors/${docs.id}`, admin);
  await call('DELETE', `/admin/patients/${patientId}`, admin);
  results.cleanup = { privateFilesLeft: fs.readdirSync(PRIVATE_DIR).length - privateBefore };
}
console.log(JSON.stringify(results, null, 2));
