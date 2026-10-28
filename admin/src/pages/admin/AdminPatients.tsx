import { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  QrCode, 
  X,
  AlertTriangle
} from 'lucide-react';
import api from '../../lib/api';

const AdminPatients = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/patients');
      setPatients(response.data);
    } catch (err: any) {
      console.error("Failed to fetch patients", err);
      setError(err.response?.data?.error || 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleCopyQr = (qr: string) => {
    navigator.clipboard.writeText(qr);
    setCopiedId(qr);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.post('/admin/patients', formData);
      showNotification('Patient created successfully with auto-generated QR code');
      setIsCreateOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchPatients();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.patch(`/admin/patients/${selectedPatient.id}`, {
        name: formData.name,
        email: formData.email,
      });
      showNotification('Patient profile updated successfully');
      setIsEditOpen(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to update patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedPatient) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/admin/patients/${selectedPatient.id}`);
      showNotification('Patient deleted successfully');
      setIsDeleteOpen(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (pat: any) => {
    setSelectedPatient(pat);
    setFormData({
      name: pat.name || pat.user?.name || '',
      email: pat.email || pat.user?.email || '',
      password: '',
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const openDeleteModal = (pat: any) => {
    setSelectedPatient(pat);
    setIsDeleteOpen(true);
  };

  const filteredPatients = patients.filter((pat: any) => {
    const name = pat.name || pat.user?.name || '';
    const email = pat.email || pat.user?.email || '';
    const qr = pat.qrCodeIdentifier || pat.patientProfile?.qrCodeIdentifier || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qr.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', email: '', password: '' });
            setFormError('');
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Add Patient
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or QR code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total Patients: {patients.length}
          </span>
        </div>

        {/* Patients Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-80">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="text-center p-8 text-rose-600">{error}</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Patient</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">QR Identifier</th>
                  <th className="px-6 py-4 font-semibold">Registered</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient: any) => {
                  const qr = patient.qrCodeIdentifier || patient.patientProfile?.qrCodeIdentifier || 'N/A';
                  const name = patient.name || patient.user?.name || 'Unnamed';
                  const email = patient.email || patient.user?.email || 'N/A';
                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-blue-100 bg-blue-50 flex items-center justify-center font-bold text-blue-700">
                            {name.charAt(0) || 'P'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{name}</p>
                            <p className="text-xs text-slate-400 font-mono">ID: {patient.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{email}</td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
                          <QrCode className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono text-xs text-slate-700 font-bold">{qr}</span>
                          {qr !== 'N/A' && (
                            <button
                              onClick={() => handleCopyQr(qr)}
                              title="Copy QR identifier"
                              className="text-slate-400 hover:text-emerald-700 transition-colors"
                            >
                              {copiedId === qr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(patient)}
                            title="Edit Patient"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(patient)}
                            title="Delete Patient"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No patients found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE PATIENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-slate-900">Add New Patient</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      {isEditOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-slate-900">Edit Patient Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PATIENT MODAL */}
      {isDeleteOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Delete Patient
              </h3>
              <button onClick={() => setIsDeleteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete patient <span className="font-semibold text-slate-900">{selectedPatient.name || selectedPatient.user?.name}</span>?
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
                disabled={isSubmitting}
                onClick={handleDeleteSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, Delete Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;
