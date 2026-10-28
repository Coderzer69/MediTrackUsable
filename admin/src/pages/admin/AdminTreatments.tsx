import { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  Eye, 
  X, 
  Pill, 
  Calendar, 
  User, 
  Stethoscope,
  Clock,
  FileText
} from 'lucide-react';
import api from '../../lib/api';

const AdminTreatments = () => {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/treatments');
      setTreatments(response.data);
    } catch (err: any) {
      console.error("Failed to fetch treatments", err);
      setError(err.response?.data?.error || 'Failed to load treatments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const handleOpenDetails = async (treatment: any) => {
    setSelectedTreatment(treatment);
    setModalLoading(true);
    try {
      const response = await api.get(`/admin/treatments/${treatment.id}`);
      if (response.data) {
        setSelectedTreatment(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch treatment details", err);
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'DRAFT': return 'bg-amber-50 text-amber-700 border border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border border-slate-300';
    }
  };

  const parseSymptoms = (symptoms: any): string[] => {
    if (!symptoms) return [];
    if (Array.isArray(symptoms)) return symptoms;
    if (typeof symptoms === 'string') {
      try {
        const parsed = JSON.parse(symptoms);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Not JSON
      }
      return symptoms.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const filteredTreatments = treatments.filter((t: any) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = 
      (t.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.condition?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const prescriptions = selectedTreatment?.prescriptions || [];
  const symptomsList = parseSymptoms(selectedTreatment?.symptoms);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Treatments</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by doctor, patient, or condition..."
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
              <option value="all">All Treatments ({treatments.length})</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DRAFT">Draft</option>
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
                  <th className="px-6 py-4 font-semibold">Primary Condition</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTreatments.map((treatment: any) => (
                  <tr 
                    key={treatment.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetails(treatment)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-900">{treatment.doctor?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{treatment.doctor?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-900">{treatment.patient?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{treatment.patient?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      <div className="truncate max-w-[220px]" title={treatment.condition || 'N/A'}>
                        {treatment.condition || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(treatment.status)}`}>
                        {treatment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(treatment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(treatment);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTreatments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No treatments found matching the filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* POPUP MODAL: PRESCRIPTIONS & CONSULTATION DETAILS */}
      {selectedTreatment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${getStatusStyle(selectedTreatment.status)}`}>
                    {selectedTreatment.status}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedTreatment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">
                  {selectedTreatment.condition || 'Consultation Details'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTreatment(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Doctor and Patient Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-emerald-600" />
                  Prescribing Doctor
                </span>
                <p className="font-bold text-slate-900 mt-1">{selectedTreatment.doctor?.name || 'Unknown Doctor'}</p>
                <p className="text-xs text-slate-600">{selectedTreatment.doctor?.email}</p>
              </div>
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-600" />
                  Patient
                </span>
                <p className="font-bold text-slate-900 mt-1">{selectedTreatment.patient?.name || 'Unknown Patient'}</p>
                <p className="text-xs text-slate-600">{selectedTreatment.patient?.email}</p>
              </div>
            </div>

            {/* PRESCRIPTIONS SECTION - FEATURED */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  Doctor Prescriptions
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {prescriptions.length} {prescriptions.length === 1 ? 'Medicine' : 'Medicines'}
                </span>
              </div>

              {modalLoading ? (
                <div className="flex items-center justify-center p-6 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading prescriptions...
                </div>
              ) : prescriptions.length > 0 ? (
                <div className="space-y-3">
                  {prescriptions.map((p: any, idx: number) => {
                    const medName = p.medicineName || p.medication || p.name || 'Unnamed Medicine';
                    return (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">{medName}</span>
                            {p.strength && (
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                {p.strength}
                              </span>
                            )}
                            {p.route && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                                {p.route}
                              </span>
                            )}
                          </div>
                          {p.dosage && (
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md self-start sm:self-auto border border-emerald-200">
                              Dosage: {p.dosage}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                          {p.frequency && (
                            <p className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-700">Frequency:</span> {p.frequency}
                            </p>
                          )}
                          {p.duration && (
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-700">Duration:</span> {p.duration}
                            </p>
                          )}
                          {p.instructions && (
                            <p className="sm:col-span-2 text-slate-600 italic mt-1 bg-slate-50 p-2 rounded-lg">
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
                <div className="p-6 bg-white rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                  <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No prescriptions recorded for this consultation.
                </div>
              )}
            </div>

            {/* Diagnosis & Notes */}
            {(selectedTreatment.diagnosis || selectedTreatment.doctorNotes) && (
              <div className="space-y-4">
                {selectedTreatment.diagnosis && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Clinical Diagnosis
                    </h4>
                    <p className="p-3 bg-slate-50 rounded-xl border text-sm text-slate-800 font-medium">
                      {selectedTreatment.diagnosis}
                    </p>
                  </div>
                )}

                {selectedTreatment.doctorNotes && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Doctor's Notes
                    </h4>
                    <p className="p-3 bg-slate-50 rounded-xl border text-sm text-slate-700">
                      {selectedTreatment.doctorNotes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Symptoms */}
            {symptomsList.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Symptoms Noted
                </h4>
                <div className="flex flex-wrap gap-2">
                  {symptomsList.map((symptom: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setSelectedTreatment(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
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

export default AdminTreatments;
