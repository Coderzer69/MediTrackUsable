import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);

      if (res.data.user.role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else if (res.data.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex w-full font-sans relative">
      {/* Top Bar with Language Switcher */}
      <div className="absolute top-5 right-6 z-30 flex items-center gap-3">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      {/* Left Column - Branding */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-[#f0fdf7] to-[#F8FAF9] p-16 justify-center">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3"></div>

        <div className="absolute top-10 right-10 w-48 h-48" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '16px 16px', opacity: 0.4 }}></div>

        {/* Content */}
        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-16 inline-flex">
            <div className="text-[#0b3b2c]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M7.5 12h2l1.5 -3l2.5 6l1.5 -3h2.5" />
              </svg>
            </div>
            <span className="text-[26px] font-bold text-[#0b3b2c] tracking-tight">{t('common.appName')}</span>
          </Link>

          <h1 className="text-[44px] font-extrabold text-gray-900 leading-[1.1] mb-5 tracking-tight">
            {t('auth.smartCare')} <br />
            <span className="text-emerald-700">{t('auth.betterOutcomes')}</span>
          </h1>

          <p className="text-[17px] text-gray-600 leading-relaxed mb-10 max-w-sm">
            {t('auth.brandTagline')}
          </p>

          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-[14px]">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            {t('auth.securePrivateCompliant')}
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-[480px] bg-white rounded-2xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative z-10">

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-gray-900 mb-2 flex items-center justify-center gap-2">
              {t('auth.welcomeBack')} <span>👋</span>
            </h2>
            <p className="text-gray-500 text-sm font-medium">{t('auth.loginSubtitle')}</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium leading-relaxed">
                {error}
              </div>
            )}
            {infoMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-sm font-medium leading-relaxed">
                {infoMessage}
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-800">{t('auth.emailLabel')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                <input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px] transition-colors bg-gray-50/30"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-bold text-gray-800">{t('auth.passwordLabel')}</label>
                <button
                  type="button"
                  onClick={() => setInfoMessage('Default testing password for all accounts is "password123". For other accounts, contact admin@meditrack.com.')}
                  className="text-[12px] font-bold text-emerald-700 hover:text-emerald-800"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[14.5px] transition-colors bg-gray-50/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0b3b2c] hover:bg-[#082a1f] text-white py-3.5 rounded-xl font-bold text-[15px] transition-colors mt-2 disabled:opacity-70 shadow-sm cursor-pointer"
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-gray-100 flex-1"></div>
            <span className="text-[12px] text-gray-400 font-medium uppercase tracking-wider">
              {t('common.or')}
            </span>
            <div className="h-px bg-gray-100 flex-1"></div>
          </div>

          {/* Social Logins */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-center w-full [&>div]:w-full">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    const res = await api.post('/auth/oauth-login', {
                      credential: credentialResponse.credential,
                    });
                    const { token, user: authUser } = res.data;
                    login(token, authUser);
                    if (authUser.role === 'DOCTOR') {
                      navigate('/doctor/dashboard');
                    } else if (authUser.role === 'ADMIN') {
                      navigate('/admin/dashboard');
                    } else {
                      navigate('/patient/dashboard');
                    }
                  } catch (err: any) {
                    console.error('Google OAuth backend error:', err);
                    setError(err.response?.data?.error || 'Google login failed.');
                  }
                }}
                onError={() => {
                  console.error('Google Login Prompt Error');
                  setError('Google Sign-In failed or was cancelled.');
                }}
                shape="rectangular"
                size="large"
                logo_alignment="center"
              />
            </div>
          </div>

          <div className="mt-8 text-center text-[13px] text-gray-500 font-medium">
            {t('auth.noAccount')}{' '}
            <Link to="/role-selection" className="text-emerald-700 hover:text-emerald-800 font-bold">
              {t('auth.signUp')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
