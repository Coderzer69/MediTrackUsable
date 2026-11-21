import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff,
  ShieldCheck, FileText
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { defaultPatientLanguage } from '../lib/patientLanguages';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

export default function PatientSignup() {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        preferredLanguage: defaultPatientLanguage(i18n?.language),
        name, email, password, role: 'PATIENT'
      });
      if (res.status === 201) {
        const loginRes = await api.post('/auth/login', { email, password });
        login(loginRes.data.token, loginRes.data.user);
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans bg-white">
      {/* Left Column - Information & Branding */}
      <div className="hidden lg:flex flex-col w-[380px] xl:w-[460px] bg-[#f8faf9] border-r border-gray-100 p-10 xl:p-12 relative overflow-y-auto">
        {/* Logo */}
        <Link to="/" className="flex flex-col mb-12">
          <div className="flex items-center gap-2">
            <div className="text-[#0b3b2c]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M7.5 12h2l1.5 -3l2.5 6l1.5 -3h2.5" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-[#0b3b2c] tracking-tight">{t('common.appName')}</span>
          </div>
          <span className="text-[13px] text-gray-500 font-medium mt-1 ml-10">{t('common.tagline')}</span>
        </Link>

        {/* Heading */}
        <h1 className="text-3xl xl:text-[34px] font-extrabold text-gray-900 leading-[1.2] mb-4 tracking-tight">
          {t('auth.joinAsPatient')}
        </h1>
        <p className="text-[15px] text-gray-600 leading-relaxed mb-12">
          {t('auth.patientSignupDesc')}
        </p>

        {/* Features */}
        <div className="flex flex-col gap-6 mt-auto">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-bold text-[14px] text-gray-900 mb-0.5">{t('landing.secCard1Title')}</h4>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t('landing.secCard1Desc')}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-bold text-[14px] text-gray-900 mb-0.5">{t('patient.myRecords')}</h4>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t('landing.forPatientsPoint1')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Signup Form */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        {/* Top Bar */}
        <div className="flex justify-between items-center p-6 sm:p-8">
          <Link to="/role-selection" className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="text-sm font-medium text-gray-500 hidden sm:block">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-emerald-700 hover:text-emerald-800 font-bold ml-1">
                {t('nav.login')}
              </Link>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col items-center px-6 sm:px-12 pb-12 w-full max-w-[680px] mx-auto">
          {/* Header */}
          <div className="text-center mb-10 mt-4">
            <div className="w-16 h-16 rounded-full bg-[#f0fdf7] flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-[#0b3b2c]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              <span className="text-emerald-700">{t('common.patient')}</span> {t('auth.signUp')}
            </h2>
            <p className="text-gray-500 text-[15px] font-medium">{t('auth.patientSignupDesc')}</p>
          </div>

          <form className="w-full flex flex-col gap-5" onSubmit={handleSignup}>
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

            {/* Row 1: Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-900">{t('auth.fullName')}</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('auth.patientNamePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-900">{t('auth.emailLabel')}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px]"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-900">{t('auth.phoneLabel')}</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                <input
                  type="tel"
                  placeholder={t('auth.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-900">{t('auth.passwordLabel')}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-900">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t('auth.confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0b3b2c] hover:bg-[#082a1f] text-white py-3.5 rounded-xl font-bold text-[15px] transition-colors mt-2 shadow-md shadow-emerald-900/10 disabled:opacity-70 cursor-pointer"
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full my-7">
            <div className="h-px bg-gray-100 flex-1"></div>
            <span className="text-[12px] text-gray-400 font-bold uppercase tracking-wider">{t('common.or')}</span>
            <div className="h-px bg-gray-100 flex-1"></div>
          </div>

          {/* Google Login */}
          <div className="flex justify-center w-full [&>div]:w-full">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  const res = await api.post('/auth/oauth-login', {
                    credential: credentialResponse.credential,
                    role: 'PATIENT',
                    preferredLanguage: defaultPatientLanguage(i18n?.language),
                  });
                  const { token, user: authUser } = res.data;
                  login(token, authUser);
                  navigate('/patient/dashboard');
                } catch (err: any) {
                  console.error('Google patient registration error:', err);
                  setError(err.response?.data?.error || 'Google registration failed.');
                }
              }}
              onError={() => {
                setError('Google Sign-In failed or was cancelled.');
              }}
              shape="rectangular"
              size="large"
              logo_alignment="center"
            />
          </div>

          <div className="mt-4 text-center text-[13px] text-gray-500 font-medium">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-emerald-700 hover:text-emerald-800 font-bold">
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
