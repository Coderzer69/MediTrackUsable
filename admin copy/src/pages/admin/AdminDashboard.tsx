import { useState, useEffect } from 'react';
import { 
  Users, 
  Lock, 
  TrendingUp, 
  Loader2, 
  UserCheck,
  Stethoscope,
  Clock,
  ArrowRight,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, doctorsRes, treatmentsRes] = await Promise.all([
        api.get('/admin/dashboard-stats'),
        api.get('/admin/doctors').catch(() => ({ data: [] })),
        api.get('/admin/treatments').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      
      const allDoctors = Array.isArray(doctorsRes.data) ? doctorsRes.data : [];
      setPendingDoctors(allDoctors.filter((d: any) => d.verificationStatus === 'PENDING').slice(0, 5));
      
      const allTreatments = Array.isArray(treatmentsRes.data) ? treatmentsRes.data : [];
      setRecentTreatments(allTreatments.slice(0, 5));
    } catch (err: any) {
      console.error("Failed to fetch dashboard data", err);
      setError(err.response?.data?.error || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-slate-500 text-sm font-medium">Loading hospital metrics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center text-rose-600 font-medium max-w-md mx-auto my-12 bg-white rounded-2xl border border-rose-100 shadow-sm">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p>{error || 'Unable to retrieve system statistics.'}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Hospital Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time statistics across all personnel, patients, and treatments.</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          onClick={() => navigate('/admin/doctors')}
          className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Doctors</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalDoctors ?? 0}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium pt-3 border-t border-slate-100">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              {stats.approvedDoctors ?? 0} Verified
            </span>
            {(stats.pendingDoctors ?? 0) > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                {stats.pendingDoctors} Pending
              </span>
            )}
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/patients')}
          className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Patients</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalPatients ?? 0}</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium pt-3 border-t border-slate-100 text-slate-500">
            <span>Verified Patient Accounts</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/treatments')}
          className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Treatments</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalTreatments ?? 0}</h3>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 text-orange-700 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium pt-3 border-t border-slate-100 text-slate-500">
            <span>Logged Consultations</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/history-requests')}
          className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Access Requests</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalRequests ?? stats.pendingRequests ?? 0}</h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-700 group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium pt-3 border-t border-slate-100">
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
              {stats.pendingRequests ?? 0} Pending Approval
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Pending Approvals & Recent Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Doctor Approvals */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Pending Doctor Approvals</h3>
              </div>
              <button 
                onClick={() => navigate('/admin/doctors')} 
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingDoctors.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                <UserCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No pending doctor applications. All personnel verified!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDoctors.map((doc: any) => (
                  <div key={doc.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                      <p className="text-xs text-slate-500">{doc.specialization || 'Medical Specialist'} • Lic: {doc.licenseNumber || 'N/A'}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/doctors/${doc.id}`)}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs rounded-lg transition-colors shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Consultations */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Recent Consultations</h3>
              </div>
              <button 
                onClick={() => navigate('/admin/treatments')} 
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentTreatments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No treatment consultations logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentTreatments.map((t: any) => (
                  <div key={t.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {t.condition || t.diagnosis || 'Clinical Consultation'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          t.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Patient: {t.patient?.name || 'Unknown'} • Dr: {t.doctor?.name || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
