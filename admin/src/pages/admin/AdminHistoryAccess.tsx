import { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import api from '../../lib/api';

const AdminHistoryAccess = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/history-requests');
        setRequests(response.data);
      } catch (err: any) {
        console.error("Failed to fetch history requests", err);
        setError(err.response?.data?.error || 'Failed to load history requests.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusBadge = (status: string, expiresAt?: string) => {
    const isExpired = expiresAt && new Date(expiresAt).getTime() < Date.now();
    const effectiveStatus = (status === 'APPROVED' && isExpired) ? 'EXPIRED' : status;

    switch (effectiveStatus) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            APPROVED
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            PENDING
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            DENIED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <AlertCircle className="w-3.5 h-3.5" />
            EXPIRED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{status}</span>;
    }
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return '—';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  const filteredRequests = requests.filter((req: any) => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesSearch = 
      (req.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.doctor?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.patient?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">History Access Requests</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by doctor or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">All Requests ({requests.length})</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
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
                  <th className="px-6 py-4 font-semibold">Patient</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Requested At</th>
                  <th className="px-6 py-4 font-semibold">Validity / Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>
                        <p className="font-semibold text-slate-900">{req.doctor?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{req.doctor?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>
                        <p className="font-semibold text-slate-900">{req.patient?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{req.patient?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status, req.expiresAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {req.expiresAt ? (
                        <div>
                          <p className="text-slate-800 font-medium">{new Date(req.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(req.expiresAt).toLocaleDateString()})</p>
                          {req.status === 'APPROVED' && (
                            <span className="font-semibold text-emerald-600 text-[11px]">{getTimeRemaining(req.expiresAt)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No access requests found matching the filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHistoryAccess;
