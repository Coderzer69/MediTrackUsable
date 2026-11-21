import { ChevronLeft, Calendar, AlertTriangle, Edit3, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReviewTreatmentProps {
  onBack: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  patient: any;
  treatmentData: any;
}

export default function ReviewTreatment({ onBack, onConfirm, onEdit, patient, treatmentData }: ReviewTreatmentProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full font-sans max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <button 
          onClick={onBack}
          className="text-emerald-700 hover:text-emerald-800 transition-colors absolute left-0 flex items-center gap-2 font-bold text-[15px] cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('common.back')}
        </button>
        <h1 className="text-[22px] font-extrabold text-gray-900 w-full text-center">
          {t('treatment.reviewTitle')}
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)] p-6 sm:p-8">
        
        {/* Top Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-gray-100 gap-4 sm:gap-0">
          <div className="flex items-center gap-5">
            <div className="w-[60px] h-[60px] rounded-full bg-[#e6f4ef] text-[#0b3b2c] font-bold text-[18px] flex items-center justify-center shrink-0 uppercase">
              {patient?.name ? patient.name.charAt(0) : '?'}
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-gray-900 mb-1">{patient?.name || t('common.unknown')}</h2>
              <p className="text-[14px] text-gray-500 font-medium">P-ID: {patient?.qrCodeIdentifier || '—'}</p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium mb-1.5">
              <Calendar className="w-4 h-4" />
              {t('common.dateAndTime')}
            </div>
            <p className="text-[14.5px] font-bold text-gray-900">{new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Clinical Summary */}
        <div className="py-8 border-b border-gray-100">
          <h3 className="text-[17px] font-bold text-gray-900 mb-6">{t('treatment.clinicalSummary')}</h3>
          
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <span className="text-[14px] font-medium text-gray-500 w-44 shrink-0">{t('treatment.condition')}</span>
              <span className="text-[14.5px] font-bold text-gray-900">{treatmentData.condition || '-'}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <span className="text-[14px] font-medium text-gray-500 w-44 shrink-0">{t('treatment.symptoms')}</span>
              <span className="text-[14.5px] font-bold text-gray-900">{treatmentData.symptoms || '-'}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <span className="text-[14px] font-medium text-gray-500 w-44 shrink-0">{t('treatment.diagnosis')}</span>
              <span className="text-[14.5px] font-bold text-gray-900">{treatmentData.diagnosis || '-'}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <span className="text-[14px] font-medium text-gray-500 w-44 shrink-0">{t('treatment.doctorNotes')}</span>
              <span className="text-[14.5px] font-bold text-gray-900">{treatmentData.doctorNotes || '-'}</span>
            </div>
          </div>
        </div>

        {/* Prescription */}
        <div className="py-8">
          <h3 className="text-[17px] font-bold text-gray-900 mb-6">{t('treatment.prescriptions')} ({treatmentData.prescriptions?.length || 0})</h3>
          
          {treatmentData.prescriptions?.map((med: any, idx: number) => (
            <div key={idx} className="border border-gray-100 rounded-2xl p-6 shadow-sm mb-6 bg-gray-50/30">
              <h4 className="text-[17px] font-bold text-gray-900 mb-4">{med.medicineName}</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-4">
                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1">{t('treatment.strength')}</p>
                  <p className="text-[14.5px] font-bold text-gray-900">{med.strength || '-'}</p>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1">{t('treatment.dosage')}</p>
                  <p className="text-[14.5px] font-bold text-gray-900">{med.dosage || '-'}</p>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1">{t('treatment.frequency')}</p>
                  <p className="text-[14.5px] font-bold text-gray-900">{med.frequency || '-'}</p>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1">{t('treatment.duration')}</p>
                  <p className="text-[14.5px] font-bold text-gray-900">{med.duration || '-'}</p>
                </div>
                
                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1">{t('treatment.route')}</p>
                  <p className="text-[14.5px] font-bold text-gray-900">{med.route || '-'}</p>
                </div>
                <div className="col-span-1 md:col-span-3">
                  <p className="text-[13px] font-medium text-gray-500 mb-1">{t('treatment.instructions')}</p>
                  <p className="text-[14.5px] font-bold text-gray-900">{med.instructions || '-'}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Warning Alert */}
          <div className="bg-[#fffcf0] border border-[#f5e6c4] rounded-xl p-5 mb-8 flex items-start gap-4">
            <AlertTriangle className="w-[22px] h-[22px] text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[14px] font-bold text-gray-900 leading-relaxed">
              {t('treatment.prescriptionsDesc')}
            </p>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onEdit}
              className="flex-1 py-4 bg-white border border-gray-200 text-gray-900 font-bold text-[15px] rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Edit3 className="w-[18px] h-[18px]" />
              {t('common.edit')}
            </button>
            <button 
              onClick={onConfirm}
              className="flex-[1.5] py-4 bg-[#0b5c46] hover:bg-[#084836] text-white font-bold text-[15px] rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer"
            >
              <Check className="w-5 h-5" />
              {t('treatment.confirmTreatment')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
