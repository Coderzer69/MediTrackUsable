import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, User, Users, PlusCircle,
  Clock, ScanLine, Check, Home,
  FileCheck, UserCheck, FileEdit, Shield, LogOut, Menu, X,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NewTreatment from '../components/NewTreatment';
import DoctorMedicalHistory from '../components/DoctorMedicalHistory';
import DoctorHistoryRequests from '../components/DoctorHistoryRequests';
import DoctorProfileSettings from '../components/DoctorProfileSettings';
import ScannerModal from '../components/ScannerModal';
import AdminViewSwitcher from '../components/AdminViewSwitcher';
import { canUseDoctorFeatures } from '../lib/access';
import DoctorPatients from '../components/DoctorPatients';
import PatientSelectionView from '../components/PatientSelectionView';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function DoctorDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showScanner, setShowScanner] = useState(false);
  const [activePatient, setActivePatient] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const canUseDoctorTools = canUseDoctorFeatures(user);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [patientsRes, requestsRes, treatmentsRes] = await Promise.all([
        api.get('/doctor/patients'),
        api.get('/doctor/access-requests'),
        api.get('/doctor/treatments')
      ]);
      setPatients(patientsRes.data);
      setAccessRequests(requestsRes.data);
      setTreatments(treatmentsRes.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data', err);
      setError(err.response?.data?.error || t('doctor.patientNotFound'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canUseDoctorTools && (activeTab === 'dashboard' || activeTab === 'history-requests' || activeTab === 'history' || activeTab === 'patients')) {
      fetchDashboardData();
    }
  }, [activeTab, canUseDoctorTools]);

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING');
  const approvedHistoryRequests = accessRequests.filter(
    (request) =>
      request.status === 'APPROVED' &&
      request.patient &&
      (!request.expiresAt || new Date(request.expiresAt) > new Date())
  );

  const totalTreatments = treatments.length;
  const confirmedTreatments = treatments.filter(t => t.status === 'CONFIRMED').length;
  const draftTreatments = treatments.filter(t => t.status === 'DRAFT').length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common.goodMorning');
    if (hour < 17) return t('common.goodAfternoon');
    return t('common.goodEvening');
  };

  useEffect(() => {
    if (user && !canUseDoctorTools) {
      navigate('/doctor/verify');
    }
  }, [user, navigate]);

  if (!canUseDoctorTools) {
    return null;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#f8fdfa] font-sans overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-40 lg:z-auto
        w-[260px] bg-white border-r border-gray-100 flex flex-col h-full
        transition-transform duration-300 ease-in-out shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 lg:p-8 pb-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="text-[#0b5c46]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <span className="text-[22px] font-extrabold text-[#0b5c46] tracking-tight">{t('common.appName')}</span>
          </Link>
          <button
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile */}
        <div className="px-8 pb-6 flex flex-col items-center mb-2 mt-4">
          <div className="w-[72px] h-[72px] rounded-full bg-emerald-100 flex items-center justify-center mb-3 shadow-sm border border-gray-100 text-emerald-700 text-2xl font-bold">
            {user?.name?.charAt(0) || 'D'}
          </div>
          <h3 className="text-[17px] font-bold text-gray-900">{user?.name || t('common.doctor')}</h3>
          <p className="text-[13px] text-gray-500 font-medium mb-3">{user?.specialization || t('common.doctor')}</p>
          {canUseDoctorTools && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#e6f4ef] text-[#0b5c46] rounded-full">
              <Check className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold tracking-wide uppercase">{t('common.approved')}</span>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto">
          <Link
            to="#"
            onClick={() => handleTabChange('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-colors ${activeTab === 'dashboard' ? 'bg-[#f0f7f4] text-[#0b5c46]' : 'text-slate-600 hover:bg-gray-50'}`}
          >
            <Home className="w-[18px] h-[18px]" />
            {t('nav.dashboard')}
          </Link>
          <Link
            to="#"
            onClick={() => handleTabChange('patients')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-colors ${activeTab === 'patients' ? 'bg-[#f0f7f4] text-[#0b5c46]' : 'text-slate-600 hover:bg-gray-50'}`}
          >
            <Users className="w-[18px] h-[18px]" />
            {t('nav.patients')}
          </Link>
          <Link
            to="#"
            onClick={() => handleTabChange('new-treatment')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-colors ${activeTab === 'new-treatment' ? 'bg-[#f0f7f4] text-[#0b5c46]' : 'text-slate-600 hover:bg-gray-50'}`}
          >
            <PlusCircle className="w-[18px] h-[18px]" />
            {t('doctor.newTreatment')}
          </Link>
          <Link
            to="#"
            onClick={() => handleTabChange('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-colors ${activeTab === 'history' ? 'bg-[#f0f7f4] text-[#0b5c46]' : 'text-slate-600 hover:bg-gray-50'}`}
          >
            <Clock className="w-[18px] h-[18px]" />
            {t('patient.timeline')}
          </Link>
          <Link
            to="#"
            onClick={() => handleTabChange('history-requests')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-[14px] transition-colors ${activeTab === 'history-requests' ? 'bg-[#f0f7f4] text-[#0b5c46]' : 'text-slate-600 hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-[18px] h-[18px]" />
              {t('doctor.historyRequestsTitle')}
            </div>
            {pendingRequests.length > 0 && (
              <span className="w-[20px] h-[20px] bg-[#ef4444] text-white text-[11px] font-bold flex items-center justify-center rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </Link>

          <div className="my-2 h-px bg-gray-50 w-full"></div>

          <Link
            to="#"
            onClick={() => handleTabChange('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-colors ${activeTab === 'profile' ? 'bg-[#f0f7f4] text-[#0b5c46]' : 'text-slate-600 hover:bg-gray-50'}`}
          >
            <User className="w-[18px] h-[18px]" />
            {t('nav.profileSettings')}
          </Link>
          <AdminViewSwitcher />
        </nav>

        {/* Scan & Logout Buttons */}
        <div className="px-6 pb-6 pt-3 mt-auto flex flex-col gap-2.5">
          <button
            onClick={() => canUseDoctorTools && setShowScanner(true)}
            disabled={!canUseDoctorTools}
            className={`w-full flex items-center justify-center gap-2 py-3 bg-white border border-[#0b5c46] text-[#0b5c46] font-bold text-[14px] rounded-xl transition-colors shadow-sm cursor-pointer ${!canUseDoctorTools ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#f0f7f4]'}`}
          >
            <ScanLine className="w-[18px] h-[18px]" />
            {t('doctor.scanQr')}
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-red-600 font-bold text-[13.5px] rounded-xl transition-colors hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-[#0b5c46]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span className="text-lg font-extrabold tracking-tight">{t('common.appName')}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-sm text-red-700 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('common.retry')}
                </button>
              </div>
            )}

            {loading && patients.length === 0 && treatments.length === 0 ? (
              <div className="py-24 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0b5c46]" />
                <p className="text-sm font-medium">{t('common.loading')}</p>
              </div>
            ) : activeTab === 'new-treatment' ? (
              activePatient ? (
                <NewTreatment
                  patient={activePatient}
                  onBack={() => {
                    setActiveTab('dashboard');
                    setActivePatient(null);
                    fetchDashboardData();
                  }}
                />
              ) : (
                <PatientSelectionView
                  onPatientSelected={(patient) => {
                    setActivePatient(patient);
                  }}
                />
              )
            ) : activeTab === 'profile' ? (
              <DoctorProfileSettings
                defaultSection="profile"
                onBack={() => setActiveTab('dashboard')}
              />
            ) : activeTab === 'history' ? (
              activePatient ? (
                <DoctorMedicalHistory
                  patient={activePatient}
                  onBack={() => {
                    setActiveTab('history-requests');
                    setActivePatient(null);
                  }}
                />
              ) : (
                <div className="max-w-[900px] mx-auto">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('patient.timeline')}</h1>
                      <p className="text-gray-500 text-[14.5px]">
                        {t('doctor.requestAccessDesc')}
                      </p>
                    </div>

                    {approvedHistoryRequests.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                        <p className="text-gray-600 font-medium mb-3">{t('patient.noActivePermissions')}</p>
                        <button
                          onClick={() => setActiveTab('history-requests')}
                          className="px-4 py-2 bg-[#0b5c46] text-white font-bold text-[14px] rounded-lg hover:bg-[#094d3a] transition-colors cursor-pointer"
                        >
                          {t('doctor.historyRequestsTitle')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {approvedHistoryRequests.map((request: any) => (
                          <button
                            key={request.id}
                            onClick={() => setActivePatient(request.patient)}
                            className="w-full text-left border border-gray-100 rounded-xl p-4 hover:border-[#0b5c46]/30 hover:bg-[#f8fdfa] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-full bg-[#e6f4ef] text-[#0b5c46] font-bold text-[14px] flex items-center justify-center shrink-0 uppercase">
                                  {request.patient?.name?.substring(0, 2) || 'PT'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[15px] font-bold text-gray-900 truncate">
                                    {request.patient?.name || t('common.unknown')}
                                  </p>
                                  <p className="text-[13px] text-gray-500">
                                    {t('common.approved')}: {new Date(request.updatedAt || request.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-[#0b5c46] px-3 py-1 bg-emerald-50 rounded-lg">
                                {t('common.viewDetails')}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : activeTab === 'patients' ? (
              <DoctorPatients
                patients={patients}
                onAddPatient={() => setShowScanner(true)}
                onSelectPatient={(p) => {
                  setActivePatient(p);
                  setActiveTab('new-treatment');
                }}
                onRequestHistoryAccess={() => {
                  fetchDashboardData();
                  setActiveTab('history-requests');
                }}
              />
            ) : (
              <>
                {/* Desktop Header */}
                {activeTab !== 'history-requests' && (
                  <header className="hidden lg:flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-[26px] font-bold text-gray-900 mb-1 flex items-center gap-2">
                        {getGreeting()}, {user?.name} <span className="text-2xl">👋</span>
                      </h1>
                      <p className="text-gray-500 font-medium text-[14.5px]">{t('doctor.dashboardTitle')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <ThemeToggle />
                      <LanguageSwitcher />
                      <button className="p-2.5 bg-white rounded-full border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                        <Bell className="w-[20px] h-[20px]" />
                      </button>
                    </div>
                  </header>
                )}

                {/* Mobile page title */}
                {activeTab !== 'history-requests' && (
                  <div className="lg:hidden mb-5">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {getGreeting()}, {user?.name} 👋
                    </h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">{t('doctor.dashboardTitle')}</p>
                  </div>
                )}

                {activeTab !== 'history-requests' && (
                  <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div
                      onClick={() => setShowScanner(true)}
                      className="flex-1 bg-[#0b5c46] rounded-2xl p-6 sm:p-8 flex items-center justify-between text-white shadow-sm relative overflow-hidden cursor-pointer hover:bg-[#094d3a] transition-colors"
                    >
                      <div className="z-10 max-w-[200px]">
                        <h3 className="text-[17px] sm:text-[19px] font-bold mb-2 sm:mb-3">{t('doctor.scannerTitle')}</h3>
                        <p className="text-emerald-50/80 text-[13px] sm:text-[14px] leading-relaxed">
                          {t('doctor.scannerSubtitle')}
                        </p>
                      </div>
                      <div className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-full border border-emerald-400/30 flex items-center justify-center z-10 shrink-0">
                        <ScanLine className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-300" />
                      </div>
                      <div className="absolute right-[-40px] bottom-[-40px] w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-2xl"></div>
                    </div>

                    <div className="flex-[1.8] bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-[15px] font-bold text-gray-900 mb-4">{t('admin.overview')}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="bg-[#fcfdfd] border border-gray-50 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2">
                            <FileCheck className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-emerald-600" />
                            <span className="text-[20px] sm:text-[22px] font-bold text-gray-900">{totalTreatments}</span>
                          </div>
                          <p className="text-[11px] sm:text-[12.5px] font-medium text-gray-500">{t('doctor.totalTreatments')}</p>
                        </div>
                        <div className="bg-[#fcfdfd] border border-gray-50 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2">
                            <UserCheck className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-blue-500" />
                            <span className="text-[20px] sm:text-[22px] font-bold text-gray-900">{confirmedTreatments}</span>
                          </div>
                          <p className="text-[11px] sm:text-[12.5px] font-medium text-gray-500">{t('doctor.confirmedTreatments')}</p>
                        </div>
                        <div className="bg-[#fcfdfd] border border-gray-50 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2">
                            <FileEdit className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-sky-500" />
                            <span className="text-[20px] sm:text-[22px] font-bold text-gray-900">{draftTreatments}</span>
                          </div>
                          <p className="text-[11px] sm:text-[12.5px] font-medium text-gray-500">{t('doctor.draftTreatments')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'history-requests' ? (
                  <DoctorHistoryRequests
                    requests={accessRequests}
                    onRefresh={fetchDashboardData}
                    onViewHistory={(patient) => {
                      setActivePatient(patient);
                      setActiveTab('history');
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 sm:gap-6">
                    {/* Recent Patients */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-5 sm:mb-6">
                        <h3 className="text-[16px] font-bold text-gray-900">{t('doctor.recentPatients')}</h3>
                        <button onClick={() => setActiveTab('patients')} className="text-[13px] font-bold text-[#0b5c46] hover:text-[#084836] cursor-pointer">
                          {t('patient.viewAllMedicines')}
                        </button>
                      </div>
                      <div className="flex flex-col gap-4">
                        {patients.length === 0 && (
                          <p className="text-gray-500 text-[14px]">{t('doctor.noRecentPatients')}</p>
                        )}
                        {patients.slice(0, 4).map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="w-[42px] h-[42px] rounded-full bg-[#e6f4ef] text-[#0b5c46] font-bold text-[14px] flex items-center justify-center shrink-0 uppercase">
                                {p.name?.substring(0, 2) || 'PT'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[14.5px] font-bold text-gray-900 mb-0.5 truncate">{p.name || t('common.unknown')}</p>
                                <p className="text-[12.5px] text-gray-500">{t('common.patient')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 ml-2">
                              <button
                                onClick={() => {
                                  setActivePatient(p);
                                  setActiveTab('new-treatment');
                                }}
                                className="px-3 sm:px-4 py-1.5 border border-[#0b5c46]/30 text-[#0b5c46] font-bold text-[12px] sm:text-[12.5px] rounded-lg hover:bg-[#0b5c46]/5 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                {t('doctor.newTreatment')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Access Requests summary */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-[16px] font-bold text-gray-900">{t('doctor.pendingRequests')}</h3>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {pendingRequests.length}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                          {t('doctor.requestAccessDesc')}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('history-requests')}
                        className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        {t('common.viewDetails')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onPatientFound={(patient) => {
            setShowScanner(false);
            setActivePatient(patient);
            setActiveTab('new-treatment');
          }}
        />
      )}
    </div>
  );
}
