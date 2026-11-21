import { useState, useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import {
  Users, ShieldCheck, LayoutDashboard, ArrowRight,
  CheckCircle, XCircle, Eye, Menu, X,
  Plus, Edit2, Trash2, ShieldAlert, FileText, ScrollText,
  Search, RefreshCw, AlertCircle, Pill, Stethoscope, FileCheck, Clock, Inbox
} from 'lucide-react';
import api, { BACKEND_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';
import AdminViewSwitcher from '../components/AdminViewSwitcher';
import LiveSyncIndicator from '../components/LiveSyncIndicator';
import { useLiveSync } from '../lib/liveSync';

// ---------------------------------------------------------------- design tokens
const CARD = 'bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const H1 = 'text-[22px] sm:text-[26px] font-semibold text-slate-900 tracking-tight';
const SUBTITLE = 'text-sm text-slate-500 mt-1';
const INPUT =
  'w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';
const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-sm shadow-emerald-900/10 transition-colors duration-200 disabled:opacity-50';
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors duration-200';
const BTN_DANGER =
  'inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm shadow-rose-900/10 transition-colors duration-200 disabled:opacity-50';
const TH = 'px-4 sm:px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]';

type AdminTab = 'dashboard' | 'doctors' | 'patients' | 'treatments' | 'audit-logs';

const NAV_ITEMS: { id: AdminTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'treatments', label: 'Treatments', icon: FileText },
  { id: 'audit-logs', label: 'Audit logs', icon: ScrollText },
];

const TAB_TITLES: Record<AdminTab, string> = {
  dashboard: 'Overview',
  doctors: 'Doctors',
  patients: 'Patients',
  treatments: 'Treatments',
  'audit-logs': 'Audit logs',
};

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  APPROVED: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: 'bg-emerald-500' },
  CONFIRMED: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: 'bg-emerald-500' },
  PENDING: { pill: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  DRAFT: { pill: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  REJECTED: { pill: 'bg-rose-50 text-rose-700 ring-rose-600/15', dot: 'bg-rose-500' },
};

function StatusBadge({ status }: { status?: string }) {
  const style = STATUS_STYLES[status || ''] || { pill: 'bg-slate-100 text-slate-600 ring-slate-500/15', dot: 'bg-slate-400' };
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

// Animated number: counts up briefly when the value changes (skipped for reduced motion).
function useCountUp(target: number, duration = 650) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || target === 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

const STAT_TONES = {
  indigo: { tile: 'bg-indigo-50 text-indigo-600', line: 'from-indigo-500/70' },
  amber: { tile: 'bg-amber-50 text-amber-600', line: 'from-amber-500/70' },
  sky: { tile: 'bg-sky-50 text-sky-600', line: 'from-sky-500/70' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600', line: 'from-emerald-500/70' },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  footer,
  index,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: keyof typeof STAT_TONES;
  footer: ReactNode;
  index: number;
}) {
  const shown = useCountUp(value);
  const t = STAT_TONES[tone];
  return (
    <div
      className={`group relative overflow-hidden ${CARD} p-5 sm:p-6 transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-14px_rgba(15,23,42,0.25)] animate-fade-up`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${t.line} to-transparent`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.tile} transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-[28px] sm:text-[32px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">{shown}</p>
      <div className="mt-3 text-[12.5px] text-slate-500">{footer}</div>
    </div>
  );
}

// Doctor names are sometimes stored with a "Dr." prefix already.
const withDr = (name?: string) => (!name ? 'Unknown' : /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`);

function Initials({ name, tone = 'slate' }: { name?: string; tone?: 'slate' | 'amber' | 'emerald' }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${tones[tone]}`}>
      {initials || '?'}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="py-10 flex flex-col items-center text-center">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center text-sm text-slate-500 animate-fade-in">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-3" />
      <p>{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
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

  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);
  const [treatmentModalLoading, setTreatmentModalLoading] = useState(false);

  const handleOpenTreatmentDetails = async (t: any) => {
    setSelectedTreatment(t);
    setTreatmentModalOpen(true);
    setTreatmentModalLoading(true);
    try {
      const res = await api.get(`/admin/treatments/${t.id}`);
      if (res.data) {
        setSelectedTreatment(res.data);
      }
    } catch (e) {
      // Keep existing
    } finally {
      setTreatmentModalLoading(false);
    }
  };

  // True while a background (live-sync) reload runs, so the view does not flash a spinner.
  const silentFetch = useRef(false);

  const fetchData = async () => {
    if (!silentFetch.current) {
      setLoading(true);
      setErrorBanner('');
    }
    try {
      if (activeTab === 'dashboard') {
        const [statsRes, doctorsRes, treatmentsRes] = await Promise.all([
          api.get('/admin/dashboard-stats'),
          api.get('/admin/doctors').catch(() => ({ data: [] })),
          api.get('/admin/treatments').catch(() => ({ data: [] }))
        ]);
        setStats(statsRes.data);
        if (Array.isArray(doctorsRes.data)) setDoctors(doctorsRes.data);
        if (Array.isArray(treatmentsRes.data)) setTreatments(treatmentsRes.data);
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

  // Live sync: quietly reload the current view whenever the database changes
  // (from this panel, the doctor/patient apps, or a direct edit in Neon).
  const liveSync = useLiveSync();
  useEffect(() => {
    if (!liveSync.version) return;
    silentFetch.current = true;
    fetchData().finally(() => {
      silentFetch.current = false;
    });
  }, [liveSync.version]);

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
      name: pat.name || '',
      email: pat.email || '',
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

  const handleTabChange = (tab: AdminTab) => {
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
    const name = pat.name || '';
    const email = pat.email || '';
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

  const pendingDoctors = doctors.filter((d: any) => d.verificationStatus === 'PENDING');
  // Prefer the live doctor list (reloaded by live sync on every tab); fall back to the stats.
  const pendingCount = doctors.length ? pendingDoctors.length : stats?.pendingDoctors ?? 0;
  const verifiedPct = stats?.totalDoctors ? Math.round(((stats?.approvedDoctors || 0) / stats.totalDoctors) * 100) : 0;
  const firstName = (user?.name || 'Admin').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-slate-50 flex w-full font-sans text-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-40 lg:z-auto
        w-[264px] bg-slate-950 flex flex-col h-screen border-r border-slate-800/80
        transition-transform duration-300 ease-out shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-5 h-[72px] flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="block text-[16px] font-semibold text-white tracking-tight">MediTrack</span>
              <span className="block text-[11px] font-medium text-slate-400">Admin console</span>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Workspace</p>
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium w-full text-left transition-colors duration-200 ${active ? 'bg-slate-800/80 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'}`}
                >
                  <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400 transition-all duration-300 ${active ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'}`} />
                  <Icon className={`w-[18px] h-[18px] transition-colors duration-200 ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex-1">{label}</span>
                  {id === 'doctors' && pendingCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-400/15 text-amber-300 text-[11px] font-semibold inline-flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <AdminViewSwitcher tone="dark" />
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          <div className="flex items-center gap-3 rounded-xl p-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20 font-semibold text-sm flex items-center justify-center">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-100 truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 h-[72px] px-4 sm:px-8 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="hidden sm:block text-[12px] font-medium text-slate-400 leading-tight">
                Admin <span className="mx-1 text-slate-300">/</span>
                <span className="text-slate-500">{TAB_TITLES[activeTab]}</span>
              </p>
              <h2 className="text-[17px] font-semibold text-slate-900 truncate leading-snug">{TAB_TITLES[activeTab]}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline-flex">
              <LiveSyncIndicator status={liveSync.status} lastSynced={liveSync.lastSynced} />
            </span>
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={fetchData}
              title="Refresh data"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-slate-200">
              <div className="text-right">
                <div className="text-[13px] font-semibold text-slate-900 leading-tight">{user?.name || 'Administrator'}</div>
                <div className="text-[11px] font-medium text-emerald-700 inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                  Full access
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Alerts */}
        {errorBanner && (
          <div className="mx-4 sm:mx-8 mt-4 px-4 py-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2.5 text-sm text-rose-700 animate-fade-up">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}
        {successBanner && (
          <div className="mx-4 sm:mx-8 mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2.5 text-sm text-emerald-800 font-medium animate-fade-up">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          <div key={activeTab} className="max-w-[1240px] mx-auto animate-fade-up">

            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
                  <div>
                    <h1 className={H1}>{greeting}, {firstName}</h1>
                    <p className={SUBTITLE}>Here is what is happening across MediTrack today.</p>
                  </div>
                  <p className="text-[12.5px] font-medium text-slate-400">{todayLabel}</p>
                </div>

                {loading && !stats ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`${CARD} p-5 sm:p-6 animate-pulse`}>
                        <div className="h-3 w-24 rounded bg-slate-100" />
                        <div className="mt-4 h-7 w-16 rounded bg-slate-100" />
                        <div className="mt-4 h-2.5 w-28 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
                      <StatCard
                        index={0}
                        label="Total doctors"
                        value={stats?.totalDoctors || 0}
                        icon={Stethoscope}
                        tone="indigo"
                        footer={
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span>{stats?.approvedDoctors || 0} verified</span>
                              <span className="font-medium text-slate-600 tabular-nums">{verifiedPct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500 origin-left animate-grow-x" style={{ width: `${verifiedPct}%` }} />
                            </div>
                          </div>
                        }
                      />
                      <StatCard
                        index={1}
                        label="Pending verifications"
                        value={stats?.pendingDoctors || 0}
                        icon={Clock}
                        tone="amber"
                        footer={
                          <button
                            onClick={() => handleTabChange('doctors')}
                            className="group/link inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                          >
                            Review applications
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                          </button>
                        }
                      />
                      <StatCard
                        index={2}
                        label="Registered patients"
                        value={stats?.totalPatients || 0}
                        icon={Users}
                        tone="sky"
                        footer="Each with a unique QR identifier"
                      />
                      <StatCard
                        index={3}
                        label="Treatments recorded"
                        value={stats?.totalTreatments || 0}
                        icon={FileCheck}
                        tone="emerald"
                        footer={
                          <button
                            onClick={() => handleTabChange('treatments')}
                            className="group/link inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                          >
                            View all records
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                          </button>
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Pending Applications */}
                      <section className={`${CARD} animate-fade-up`} style={{ animationDelay: '240ms' }}>
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                              <Stethoscope className="h-4 w-4" />
                            </span>
                            <div>
                              <h3 className="text-[15px] font-semibold text-slate-900">Pending applications</h3>
                              <p className="text-xs text-slate-500">Doctors awaiting verification</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleTabChange('doctors')}
                            className="group/link inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                          >
                            Manage all
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                          </button>
                        </div>
                        <div className="px-5 sm:px-6 py-2">
                          {pendingDoctors.length === 0 ? (
                            <EmptyState icon={CheckCircle} message="All doctors are verified. No pending applications." />
                          ) : (
                            <ul className="divide-y divide-slate-100">
                              {pendingDoctors.slice(0, 4).map((doc: any, i: number) => (
                                <li
                                  key={doc.id}
                                  className="flex items-center gap-3 py-3 animate-fade-up"
                                  style={{ animationDelay: `${300 + i * 50}ms` }}
                                >
                                  <Initials name={doc.user?.name} tone="amber" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{doc.user?.name || 'Unnamed doctor'}</p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {doc.specialization || 'General practitioner'} · Lic {doc.licenseNumber || 'N/A'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleTabChange('doctors')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors shrink-0"
                                  >
                                    Review
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </section>

                      {/* Recent Treatments */}
                      <section className={`${CARD} animate-fade-up`} style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <FileCheck className="h-4 w-4" />
                            </span>
                            <div>
                              <h3 className="text-[15px] font-semibold text-slate-900">Recent consultations</h3>
                              <p className="text-xs text-slate-500">Latest treatment records</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleTabChange('treatments')}
                            className="group/link inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                          >
                            View all
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                          </button>
                        </div>
                        <div className="px-5 sm:px-6 py-2">
                          {treatments.length === 0 ? (
                            <EmptyState icon={Inbox} message="No consultation records logged yet." />
                          ) : (
                            <ul className="divide-y divide-slate-100">
                              {treatments.slice(0, 4).map((t: any, i: number) => (
                                <li
                                  key={t.id}
                                  className="flex items-center gap-3 py-3 animate-fade-up"
                                  style={{ animationDelay: `${360 + i * 50}ms` }}
                                >
                                  <Initials name={t.patient?.name} tone="emerald" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm font-semibold text-slate-900 truncate">
                                        {t.condition || t.diagnosis || 'Clinical consultation'}
                                      </span>
                                      <StatusBadge status={t.status} />
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                      {t.patient?.name || 'Unknown patient'} · {withDr(t.doctor?.name)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleOpenTreatmentDetails(t)}
                                    className={`${BTN_SECONDARY} px-3 py-1.5 text-xs shrink-0`}
                                  >
                                    Details
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </section>
                    </div>
                  </>
                )}
              </>
            )}

            {/* TAB: MANAGE DOCTORS */}
            {activeTab === 'doctors' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className={H1}>Manage Doctors</h1>
                    <p className={SUBTITLE}>Approve, reject, create, edit, or remove medical personnel.</p>
                  </div>
                  <button
                    onClick={openAddDoctor}
                    className={`${BTN_PRIMARY} px-4 py-2.5 text-sm self-start sm:self-auto`}
                  >
                    <Plus className="w-4 h-4" /> Add Doctor
                  </button>
                </div>

                {/* Filter / Search Bar */}
                <div className="mb-5 relative max-w-xl">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by doctor name, email, specialization, or license..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${INPUT} pl-10 pr-4 py-2.5`}
                  />
                </div>

                {loading ? (
                  <LoadingState label="Loading doctors..." />
                ) : filteredDoctors.length === 0 ? (
                  <div className={`${CARD} border-dashed`}>
                    <EmptyState icon={Search} message="No doctors found matching your query." />
                  </div>
                ) : (
                  <div className={`${CARD} overflow-hidden`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[760px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200/70">
                          <tr>
                            <th className={TH}>Doctor</th>
                            <th className={TH}>License</th>
                            <th className={TH}>Specialization</th>
                            <th className={TH}>Status</th>
                            <th className={`${TH} text-center`}>Documents</th>
                            <th className={`${TH} text-right`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDoctors.map((doc: any) => (
                            <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-[14px] font-bold text-slate-900">{doc.user?.name || 'Unnamed Doctor'}</div>
                                <div className="text-[12px] text-slate-500">{doc.user?.email}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-[13.5px] text-slate-700 font-medium">
                                {doc.licenseNumber || '—'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-[13.5px] text-slate-700">
                                {doc.specialization || 'General'}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <StatusBadge status={doc.verificationStatus} />
                                  {doc.verificationStatus === 'REJECTED' && doc.rejectionReason && (
                                    <span className="text-[11px] text-rose-600 italic max-w-[200px] truncate" title={doc.rejectionReason}>
                                      Reason: {doc.rejectionReason}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {doc.verificationDocumentUrl ? (
                                    <a
                                      href={`${BACKEND_URL}/uploads/${doc.verificationDocumentUrl.replace(/^\/?(uploads\/)?/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                                      title="View Medical License Document"
                                    >
                                      <Eye className="w-4 h-4" />
                                      License
                                    </a>
                                  ) : null}
                                  {doc.qualificationDocumentUrl ? (
                                    <a
                                      href={`${BACKEND_URL}/uploads/${doc.qualificationDocumentUrl.replace(/^\/?(uploads\/)?/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                                      title="View Qualification Certificate"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Qualification
                                    </a>
                                  ) : null}
                                  {!doc.verificationDocumentUrl && !doc.qualificationDocumentUrl && (
                                    <span className="text-xs text-slate-400">None</span>
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
                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Reject with Reason"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => openEditDoctor(doc)}
                                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
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
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                    <h1 className={H1}>Manage Patients</h1>
                    <p className={SUBTITLE}>View and manage registered patients and their QR code identifiers.</p>
                  </div>
                  <button
                    onClick={openAddPatient}
                    className={`${BTN_PRIMARY} px-4 py-2.5 text-sm self-start sm:self-auto`}
                  >
                    <Plus className="w-4 h-4" /> Add Patient
                  </button>
                </div>

                <div className="mb-5 relative max-w-xl">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by patient name, email, or QR identifier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${INPUT} pl-10 pr-4 py-2.5`}
                  />
                </div>

                {loading ? (
                  <LoadingState label="Loading patients..." />
                ) : filteredPatients.length === 0 ? (
                  <div className={`${CARD} border-dashed`}>
                    <EmptyState icon={Search} message="No patients found matching your query." />
                  </div>
                ) : (
                  <div className={`${CARD} overflow-hidden`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[640px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200/70">
                          <tr>
                            <th className={TH}>Patient</th>
                            <th className={TH}>Unique QR Identifier</th>
                            <th className={TH}>Registered On</th>
                            <th className={`${TH} text-right`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPatients.map((pat: any) => (
                            <tr key={pat.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-[14px] font-bold text-slate-900">{pat.name}</div>
                                <div className="text-[12px] text-slate-500">{pat.email}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md ring-1 ring-inset ring-slate-200/70">
                                  {pat.qrCodeIdentifier || '—'}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-[13px] text-slate-600">
                                {pat.createdAt ? new Date(pat.createdAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditPatient(pat)}
                                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Edit Patient"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: 'patient',
                                        id: pat.id,
                                        name: pat.name || 'Patient',
                                      });
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                    <h1 className={H1}>All Treatments</h1>
                    <p className={SUBTITLE}>Clinical consultation records created by verified doctors.</p>
                  </div>
                </div>

                <div className="mb-5 relative max-w-xl">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by doctor, patient, or medical condition..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${INPUT} pl-10 pr-4 py-2.5`}
                  />
                </div>

                {loading ? (
                  <LoadingState label="Loading treatments..." />
                ) : filteredTreatments.length === 0 ? (
                  <div className={`${CARD} border-dashed`}>
                    <EmptyState icon={Search} message="No treatment records recorded yet." />
                  </div>
                ) : (
                  <div className={`${CARD} overflow-hidden`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[760px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200/70">
                          <tr>
                            <th className={TH}>Date</th>
                            <th className={TH}>Doctor</th>
                            <th className={TH}>Patient</th>
                            <th className={TH}>Condition & Diagnosis</th>
                            <th className={TH}>Status</th>
                            <th className={`${TH} text-right`}>Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTreatments.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                              <td className="px-4 sm:px-6 py-4 text-xs font-semibold text-slate-600">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-900">
                                {withDr(t.doctor?.name)}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm text-slate-800">
                                {t.patient?.name || 'Unknown Patient'}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm font-bold text-slate-900">{t.condition || 'General Consultation'}</div>
                                <div className="text-xs text-slate-500 truncate max-w-xs">{t.diagnosis || 'No formal diagnosis noted'}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <StatusBadge status={t.status} />
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-right">
                                <button
                                  onClick={() => handleOpenTreatmentDetails(t)}
                                  className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Details
                                </button>
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
                    <h1 className={H1}>Audit Logs</h1>
                    <p className={SUBTITLE}>Comprehensive audit trail recording who, what, when, and IP address.</p>
                  </div>
                </div>

                <div className="mb-5 relative max-w-xl">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search logs by action, user, or IP address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${INPUT} pl-10 pr-4 py-2.5`}
                  />
                </div>

                {loading ? (
                  <LoadingState label="Loading audit trail..." />
                ) : filteredLogs.length === 0 ? (
                  <div className={`${CARD} border-dashed`}>
                    <EmptyState icon={Search} message="No audit logs recorded." />
                  </div>
                ) : (
                  <div className={`${CARD} overflow-hidden`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[780px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200/70">
                          <tr>
                            <th className={TH}>Timestamp</th>
                            <th className={TH}>User</th>
                            <th className={TH}>Action</th>
                            <th className={TH}>IP Address</th>
                            <th className={TH}>Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                              <td className="px-4 sm:px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm font-bold text-slate-900">{log.user?.name || 'System / Deleted User'}</div>
                                <div className="text-xs text-slate-500">{log.user?.role || 'N/A'}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <span className="font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-xs font-mono text-slate-600">
                                {log.details?.ip || '127.0.0.1'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-xs text-slate-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
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
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-slate-950/10 border border-slate-200/70 relative animate-scale-in">
            <button
              onClick={() => setDoctorModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {doctorModalMode === 'add' ? 'Add New Doctor' : 'Edit Doctor Details'}
            </h3>
            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  placeholder="Dr. Jane Smith"
                  className={`${INPUT} px-3.5 py-2.5`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  placeholder="jane.smith@hospital.com"
                  className={`${INPUT} px-3.5 py-2.5`}
                />
              </div>
              {doctorModalMode === 'add' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className={`${INPUT} px-3.5 py-2.5`}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Specialization</label>
                  <input
                    type="text"
                    value={doctorForm.specialization}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                    placeholder="General Medicine"
                    className={`${INPUT} px-3.5 py-2.5`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">License Number</label>
                  <input
                    type="text"
                    value={doctorForm.licenseNumber}
                    onChange={(e) => setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })}
                    placeholder="e.g. KL-12345"
                    className={`${INPUT} px-3.5 py-2.5`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Verification Status</label>
                <select
                  value={doctorForm.verificationStatus}
                  onChange={(e) => setDoctorForm({ ...doctorForm, verificationStatus: e.target.value })}
                  className={`${INPUT} px-3.5 py-2.5`}
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
                  className={`${BTN_SECONDARY} px-4 py-2.5 text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`${BTN_PRIMARY} px-5 py-2.5 text-xs`}
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
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-slate-950/10 border border-slate-200/70 relative animate-scale-in">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Reject Verification</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Specify the reason why <strong>{rejectingDoctor.user?.name}</strong>'s verification is being rejected. This reason will be displayed on their dashboard.
            </p>
            <textarea
              rows={4}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. License document expired or blurry. Please upload a clear copy of your valid state medical council certificate."
              className={`${INPUT} px-3.5 py-2.5 mb-4 focus:border-rose-500 focus:ring-rose-500/10`}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className={`${BTN_SECONDARY} px-4 py-2 text-xs`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={() => handleVerifyDoctor(rejectingDoctor.id, 'REJECTED', rejectionReason)}
                className={`${BTN_DANGER} px-4 py-2 text-xs`}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PATIENT */}
      {patientModalOpen && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-slate-950/10 border border-slate-200/70 relative animate-scale-in">
            <button
              onClick={() => setPatientModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {patientModalMode === 'add' ? 'Add New Patient' : 'Edit Patient'}
            </h3>
            <form onSubmit={handleSavePatient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={patientForm.name}
                  onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                  placeholder="John Doe"
                  className={`${INPUT} px-3.5 py-2.5`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={patientForm.email}
                  onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                  placeholder="patient@example.com"
                  className={`${INPUT} px-3.5 py-2.5`}
                />
              </div>
              {patientModalMode === 'add' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={patientForm.password}
                    onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className={`${INPUT} px-3.5 py-2.5`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">A unique cryptographic QR identifier will automatically be generated.</p>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPatientModalOpen(false)}
                  className={`${BTN_SECONDARY} px-4 py-2.5 text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`${BTN_PRIMARY} px-5 py-2.5 text-xs`}
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
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl shadow-slate-950/10 border border-slate-200/70 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete {deleteTarget.type === 'doctor' ? 'Doctor' : 'Patient'} Account</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This will permanently delete the user account and associated profile records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className={`${BTN_SECONDARY} px-4 py-2 text-xs`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmDelete}
                className={`${BTN_DANGER} px-4 py-2 text-xs`}
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: TREATMENT PRESCRIPTIONS POPUP */}
      {treatmentModalOpen && selectedTreatment && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl shadow-slate-950/10 border border-slate-200/70 relative animate-scale-in max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <StatusBadge status={selectedTreatment.status} />
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  {selectedTreatment.condition || 'Consultation Details'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Recorded on {new Date(selectedTreatment.createdAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => {
                  setTreatmentModalOpen(false);
                  setSelectedTreatment(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Doctor and Patient info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Prescribing Doctor</span>
                <p className="font-bold text-slate-900 text-sm mt-1">{selectedTreatment.doctor?.name || 'Unknown Doctor'}</p>
                <p className="text-xs text-slate-500">{selectedTreatment.doctor?.email}</p>
              </div>
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold uppercase text-blue-800">Patient</span>
                <p className="font-bold text-slate-900 text-sm mt-1">{selectedTreatment.patient?.name || 'Unknown Patient'}</p>
                <p className="text-xs text-slate-500">{selectedTreatment.patient?.email}</p>
              </div>
            </div>

            {/* Prescriptions List */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  Prescriptions Given by Doctor
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {(selectedTreatment.prescriptions || []).length} Medicines
                </span>
              </div>

              {treatmentModalLoading ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading prescriptions...</div>
              ) : (selectedTreatment.prescriptions && selectedTreatment.prescriptions.length > 0) ? (
                <div className="space-y-2.5">
                  {selectedTreatment.prescriptions.map((p: any, idx: number) => {
                    const medName = p.medicineName || 'Unnamed Medicine';
                    return (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">{medName}</span>
                            {p.strength && (
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                {p.strength}
                              </span>
                            )}
                          </div>
                          {p.dosage && (
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                              Dosage: {p.dosage}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-50">
                          {p.frequency && <p><span className="font-semibold text-slate-700">Frequency:</span> {p.frequency}</p>}
                          {p.duration && <p><span className="font-semibold text-slate-700">Duration:</span> {p.duration}</p>}
                          {p.instructions && (
                            <p className="sm:col-span-2 text-slate-600 italic bg-slate-50 p-2 rounded-lg">
                              <span className="font-semibold text-slate-700 not-italic">Instructions: </span>
                              {p.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-4 bg-white rounded-xl border text-center">
                  No prescriptions recorded for this consultation.
                </p>
              )}
            </div>

            {/* Diagnosis & Notes */}
            {(selectedTreatment.diagnosis || selectedTreatment.doctorNotes) && (
              <div className="space-y-3">
                {selectedTreatment.diagnosis && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Diagnosis</h4>
                    <p className="p-3 bg-slate-50 rounded-xl text-xs text-slate-800 font-medium border border-slate-100">{selectedTreatment.diagnosis}</p>
                  </div>
                )}
                {selectedTreatment.doctorNotes && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Doctor Notes</h4>
                    <p className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">{selectedTreatment.doctorNotes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setTreatmentModalOpen(false);
                  setSelectedTreatment(null);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
