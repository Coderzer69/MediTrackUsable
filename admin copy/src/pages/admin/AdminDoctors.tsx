import { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  AlertTriangle,
  Ban
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const AdminDoctors = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    licenseNumber: '',
    verificationStatus: 'APPROVED',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/doctors');
      setDoctors(response.data || []);
    } catch (err: any) {
      console.error("Failed to fetch doctors", err);
      setError(err.response?.data?.error || 'Failed to load doctors list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSuspend = async (docId: string) => {
    try {
      await api.patch(`/admin/doctors/${docId}/verify`, { status: 'SUSPENDED' });
      showNotification('Doctor account suspended');
      fetchDoctors();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to suspend doctor');
    }
  };

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.post('/admin/doctors', formData);
      showNotification('Doctor created successfully');
      setIsCreateOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        specialization: '',
        licenseNumber: '',
        verificationStatus: 'APPROVED',
      });
      fetchDoctors();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.patch(`/admin/doctors/${selectedDoctor.id}`, {
        name: formData.name,
        email: formData.email,
        specialization: formData.specialization,
        licenseNumber: formData.licenseNumber,
        verificationStatus: formData.verificationStatus,
      });
      showNotification('Doctor updated successfully');
      setIsEditOpen(false);
      setSelectedDoctor(null);
      fetchDoctors();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to update doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (docId: string) => {
    try {
      await api.patch(`/admin/doctors/${docId}/verify`, { status: 'APPROVED' });
      showNotification('Doctor approved successfully');
      fetchDoctors();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve doctor');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/admin/doctors/${selectedDoctor.id}/verify`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim() || 'Verification documents do not meet compliance standards.',
      });
      showNotification('Doctor application rejected');
      setIsRejectOpen(false);
      setSelectedDoctor(null);
      setRejectionReason('');
      fetchDoctors();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedDoctor) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/admin/doctors/${selectedDoctor.id}`);
      showNotification('Doctor deleted successfully');
      setIsDeleteOpen(false);
      setSelectedDoctor(null);
      fetchDoctors();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (doc: any) => {
    setSelectedDoctor(doc);
    setFormData({
      name: doc.user?.name || '',
      email: doc.user?.email || '',
      password: '',
      specialization: doc.specialization || '',
      licenseNumber: doc.licenseNumber || '',
      verificationStatus: doc.verificationStatus || 'APPROVED',
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const openRejectModal = (doc: any) => {
    setSelectedDoctor(doc);
    setRejectionReason(doc.rejectionReason || '');
    setIsRejectOpen(true);
  };

  const openDeleteModal = (doc: any) => {
    setSelectedDoctor(doc);
    setIsDeleteOpen(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'PENDING': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'SUSPENDED': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'INCOMPLETE': return 'bg-blue-50 text-blue-700 border border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };

  const statusCounts = doctors.reduce(
    (acc: Record<string, number>, doc: any) => {
      const s = doc.verificationStatus;
      if (s) {
        acc[s] = (acc[s] || 0) + 1;
      }
      return acc;
    },
    { APPROVED: 0, PENDING: 0, REJECTED: 0, SUSPENDED: 0, INCOMPLETE: 0 }
  );

  const filteredDoctors = doctors.filter((doc: any) => {
    const matchesStatus = statusFilter === 'all' || doc.verificationStatus === statusFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (doc.user?.name?.toLowerCase().includes(term)) ||
      (doc.user?.email?.toLowerCase().includes(term)) ||
      (doc.licenseNumber?.toLowerCase().includes(term)) ||
      (doc.specialization?.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Doctors</h1>
        </div>
        <button
          onClick={() => {
            setFormData({
              name: '',
              email: '',
              password: '',
              specialization: '',
              licenseNumber: '',
              verificationStatus: 'APPROVED',
            });
            setFormError('');
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Add Doctor
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, specialization, license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Statuses ({doctors.length})</option>
              <option value="APPROVED">Approved ({statusCounts.APPROVED || 0})</option>
              <option value="PENDING">Pending ({statusCounts.PENDING || 0})</option>
              <option value="REJECTED">Rejected ({statusCounts.REJECTED || 0})</option>
              <option value="SUSPENDED">Suspended ({statusCounts.SUSPENDED || 0})</option>
              <option value="INCOMPLETE">Incomplete ({statusCounts.INCOMPLETE || 0})</option>
            </select>
          </div>
        </div>

        {/* Table */}
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
                  <th className="px-6 py-4 font-semibold">Doctor</th>
                  <th className="px-6 py-4 font-semibold">Specialization</th>
                  <th className="px-6 py-4 font-semibold">License No.</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.map((doc: any) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-emerald-100 bg-emerald-50 flex items-center justify-center font-bold text-emerald-700">
                          {doc.user?.name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{doc.user?.name}</p>
                          <p className="text-xs text-slate-500">{doc.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{doc.specialization || 'General Practice'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{doc.licenseNumber || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(doc.verificationStatus)}`}>
                        {doc.verificationStatus}
                      </span>
                      {doc.rejectionReason && doc.verificationStatus === 'REJECTED' && (
                        <p className="text-[11px] text-rose-600 mt-1 truncate max-w-[200px]" title={doc.rejectionReason}>
                          Reason: {doc.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.verificationStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(doc.id)}
                              title="Approve verification"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openRejectModal(doc)}
                              title="Reject with reason"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {doc.verificationStatus === 'SUSPENDED' && (
                          <button
                            onClick={() => handleApprove(doc.id)}
                            title="Unsuspend / Reactivate Doctor"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {doc.verificationStatus === 'APPROVED' && (
                          <button
                            onClick={() => handleSuspend(doc.id)}
                            title="Suspend Doctor"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/admin/doctors/${doc.id}`)}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(doc)}
                          title="Edit Doctor"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(doc)}
                          title="Delete Doctor"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDoctors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Search className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No doctors matching the current filter.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {statusFilter !== 'all'
                            ? `There are currently ${statusCounts[statusFilter] || 0} doctors with "${statusFilter}" status.`
                            : 'No doctors match your search query.'}
                        </p>
                        {(statusFilter !== 'all' || searchTerm) && (
                          <button
                            onClick={() => {
                              setStatusFilter('all');
                              setSearchTerm('');
                            }}
                            className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Reset Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE DOCTOR MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-slate-900">Create New Doctor</h3>
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
                  placeholder="Dr. Gregory House"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@hospital.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    placeholder="Cardiology / General"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">License Number</label>
                  <input
                    type="text"
                    placeholder="MED-12345"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Status</label>
                <select
                  value={formData.verificationStatus}
                  onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="APPROVED">APPROVED (Active immediately)</option>
                  <option value="PENDING">PENDING (Requires review)</option>
                </select>
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
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCTOR MODAL */}
      {isEditOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-slate-900">Edit Doctor</h3>
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
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">License Number</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Verification Status</label>
                <select
                  value={formData.verificationStatus}
                  onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="INCOMPLETE">INCOMPLETE</option>
                </select>
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
                  Update Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT WITH REASON MODAL */}
      {isRejectOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Reject Doctor Application
              </h3>
              <button onClick={() => setIsRejectOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Provide a clear reason for rejecting <span className="font-semibold text-slate-900">{selectedDoctor.user?.name}</span>. This explanation will be displayed to the doctor upon logging in.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Uploaded medical license is expired or illegible. Please submit updated registration certificate."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
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
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Delete Doctor
              </h3>
              <button onClick={() => setIsDeleteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete doctor <span className="font-semibold text-slate-900">{selectedDoctor.user?.name}</span> ({selectedDoctor.user?.email})? All associated records will be purged.
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
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, Delete Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctors;
