import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  ArrowRight, Stethoscope, Lock, Shield, Settings,
  CheckCircle2, UserCircle, QrCode,
  Mic, LockKeyhole, History,
  Bot
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Step4Visual = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-[300px] bg-white rounded-2xl p-6 shadow-xl shadow-emerald-900/5 border border-emerald-50 flex flex-col gap-6 relative mx-auto my-auto origin-center">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#0b3b2c] text-white p-1.5 rounded-lg shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <span className="font-bold text-gray-900 text-[13px] tracking-tight">
            {t('landing.aiAssistant')}
          </span>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold border border-emerald-100">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          Active
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center gap-3 z-10">
        <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0">
          <div className="absolute w-12 h-12 bg-emerald-50 rounded-full animate-ping opacity-60"></div>
          <div className="absolute w-9 h-9 bg-emerald-100/80 rounded-full"></div>
          <div className="w-9 h-9 relative flex items-center justify-center z-10">
            <Mic className="w-4 h-4 text-emerald-700" />
          </div>
        </div>

        {/* Waveform */}
        <div className="flex-1 flex items-center justify-between h-8 gap-[2px] overflow-hidden px-1">
          {[20, 35, 25, 50, 75, 45, 90, 100, 60, 45, 80, 55, 30, 45, 20].map((h, i) => (
            <div key={i} className="w-[3px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full" style={{ height: `${h}%` }}></div>
          ))}
        </div>
      </div>

      {/* Bottom text */}
      <div className="text-center z-10 -mt-2">
        <span className="text-gray-900 font-bold text-sm tracking-wide">{t('landing.listening')}</span>
      </div>
    </div>
  );
};

