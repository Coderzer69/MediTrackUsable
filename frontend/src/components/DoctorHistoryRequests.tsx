import { Eye, Plus, X, AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';

interface DoctorHistoryRequestsProps {
  requests?: any[];
  onRefresh?: () => void;
  onViewHistory?: (patient: any) => void;
}

export default function DoctorHistoryRequests({ requests = [], onRefresh, onViewHistory }: DoctorHistoryRequestsProps) {
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const filteredRequests = requests.filter(req => {
    if (tab === 'ALL') return true;
    return req.status === tab;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const res = await api.get('/doctor/patients');
      if (Array.isArray(res.data)) {
        setAvailablePatients(res.data);
      }
    } catch (err) {
      console.error('Failed to load patients for access request', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setFormError('');
    setFormSuccess('');
    setPatientIdInput('');
    loadPatients();
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientIdInput.trim()) {
      setFormError('Please select or enter a Patient ID');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      setFormSuccess('');
      await api.post('/doctor/access-requests', { patientId: patientIdInput.trim() });
      setFormSuccess('Access request sent successfully!');
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
        setPatientIdInput('');
        if (onRefresh) onRefresh();
      }, 1200);
    } catch (err: any) {
      console.error('Error submitting access request', err);
      setFormError(err.response?.data?.error || 'Failed to submit access request.');
    } finally {
      setSubmitting(false);
    }
  };

  const getExpiresIn = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-5 sm:p-8">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-gray-900 mb-5">History Requests</h2>
          <div className="flex items-center gap-4 sm:gap-8 border-b border-gray-100 overflow-x-auto pb-0">
            <button 
              onClick={() => setTab('ALL')}
              className={`pb-4 font-bold text-[14.5px] flex items-center gap-2 ${tab === 'ALL' ? 'border-b-2 border-[#0b5c46] text-[#0b5c46]' : 'text-gray-500'}`}
            >
              All Requests
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${tab === 'ALL' ? 'bg-[#e6f4ef] text-[#0b5c46]' : 'bg-gray-100 text-gray-500'}`}>
                {requests.length}
              </span>
            </button>
            <button 
              onClick={() => setTab('PENDING')}
              className={`pb-4 font-bold text-[14.5px] flex items-center gap-2 ${tab === 'PENDING' ? 'border-b-2 border-[#0b5c46] text-[#0b5c46]' : 'text-gray-500'}`}
            >
              Pending Requests
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${tab === 'PENDING' ? 'bg-[#e6f4ef] text-[#0b5c46]' : 'bg-gray-100 text-gray-500'}`}>
                {pendingCount}
              </span>
            </button>
            <button 
              onClick={() => setTab('APPROVED')}
              className={`pb-4 font-bold text-[14.5px] flex items-center gap-2 ${tab === 'APPROVED' ? 'border-b-2 border-[#0b5c46] text-[#0b5c46]' : 'text-gray-500'}`}
            >
              Approved Requests
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${tab === 'APPROVED' ? 'bg-[#e6f4ef] text-[#0b5c46]' : 'bg-gray-100 text-gray-500'}`}>
                {approvedCount}
              </span>
            </button>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-[#0b5c46] hover:bg-[#084534] text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Request Access
        </button>
      </div>

      {/* Table — hidden on mobile, shown on md+ */}
      <div className="hidden md:block">
        {/* Table Header */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-4 py-4 border-b border-gray-100 text-[12.5px] font-bold text-gray-500">
          <div>Patient</div>
          <div>Requested On</div>
          <div>Requested By</div>
          <div>Reason</div>
          <div>Expires In</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Requests List — desktop */}
        <div className="flex flex-col">
          {filteredRequests.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No requests found.</p>
          ) : (
            filteredRequests.map((req: any) => (
              <div key={req.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-4 py-5 border-b border-gray-50 items-center">
              <div className="flex items-center gap-4">
                <div className="w-[42px] h-[42px] rounded-full bg-gray-100 text-gray-600 font-bold text-[14px] flex items-center justify-center shrink-0 uppercase">
                  {req.patient?.name?.substring(0, 2) || 'PT'}
                </div>
                <div>
                  <p className="text-[14.5px] font-bold text-gray-900 mb-0.5">{req.patient?.name || 'Unknown Patient'}</p>
                </div>
              </div>
              <div>
                <p className="text-[13.5px] text-gray-600 font-medium mb-0.5">
                  {new Date(req.createdAt).toLocaleDateString()}
                </p>
                <p className="text-[12.5px] text-gray-400">
                  {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-900 mb-0.5">Dr. {req.doctor?.name || 'You'}</p>
              </div>
              <div className="text-[13px] text-gray-600 leading-relaxed max-w-[140px]">
                {req.reason || 'Medical review'}
              </div>
              <div>
                {req.status === 'APPROVED' && req.expiresAt ? (
                  new Date(req.expiresAt) > new Date() ? (
                    <>
                      <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded mb-1">
                        {getExpiresIn(req.expiresAt)}
                      </span>
                      <p className="text-[11.5px] text-gray-400">({new Date(req.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</p>
                    </>
                  ) : (
                    <span className="text-[12.5px] font-bold text-[#0b5c46] mb-0.5 block">Expired</span>
                  )
                ) : (
                  <span className="text-gray-400 text-[12.5px]">-</span>
                )}
              </div>
              <div>
                <span className={`px-3 py-1 text-[12px] font-bold rounded-md uppercase ${
                  req.status === 'PENDING' ? 'bg-orange-50 text-orange-600' :
                  req.status === 'APPROVED' ? 'bg-[#e6f4ef] text-[#0b5c46]' :
                  'bg-red-50 text-red-600'
                }`}>
                  {req.status}
                </span>
              </div>
              <div className="flex items-center justify-end">
                {req.status === 'APPROVED' && onViewHistory && (
                  <button 
                    onClick={() => onViewHistory(req.patient)}
                    className="w-[90px] py-1.5 border border-gray-200 text-gray-700 font-bold text-[12.5px] rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                )}
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile card layout — shown on mobile, hidden on md+ */}
      <div className="md:hidden flex flex-col gap-4">
        {filteredRequests.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">No requests found.</p>
        ) : (
          filteredRequests.map((req: any) => (
            <div key={req.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-[38px] h-[38px] rounded-full bg-gray-100 text-gray-600 font-bold text-[13px] flex items-center justify-center shrink-0 uppercase">
                    {req.patient?.name?.substring(0, 2) || 'PT'}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{req.patient?.name || 'Unknown Patient'}</p>
                    <p className="text-[12px] text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase ${
                  req.status === 'PENDING' ? 'bg-orange-50 text-orange-600' :
                  req.status === 'APPROVED' ? 'bg-[#e6f4ef] text-[#0b5c46]' :
                  'bg-red-50 text-red-600'
                }`}>
                  {req.status}
                </span>
              </div>
              <div className="text-[13px] text-gray-600">
                <span className="font-medium">Reason: </span>{req.reason || 'Medical review'}
              </div>
              {req.status === 'APPROVED' && onViewHistory && (
                <button
                  onClick={() => onViewHistory(req.patient)}
                  className="w-full py-2 border border-gray-200 text-gray-700 font-bold text-[13px] rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 mt-1"
                >
                  <Eye className="w-4 h-4" />
                  View History
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0b5c46] flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Request Medical History</h3>
                  <p className="text-xs text-gray-500">Secure patient authorization required</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Select Patient
                </label>
                {loadingPatients ? (
                  <div className="text-xs text-gray-400 py-2">Loading patient directory...</div>
                ) : availablePatients.length > 0 ? (
                  <select
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose a patient --</option>
                    {availablePatients.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email || p.phone || p.id.substring(0, 8)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-500 italic mb-2">No previously consulted patients found.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Or Enter Patient User ID Directly
                </label>
                <input
                  type="text"
                  placeholder="e.g. c395d820-2f3b-..."
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-1">
                <p className="font-semibold">Privacy Notice:</p>
                <p className="text-[11px] leading-relaxed text-emerald-700">
                  Submitting this request alerts the patient on their dashboard. History access is granted immediately once the patient approves and remains active for 24 hours.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !patientIdInput.trim()}
                  className="px-5 py-2.5 bg-[#0b5c46] hover:bg-[#084534] text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
