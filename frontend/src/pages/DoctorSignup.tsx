import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff,
  ShieldCheck, Stethoscope, ChevronDown, FileBadge
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

export default function DoctorSignup() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
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
        name, email, password, role: 'DOCTOR', specialization, licenseNumber
      });
      if (res.status === 201) {
        const loginRes = await api.post('/auth/login', { email, password });
        login(loginRes.data.token, loginRes.data.user);
        navigate('/doctor/dashboard');
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
          {t('auth.joinAsDoctor')}
        </h1>
        <p className="text-[15px] text-gray-600 leading-relaxed mb-12">
          {t('auth.doctorSignupDesc')}
        </p>

        {/* Illustration Mockup */}
        <div className="relative w-full max-w-[280px] mx-auto h-[240px] mb-12 flex items-center justify-center">
          <div className="absolute w-[240px] h-[60px] bg-emerald-50 rounded-full bottom-0 blur-xl"></div>
          <div className="relative w-[160px] h-[200px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 flex flex-col items-center pt-8 px-4 z-10 -ml-10">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-gray-300 rounded-full"></div>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="w-full flex flex-col gap-2.5">
              <div className="h-2 bg-gray-100 rounded-full w-full"></div>
              <div className="h-2 bg-gray-100 rounded-full w-3/4"></div>
              <div className="h-2 bg-gray-100 rounded-full w-5/6"></div>
              <div className="h-2 bg-gray-100 rounded-full w-1/2"></div>
            </div>
          </div>

          <div className="absolute z-20 right-4 top-8">
            <svg width="100" height="180" viewBox="0 0 100 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10 C 80 10 90 40 90 80 C 90 130 50 150 50 150 C 20 150 10 130 10 90" stroke="#0b3b2c" strokeWidth="8" strokeLinecap="round" fill="none" />
              <circle cx="50" cy="150" r="16" fill="#0b3b2c" />
              <circle cx="50" cy="150" r="8" fill="#f8faf9" />
              <path d="M20 90 L 20 120" stroke="#0b3b2c" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Verification Info Box */}
        <div className="bg-[#f2f9f5] rounded-xl p-5 border border-emerald-100 mt-auto flex gap-4">
          <div className="shrink-0 mt-1">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h4 className="font-bold text-[14px] text-gray-900 mb-1">{t('auth.verificationTitle')}</h4>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              {t('auth.verificationPendingDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Signup Form */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        {/* Top Bar */}
        <div className="flex justify-between items-center p-6 sm:p-8 shrink-0">
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
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-[#f0fdf7] flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-[#0b3b2c]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              <span className="text-emerald-700">{t('common.doctor')}</span> {t('auth.signUp')}
            </h2>
            <p className="text-gray-500 text-[15px] font-medium">{t('auth.verificationDesc')}</p>
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
                    placeholder={t('auth.fullNamePlaceholder')}
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

            {/* Row 2: Phone and Specialization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-900">{t('auth.specializationLabel')}</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <select
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px] appearance-none bg-white text-gray-600 cursor-pointer"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                  >
                    <option value="" disabled>{t('auth.selectSpecialization')}</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 3: Medical License */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-900">{t('auth.medicalLicense')}</label>
              <div className="relative">
                <FileBadge className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                <input
                  type="text"
                  placeholder={t('auth.licensePlaceholder')}
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px]"
                />
              </div>
            </div>

            {/* Row 4: Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
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
                    role: 'DOCTOR',
                  });
                  const { token, user: authUser } = res.data;
                  login(token, authUser);
                  if (authUser.role === 'DOCTOR') {
                    navigate('/doctor/dashboard');
                  } else if (authUser.role === 'PATIENT') {
                    navigate('/patient/dashboard');
                  } else if (authUser.role === 'ADMIN') {
                    navigate('/admin/dashboard');
                  }
                } catch (err: any) {
                  console.error('Google doctor registration error:', err);
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