const Step5Visual = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-[250px] relative mx-auto my-auto origin-center mt-4 mb-2">
      {/* Clipboard Clip */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="w-4 h-4 rounded-full border-[3px] border-[#0b3b2c] bg-white -mb-1 relative z-10"></div>
        <div className="w-16 h-3.5 bg-[#0b3b2c] rounded-full shadow-sm"></div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-xl shadow-emerald-900/5 border border-emerald-50 flex flex-col relative z-10 pt-6 px-5 pb-5 text-left">
        <h4 className="text-[#0b3b2c] font-bold text-[15px]">{t('landing.reviewTreatment')}</h4>
        <div className="w-full h-px bg-gray-200 mt-2.5 mb-3.5"></div>

        <h3 className="font-extrabold text-gray-900 text-[19px] mb-2.5">Paracetamol</h3>

        <div className="flex flex-col gap-1.5 text-[#4A5568] font-medium text-sm mb-5">
          <div>650 mg</div>
          <div>1 tablet</div>
          <div>Twice daily</div>
          <div>3 days</div>
          <div>After food</div>
        </div>

        <button className="w-full bg-[#0b3b2c] hover:bg-emerald-900 text-white font-bold py-2.5 rounded-[10px] shadow-md text-[13px] transition-colors">
          {t('landing.confirmTreatment')}
        </button>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F8FAF9] font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/60 text-emerald-800 text-sm font-semibold mb-8 border border-emerald-200/50">
              {t('landing.heroBadge')}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15] mb-6">
              {t('landing.heroTitle1')} <br />
              {t('landing.heroTitle2')} <br />
              <span className="text-emerald-700">{t('landing.heroTitle3')}</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">
              {t('landing.heroDesc')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/role-selection" className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-md hover:shadow-lg">
                {t('landing.getStartedFree')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/doctor/signup" className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-200 px-8 py-4 rounded-xl text-lg font-semibold transition-colors">
                {t('auth.doctorRole')}
                <Stethoscope className="w-5 h-5 text-emerald-700" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                {t('nav.security')}
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                {t('landing.securityUptime')}
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                {t('auth.securePrivateCompliant')}
              </div>
            </div>
          </div>

          {/* Hero Image Mockup */}
          <div className="relative mx-auto w-full max-w-sm sm:max-w-lg lg:max-w-xl xl:max-w-2xl mt-8 lg:mt-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-50 rounded-full blur-3xl -z-10"></div>
            <img src="/images/hero/hero.png" alt="MediTrack QR Code" className="relative z-10 w-full object-contain sm:scale-110 lg:scale-125" />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-[90rem] mx-auto text-center">
        <div className="text-emerald-800 font-bold text-sm tracking-wider uppercase mb-3">
          {t('landing.howItWorksBadge')}
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          {t('landing.howItWorksTitle')}
        </h2>
        <p className="text-gray-600 mb-16 max-w-2xl mx-auto text-lg leading-relaxed">
          {t('landing.howItWorksDesc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 lg:gap-x-8 lg:gap-y-14 w-full pt-8 max-w-7xl mx-auto">
          {[
            { step: 1, title: t('landing.step1Title'), desc: t('landing.step1Desc'), img: '/images/how-it-works/step-1.png' },
            { step: 2, title: t('landing.step2Title'), desc: t('landing.step2Desc'), img: '/images/how-it-works/step-2.png' },
            { step: 3, title: t('landing.step3Title'), desc: t('landing.step3Desc'), img: '/images/how-it-works/step-3.png' },
            { step: 4, title: t('landing.step4Title'), desc: t('landing.step4Desc'), customVisual: <Step4Visual /> },
            { step: 5, title: t('landing.step5Title'), desc: t('landing.step5Desc'), customVisual: <Step5Visual /> }
          ].map((item) => (
            <div key={item.step} className="relative w-full flex flex-col items-center h-full group">
              <div className="w-12 h-12 rounded-full bg-[#0b3b2c] text-white flex items-center justify-center text-lg font-bold absolute -top-6 z-10 border-4 border-[#F8FAF9] shadow-sm">
                {item.step}
              </div>
              <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md border border-gray-100 pt-8 w-full flex flex-col items-center flex-1 transition-all duration-300 group-hover:-translate-y-1">
                <h3 className="font-bold text-gray-900 text-xl mb-3 text-center px-4">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center mb-8 px-4">{item.desc}</p>
                <div className="w-full flex-1 flex items-center justify-center min-h-[220px] p-4">
                  {item.customVisual ? item.customVisual : <img src={item.img} alt={item.title} className="w-[85%] max-w-[240px] h-auto object-contain drop-shadow-sm" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* For Patients / For Doctors Split */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col xl:flex-row gap-8 lg:gap-12">
          {/* For Patients */}
          <div id="for-patients" className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-row items-center overflow-hidden relative flex-1">
            <div className="p-6 sm:p-8 flex-1 z-10 relative">
              <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3 text-base md:text-lg">
                <UserCircle className="w-5 h-5" />
                {t('landing.forPatientsTitle')}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-5 max-w-sm tracking-tight">
                {t('landing.heroTitle2')},<br />
                {t('landing.forPatientsPoint2')}
              </h2>
              <ul className="space-y-3 mb-8 text-sm">
                {[
                  t('landing.forPatientsPoint1'),
                  t('landing.forPatientsPoint2'),
                  t('landing.forPatientsPoint3')
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-gray-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/patient/signup" className="text-emerald-700 font-bold flex items-center gap-2 border border-emerald-200 px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors w-fit text-sm">
                {t('landing.getStartedFree')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="w-[45%] sm:w-[50%] flex items-center justify-center p-2 shrink-0 relative overflow-hidden">
              <img src="/images/for-patients/for-patients.png" alt="Patient using app" className="w-full max-w-[280px] h-auto object-contain drop-shadow-sm scale-105 origin-right" />
            </div>
          </div>

          {/* For Doctors */}
          <div id="for-doctors" className="bg-[#f2f9f5] rounded-3xl shadow-sm border border-emerald-100 flex flex-row items-center overflow-hidden relative flex-1">
            <div className="p-6 sm:p-8 flex-1 z-10 relative">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3 text-base md:text-lg">
                <Stethoscope className="w-5 h-5" />
                {t('landing.forDoctorsTitle')}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-5 max-w-sm tracking-tight">
                {t('landing.forDoctorsPoint1')}
              </h2>
              <ul className="space-y-3 mb-8 text-sm">
                {[
                  t('landing.forDoctorsPoint1'),
                  t('landing.forDoctorsPoint2'),
                  t('landing.forDoctorsPoint3')
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-gray-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/doctor/signup" className="text-emerald-800 font-bold flex items-center gap-2 border border-emerald-300 px-5 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors bg-white/60 w-fit text-sm">
                {t('landing.getStartedFree')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="w-[45%] sm:w-[50%] flex items-center justify-center p-2 shrink-0 relative overflow-hidden">
              <img src="/images/for-doctors/for-dcctors.png" alt="Doctor using tablet" className="w-full max-w-[280px] h-auto object-contain drop-shadow-sm scale-105 origin-right" />
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Section */}
      <section id="security" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 lg:p-12 shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          <div className="flex-1">
            <div className="text-emerald-700 font-bold text-sm tracking-wider uppercase mb-4">
              {t('landing.securityBadge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
              {t('landing.securityTitle')}
            </h2>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              {t('landing.securityDesc')}
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { icon: <LockKeyhole className="w-4 h-4" />, text: t('landing.secCard1Title') + ' - ' + t('landing.secCard1Desc') },
                { icon: <History className="w-4 h-4" />, text: t('landing.secCard2Title') + ' - ' + t('landing.secCard2Desc') },
                { icon: <Settings className="w-4 h-4" />, text: t('landing.secCard3Title') + ' - ' + t('landing.secCard3Desc') },
                { icon: <QrCode className="w-4 h-4" />, text: t('patient.qrPrivacyNotice') }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-medium leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <img src="/images/history-access-req/manage.png" alt="History Access Request Mockup" className="w-full max-w-[280px] h-auto object-contain drop-shadow-xl" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-[#0b3b2c] rounded-3xl p-8 sm:p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10 shadow-xl">
          <div className="max-w-xl">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 tracking-tight">
              {t('auth.smartCare')} {t('auth.betterOutcomes')}
            </h2>
            <p className="text-emerald-100 text-base sm:text-lg leading-relaxed">
              {t('landing.heroDesc')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link to="/role-selection" className="flex items-center justify-center gap-2 bg-white text-emerald-900 px-8 py-4 rounded-xl text-base sm:text-lg font-bold hover:bg-emerald-50 transition-colors shadow-md">
              {t('landing.getStartedFree')}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/doctor/signup" className="flex items-center justify-center gap-2 bg-transparent text-white border-2 border-emerald-400 px-8 py-4 rounded-xl text-base sm:text-lg font-bold hover:bg-emerald-800 transition-colors">
              {t('auth.doctorRole')}
              <Stethoscope className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <div id="about-us">
        <Footer />
      </div>
    </div>
  );
}
