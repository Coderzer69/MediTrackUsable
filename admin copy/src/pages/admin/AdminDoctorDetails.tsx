import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Loader2, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Trash2, 
  X,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { BACKEND_URL } from '../../lib/api';

const AdminDoctorDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Rejection modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    specialization: '',
    licenseNumber: '',
  });

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      // Try direct endpoint first
      try {
        const response = await api.get(`/admin/doctors/${id}`);
        if (response.data) {
          setDoctor(response.data);
          return;
        }
      } catch (e) {
        // Fallback to searching the list
        const response = await api.get('/admin/doctors');
        const found = response.data.find((d: any) => d.id === id || d.userId === id);
        if (found) {
          setDoctor(found);
          return;
        }
      }
      setError('Doctor not found.');
    } catch (err: any) {
      console.error("Failed to fetch doctor", err);
      setError(err.response?.data?.error || 'Failed to load doctor details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleVerify = async (status: string, reason?: string) => {
    if (!id) return;
    setIsUpdating(true);
    try {
      const payload: any = { status };
      if (status === 'REJECTED') {
        payload.rejectionReason = reason || rejectionReason.trim() || 'Application documents did not meet requirements.';
      }
      const res = await api.patch(`/admin/doctors/${id}/verify`, payload);
      setDoctor(res.data.doctor || { ...doctor, verificationStatus: status, rejectionReason: payload.rejectionReason });
      showNotification(`Doctor status updated to ${status}`);
      setIsRejectOpen(false);
      setRejectionReason('');
    } catch (err: any) {
      console.error("Failed to update status", err);
      alert(err.response?.data?.error || 'Failed to update doctor status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsUpdating(true);
    try {
      await api.patch(`/admin/doctors/${id}`, editForm);
      showNotification('Doctor updated successfully');
      setIsEditOpen(false);
      fetchDoctor();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update doctor');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await api.delete(`/admin/doctors/${id}`);
      showNotification('Doctor deleted successfully');
      navigate('/admin/doctors');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete doctor');
      setIsUpdating(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      name: doctor.user?.name || '',
      email: doctor.user?.email || '',
      specialization: doctor.specialization || '',
      licenseNumber: doctor.licenseNumber || '',
    });
    setIsEditOpen(true);
  };

  const getDocumentUrl = (docPath: string | null | undefined) => {
    if (!docPath) return '#';
    if (docPath.startsWith('http://') || docPath.startsWith('https://')) return docPath;
    const cleanPath = docPath.startsWith('/uploads/')
      ? docPath.slice(9)
      : docPath.startsWith('uploads/')
      ? docPath.slice(8)
      : docPath;
    return `${BACKEND_URL}/uploads/${cleanPath}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="p-8 text-center text-rose-600 font-medium">
        <p>{error || 'Doctor not found'}</p>
        <button
          onClick={() => navigate('/admin/doctors')}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
        >
          Return to Doctors List
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <button
        onClick={() => navigate('/admin/doctors')}
        className="flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Doctors
      </button>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Doctor Details</h1>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          {doctor.verificationStatus !== 'SUSPENDED' && (
            <button
              onClick={() => handleVerify('SUSPENDED')}
              disabled={isUpdating}
              className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors shadow-sm disabled:opacity-50"
            >
              Suspend
            </button>
          )}

          {doctor.verificationStatus !== 'REJECTED' && (
            <button
              onClick={() => {
                setRejectionReason(doctor.rejectionReason || '');
                setIsRejectOpen(true);
              }}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Reject / Deactivate
            </button>
          )}

          {doctor.verificationStatus !== 'APPROVED' && (
            <button
              onClick={() => handleVerify('APPROVED')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Approve Doctor
            </button>
          )}
        </div>
      </div>

      {/* Rejection Alert Banner if currently rejected */}
      {doctor.verificationStatus === 'REJECTED' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-800">Verification Rejected</h4>
            <p className="text-sm text-rose-700 mt-1">
              {doctor.rejectionReason || 'No specific rejection reason provided.'}
            </p>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl border border-emerald-100 bg-emerald-50 flex items-center justify-center font-bold text-emerald-800 text-3xl">
              {doctor.user?.name?.charAt(0) || 'D'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">{doctor.user?.name}</h2>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                  doctor.verificationStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  doctor.verificationStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  doctor.verificationStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  doctor.verificationStatus === 'SUSPENDED' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {doctor.verificationStatus}
                </span>
              </div>
              <p className="text-slate-600 font-semibold">{doctor.specialization || 'General Practitioner'}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                <p>License: <span className="font-mono text-slate-700 font-medium">{doctor.licenseNumber || 'N/A'}</span></p>
                <p>Email: <span className="text-slate-700 font-medium">{doctor.user?.email}</span></p>
              </div>
            </div>
          </div>

          <div className="text-sm space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 min-w-[220px]">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Account ID:</span>
              <span className="font-mono text-xs text-slate-700">{doctor.userId?.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Verified By:</span>
              <span className="font-semibold text-slate-700">{doctor.verifiedById ? 'System Admin' : 'Pending'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6">
          {[
            { id: 'profile', label: 'Profile Details' },
            { id: 'documents', label: 'Verification Documents' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Account & Verification Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Full Name', value: doctor.user?.name },
                  { label: 'Registered Email', value: doctor.user?.email },
                  { label: 'Clinical Specialization', value: doctor.specialization },
                  { label: 'Medical Registration / License', value: doctor.licenseNumber },
                  { label: 'Verification Status', value: doctor.verificationStatus },
                  { label: 'Rejection Reason', value: doctor.rejectionReason || 'None' },
                  { label: 'Registered On', value: doctor.user?.createdAt ? new Date(doctor.user.createdAt).toLocaleDateString() : 'N/A' },
                ].map((item, i) => (
                  <div key={i} className="grid grid-cols-3 py-3 border-b border-slate-100 last:border-0">
                    <div className="text-sm text-slate-500 font-medium">{item.label}</div>
                    <div className="col-span-2 text-sm text-slate-900 font-semibold">{item.value || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Uploaded Compliance Documents</h3>

              {!doctor.verificationDocumentUrl && !doctor.qualificationDocumentUrl ? (
                <div className="text-slate-500 bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p>No verification documents uploaded by this doctor yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {doctor.verificationDocumentUrl && (
                    <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
                      <div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase">Primary</span>
                        <h4 className="font-bold text-slate-900 text-base mt-2">Medical License / ID Proof</h4>
                        <p className="text-xs text-slate-500 mt-1 font-mono truncate">{doctor.verificationDocumentUrl}</p>
                      </div>
                      <a
                        href={getDocumentUrl(doctor.verificationDocumentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Document
                      </a>
                    </div>
                  )}

                  {doctor.qualificationDocumentUrl && (
                    <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
                      <div>
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full uppercase">Credentials</span>
                        <h4 className="font-bold text-slate-900 text-base mt-2">Qualification Certificate</h4>
                        <p className="text-xs text-slate-500 mt-1 font-mono truncate">{doctor.qualificationDocumentUrl}</p>
                      </div>
                      <a
                        href={getDocumentUrl(doctor.qualificationDocumentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Qualification
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* REJECT MODAL */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Reject Verification
              </h3>
              <button onClick={() => setIsRejectOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Provide a reason for rejecting <span className="font-semibold text-slate-900">{doctor.user?.name}</span>. The doctor will see this feedback in their verification screen.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Uploaded registration certificate is expired. Please re-upload current registration."
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleVerify('REJECTED', rejectionReason)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-slate-900">Edit Doctor Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Specialization</label>
                <input
                  type="text"
                  value={editForm.specialization}
                  onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">License Number</label>
                <input
                  type="text"
                  value={editForm.licenseNumber}
                  onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Delete Doctor Account
              </h3>
              <button onClick={() => setIsDeleteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete doctor <span className="font-semibold text-slate-900">{doctor.user?.name}</span>? This action is permanent and cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleDeleteDoctor}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctorDetails;
