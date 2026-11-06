import { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  Globe, 
  User, 
  Info, 
  X 
} from 'lucide-react';
import api from '../../lib/api';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/audit-logs');
        setLogs(response.data);
      } catch (err: any) {
        console.error("Failed to fetch audit logs", err);
        setError(err.response?.data?.error || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('CONFIRM')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (action.includes('REJECT') || action.includes('DELETE') || action.includes('DENIED')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (action.includes('LOGIN') || action.includes('AUTH') || action.includes('SCAN')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const filteredLogs = logs.filter((log: any) => {
    const matchesRole = roleFilter === 'all' || log.user?.role === roleFilter;
    const matchesSearch =
      (log.action?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, user, or payload details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">All Roles ({logs.length})</option>
              <option value="ADMIN">ADMIN</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="PATIENT">PATIENT</option>
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
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Action Triggered</th>
                  <th className="px-6 py-4 font-semibold">IP Address</th>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log: any) => {
                  const clientIp = log.details?.ip || log.details?.clientIp || '127.0.0.1';
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-900">{log.user?.name || 'System / Anonymous'}</p>
                            <p className="text-xs text-slate-400">{log.user?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-bold tracking-wider">
                          {log.user?.role || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          {clientIp}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Info className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No audit records found matching the query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* INSPECT LOG MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getActionBadgeColor(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">Audit Event Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">Recorded ID: {selectedLog.id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 py-2 border-b">
                <span className="text-slate-500 font-medium">Actor:</span>
                <span className="col-span-2 font-semibold text-slate-900">{selectedLog.user?.name || 'System'} ({selectedLog.user?.email || 'N/A'})</span>
              </div>
              <div className="grid grid-cols-3 py-2 border-b">
                <span className="text-slate-500 font-medium">Role:</span>
                <span className="col-span-2 font-semibold text-slate-900">{selectedLog.user?.role || 'SYSTEM'}</span>
              </div>
              <div className="grid grid-cols-3 py-2 border-b">
                <span className="text-slate-500 font-medium">Timestamp:</span>
                <span className="col-span-2 text-slate-700">{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-slate-500 font-medium mb-1.5">Action Metadata / Payload:</span>
                <pre className="p-4 bg-slate-900 text-emerald-400 text-xs rounded-xl overflow-x-auto max-h-60 font-mono">
                  {JSON.stringify(selectedLog.details, null, 2) || '{}'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
