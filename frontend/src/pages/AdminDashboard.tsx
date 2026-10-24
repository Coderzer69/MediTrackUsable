import { useState, useEffect } from 'react';
import {
  Users, Activity, ClipboardList, ShieldCheck,
  CheckCircle, XCircle, Eye, Menu, X,
  Plus, Edit2, Trash2, ShieldAlert, FileText, ScrollText,
  Search, RefreshCw, AlertCircle
} from 'lucide-react';
import api, { BACKEND_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'doctors' | 'patients' | 'treatments' | 'audit-logs'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorBanner, setErrorBanner] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Modals state
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [doctorModalMode, setDoctorModalMode] = useState<'add' | 'edit'>('add');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    licenseNumber: '',
    verificationStatus: 'APPROVED',
  });

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingDoctor, setRejectingDoctor] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [patientModalMode, setPatientModalMode] = useState<'add' | 'edit'>('add');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientForm, setPatientForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'doctor' | 'patient'; id: string; name: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorBanner('');
    try {
      if (activeTab === 'dashboard') {
        const res = await api.get('/admin/dashboard-stats');
        setStats(res.data);
      } else if (activeTab === 'doctors') {
        const res = await api.get('/admin/doctors');
        setDoctors(res.data);
      } else if (activeTab === 'patients') {
        const res = await api.get('/admin/patients');
        setPatients(res.data);
      } else if (activeTab === 'treatments') {
        const res = await api.get('/admin/treatments');
        setTreatments(res.data);
      } else if (activeTab === 'audit-logs') {
        const res = await api.get('/admin/audit-logs');
        setAuditLogs(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin data', err);
      setErrorBanner(err.response?.data?.error || 'Failed to load data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(''), 4500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(''), 4000);
    }
  };

  // Doctor Actions
  const handleVerifyDoctor = async (doctorId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/doctors/${doctorId}/verify`, {
        status,
        rejectionReason: reason || undefined,
      });
      showNotification(`Doctor status updated to ${status}.`);
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchData();
    } catch (err: any) {
      console.error('Failed to verify doctor', err);
      showNotification(err.response?.data?.error || 'Failed to update doctor verification', true);
    } finally {
      setActionLoading(false);
    }
  };

  const openAddDoctor = () => {
    setDoctorModalMode('add');
    setSelectedDoctor(null);
    setDoctorForm({
      name: '',
      email: '',
      password: '',
      specialization: '',
      licenseNumber: '',
      verificationStatus: 'APPROVED',
    });
    setDoctorModalOpen(true);
  };

  const openEditDoctor = (doc: any) => {
    setDoctorModalMode('edit');
    setSelectedDoctor(doc);
    setDoctorForm({
      name: doc.user?.name || '',
      email: doc.user?.email || '',
      password: '',
      specialization: doc.specialization || '',
      licenseNumber: doc.licenseNumber || '',
      verificationStatus: doc.verificationStatus || 'APPROVED',
    });
    setDoctorModalOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (doctorModalMode === 'add') {
        await api.post('/admin/doctors', doctorForm);
        showNotification('Doctor created successfully.');
      } else {
        await api.patch(`/admin/doctors/${selectedDoctor.id}`, {
          name: doctorForm.name,
          email: doctorForm.email,
          specialization: doctorForm.specialization,
          licenseNumber: doctorForm.licenseNumber,
          verificationStatus: doctorForm.verificationStatus,
        });
        showNotification('Doctor updated successfully.');
      }
      setDoctorModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save doctor', err);
      showNotification(err.response?.data?.error || 'Failed to save doctor', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Patient Actions
  const openAddPatient = () => {
    setPatientModalMode('add');
    setSelectedPatient(null);
    setPatientForm({
      name: '',
      email: '',
      password: '',
    });
    setPatientModalOpen(true);
  };

  const openEditPatient = (pat: any) => {
    setPatientModalMode('edit');
    setSelectedPatient(pat);
    setPatientForm({
      name: pat.name || pat.user?.name || '',
      email: pat.email || pat.user?.email || '',
      password: '',
    });
    setPatientModalOpen(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (patientModalMode === 'add') {
        await api.post('/admin/patients', patientForm);
        showNotification('Patient created successfully with auto-generated QR identifier.');
      } else {
        await api.patch(`/admin/patients/${selectedPatient.id}`, {
          name: patientForm.name,
          email: patientForm.email,
        });
        showNotification('Patient updated successfully.');
      }
      setPatientModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save patient', err);
      showNotification(err.response?.data?.error || 'Failed to save patient', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Action
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      if (deleteTarget.type === 'doctor') {
        await api.delete(`/admin/doctors/${deleteTarget.id}`);
        showNotification('Doctor account deleted successfully.');
      } else {
        await api.delete(`/admin/patients/${deleteTarget.id}`);
        showNotification('Patient account deleted successfully.');
      }
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete', err);
      showNotification(err.response?.data?.error || 'Failed to delete record', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setSearchTerm('');
    setSidebarOpen(false);
  };

  // Filter lists
  const filteredDoctors = doctors.filter((doc: any) => {
    const term = searchTerm.toLowerCase();
    return (
      (doc.user?.name && doc.user.name.toLowerCase().includes(term)) ||
      (doc.user?.email && doc.user.email.toLowerCase().includes(term)) ||
      (doc.licenseNumber && doc.licenseNumber.toLowerCase().includes(term)) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(term))
    );
  });

  const filteredPatients = patients.filter((pat: any) => {
    const term = searchTerm.toLowerCase();
    const name = pat.name || pat.user?.name || '';
    const email = pat.email || pat.user?.email || '';
    const qr = pat.qrCodeIdentifier || '';
    return name.toLowerCase().includes(term) || email.toLowerCase().includes(term) || qr.toLowerCase().includes(term);
  });

  const filteredTreatments = treatments.filter((t: any) => {
    const term = searchTerm.toLowerCase();
    const docName = t.doctor?.name || '';
    const patName = t.patient?.name || '';
    const condition = t.condition || '';
    return docName.toLowerCase().includes(term) || patName.toLowerCase().includes(term) || condition.toLowerCase().includes(term);
  });

  const filteredLogs = auditLogs.filter((l: any) => {
    const term = searchTerm.toLowerCase();
    const action = l.action || '';
    const userName = l.user?.name || '';
    const ip = l.details?.ip || '';
    return action.toLowerCase().includes(term) || userName.toLowerCase().includes(term) || ip.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex w-full font-sans text-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-40 lg:z-auto
        w-[270px] bg-white border-r border-gray-100 flex flex-col h-screen
        transition-transform duration-300 ease-in-out shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 lg:p-7 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0b3b2c] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[20px] font-extrabold text-[#0b3b2c] tracking-tight block leading-tight">MediAdmin</span>
              <span className="text-[11px] font-semibold text-gray-400">Control Center</span>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 overflow-y-auto">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[14px] transition-colors w-full text-left ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Activity className="w-[18px] h-[18px]" />
            Dashboard Overview
          </button>
          <button
            onClick={() => handleTabChange('doctors')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[14px] transition-colors w-full text-left ${activeTab === 'doctors' ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users className="w-[18px] h-[18px]" />
            Manage Doctors
          </button>
          <button
            onClick={() => handleTabChange('patients')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[14px] transition-colors w-full text-left ${activeTab === 'patients' ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ClipboardList className="w-[18px] h-[18px]" />
            Manage Patients
          </button>
          <button
            onClick={() => handleTabChange('treatments')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[14px] transition-colors w-full text-left ${activeTab === 'treatments' ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText className="w-[18px] h-[18px]" />
            All Treatments
          </button>
          <button
            onClick={() => handleTabChange('audit-logs')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[14px] transition-colors w-full text-left ${activeTab === 'audit-logs' ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ScrollText className="w-[18px] h-[18px]" />
            Audit Logs
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 mt-auto">
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-[72px] px-4 sm:px-8 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-800 capitalize hidden sm:block">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{user?.name || 'Administrator'}</div>
                <div className="text-[11px] font-medium text-emerald-700">Root Access</div>
              </div>
            </div>
          </div>
        </header>

        {/* Alerts */}
        {errorBanner && (
          <div className="mx-4 sm:mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}
        {successBanner && (
          <div className="mx-4 sm:mx-8 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-sm text-emerald-800 font-medium">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          <div className="max-w-[1240px] mx-auto">

            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">System Overview</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Real-time statistics across all users and treatments.</p>
                  </div>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                    <p>Loading system statistics...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[13px] font-semibold text-gray-500 mb-1">Total Doctors</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{stats?.totalDoctors || 0}</h3>
                      <p className="text-[12px] text-emerald-600 font-medium mt-1">{stats?.approvedDoctors || 0} Verified</p>
                    </div>
                    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[13px] font-semibold text-gray-500 mb-1">Pending Verifications</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-orange-600">{stats?.pendingDoctors || 0}</h3>
                      <button
                        onClick={() => handleTabChange('doctors')}
                        className="text-[12px] font-bold text-orange-600 hover:underline mt-1 block"
                      >
                        Review applications →
                      </button>
                    </div>
                    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[13px] font-semibold text-gray-500 mb-1">Total Patients</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{stats?.totalPatients || 0}</h3>
                      <p className="text-[12px] text-gray-400 font-medium mt-1">Unique QR Identifiers</p>
                    </div>
                    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[13px] font-semibold text-gray-500 mb-1">Total Treatments</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats?.totalTreatments || 0}</h3>
                      <button
                        onClick={() => handleTabChange('treatments')}
                        className="text-[12px] font-bold text-emerald-700 hover:underline mt-1 block"
                      >
                        View all records →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB: MANAGE DOCTORS */}
            {activeTab === 'doctors' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Manage Doctors</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Approve, reject, create, edit, or remove medical personnel.</p>
                  </div>
                  <button
                    onClick={openAddDoctor}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b3b2c] hover:bg-[#082a1f] text-white font-bold text-sm rounded-xl transition-colors shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" /> Add Doctor
                  </button>
                </div>

                {/* Filter / Search Bar */}
                <div className="mb-4 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by doctor name, email, specialization, or license..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                    <p>Loading doctors...</p>
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <p className="text-gray-500 font-medium">No doctors found matching your query.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[760px]">
                        <thead className="bg-gray-50/70 border-b border-gray-100">
                          <tr>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Doctor</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">License</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Specialization</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Documents</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredDoctors.map((doc: any) => (
                            <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-[14px] font-bold text-gray-900">{doc.user?.name || 'Unnamed Doctor'}</div>
                                <div className="text-[12px] text-gray-500">{doc.user?.email}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-[13.5px] text-gray-700 font-medium">
                                {doc.licenseNumber || '—'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-[13.5px] text-gray-700">
                                {doc.specialization || 'General'}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md uppercase ${
                                    doc.verificationStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' :
                                    doc.verificationStatus === 'PENDING' ? 'bg-orange-50 text-orange-700' :
                                    'bg-red-50 text-red-700'
                                  }`}>
                                    {doc.verificationStatus}
                                  </span>
                                  {doc.verificationStatus === 'REJECTED' && doc.rejectionReason && (
                                    <span className="text-[11px] text-red-600 italic max-w-[200px] truncate" title={doc.rejectionReason}>
                                      Reason: {doc.rejectionReason}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {doc.verificationDocumentUrl ? (
                                    <a
                                      href={`${BACKEND_URL}/uploads/${doc.verificationDocumentUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="View License File"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-400">None</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {doc.verificationStatus === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => handleVerifyDoctor(doc.id, 'APPROVED')}
                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Approve Verification"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setRejectingDoctor(doc);
                                          setRejectionReason('');
                                          setRejectModalOpen(true);
                                        }}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Reject with Reason"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => openEditDoctor(doc)}
                                    className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Edit Doctor Details"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: 'doctor',
                                        id: doc.id,
                                        name: doc.user?.name || 'Doctor',
                                      });
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Doctor"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB: MANAGE PATIENTS */}
            {activeTab === 'patients' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Manage Patients</h1>
                    <p className="text-sm text-gray-500 mt-0.5">View and manage registered patients and their QR code identifiers.</p>
                  </div>
                  <button
                    onClick={openAddPatient}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b3b2c] hover:bg-[#082a1f] text-white font-bold text-sm rounded-xl transition-colors shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" /> Add Patient
                  </button>
                </div>

                <div className="mb-4 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by patient name, email, or QR identifier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                    <p>Loading patients...</p>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <p className="text-gray-500 font-medium">No patients found matching your query.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[640px]">
                        <thead className="bg-gray-50/70 border-b border-gray-100">
                          <tr>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Unique QR Identifier</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Registered On</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredPatients.map((pat: any) => (
                            <tr key={pat.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-[14px] font-bold text-gray-900">{pat.name || pat.user?.name}</div>
                                <div className="text-[12px] text-gray-500">{pat.email || pat.user?.email}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-md">
                                  {pat.qrCodeIdentifier || pat.patientProfile?.qrCodeIdentifier || '—'}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-[13px] text-gray-600">
                                {pat.createdAt ? new Date(pat.createdAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditPatient(pat)}
                                    className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Edit Patient"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: 'patient',
                                        id: pat.id,
                                        name: pat.name || pat.user?.name || 'Patient',
                                      });
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Patient"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB: ALL TREATMENTS */}
            {activeTab === 'treatments' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">All Treatments</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Clinical consultation records created by verified doctors.</p>
                  </div>
                </div>

                <div className="mb-4 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by doctor, patient, or medical condition..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                    <p>Loading treatments...</p>
                  </div>
                ) : filteredTreatments.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <p className="text-gray-500 font-medium">No treatment records recorded yet.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[760px]">
                        <thead className="bg-gray-50/70 border-b border-gray-100">
                          <tr>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Doctor</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Condition & Diagnosis</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredTreatments.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 sm:px-6 py-4 text-xs font-semibold text-gray-600">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900">
                                Dr. {t.doctor?.name || 'Unknown'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm text-gray-800">
                                {t.patient?.name || 'Unknown Patient'}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm font-bold text-gray-900">{t.condition || 'General Consultation'}</div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">{t.diagnosis || 'No formal diagnosis noted'}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-right">
                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                                  t.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB: AUDIT LOGS */}
            {activeTab === 'audit-logs' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Comprehensive audit trail recording who, what, when, and IP address.</p>
                  </div>
                </div>

                <div className="mb-4 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search logs by action, user, or IP address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                    <p>Loading audit trail...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <p className="text-gray-500 font-medium">No audit logs recorded.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[780px]">
                        <thead className="bg-gray-50/70 border-b border-gray-100">
                          <tr>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                            <th className="px-4 sm:px-6 py-3.5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 sm:px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm font-bold text-gray-900">{log.user?.name || 'System / Deleted User'}</div>
                                <div className="text-xs text-gray-500">{log.user?.role || 'N/A'}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <span className="font-mono text-[11px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-xs font-mono text-gray-600">
                                {log.details?.ip || '127.0.0.1'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-xs text-gray-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
                                {log.details ? JSON.stringify(log.details) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      {/* MODAL: ADD / EDIT DOCTOR */}
      {doctorModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setDoctorModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {doctorModalMode === 'add' ? 'Add New Doctor' : 'Edit Doctor Details'}
            </h3>
            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  placeholder="Dr. Jane Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  placeholder="jane.smith@hospital.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>
              {doctorModalMode === 'add' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={doctorForm.specialization}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                    placeholder="General Medicine"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    value={doctorForm.licenseNumber}
                    onChange={(e) => setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })}
                    placeholder="e.g. KL-12345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Verification Status</label>
                <select
                  value={doctorForm.verificationStatus}
                  onChange={(e) => setDoctorForm({ ...doctorForm, verificationStatus: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="APPROVED">APPROVED (Verified)</option>
                  <option value="PENDING">PENDING (Under review)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-[#0b3b2c] hover:bg-[#082a1f] text-white font-bold text-xs rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : doctorModalMode === 'add' ? 'Create Doctor' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT DOCTOR WITH REASON */}
      {rejectModalOpen && rejectingDoctor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">Reject Verification</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Specify the reason why <strong>{rejectingDoctor.user?.name}</strong>'s verification is being rejected. This reason will be displayed on their dashboard.
            </p>
            <textarea
              rows={4}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. License document expired or blurry. Please upload a clear copy of your valid state medical council certificate."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={() => handleVerifyDoctor(rejectingDoctor.id, 'REJECTED', rejectionReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PATIENT */}
      {patientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setPatientModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {patientModalMode === 'add' ? 'Add New Patient' : 'Edit Patient'}
            </h3>
            <form onSubmit={handleSavePatient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={patientForm.name}
                  onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={patientForm.email}
                  onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                  placeholder="patient@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>
              {patientModalMode === 'add' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={patientForm.password}
                    onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">A unique cryptographic QR identifier will automatically be generated.</p>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPatientModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-[#0b3b2c] hover:bg-[#082a1f] text-white font-bold text-xs rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : patientModalMode === 'add' ? 'Create Patient' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirmOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative animate-in fade-in">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete {deleteTarget.type === 'doctor' ? 'Doctor' : 'Patient'} Account</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This will permanently delete the user account and associated profile records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
