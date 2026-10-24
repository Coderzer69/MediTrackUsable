import { ChevronLeft, User, Lock, Shield, HelpCircle, LogOut, ChevronRight, Copy, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface ProfileSettingsProps {
  onBack: () => void;
  profile?: any;
}

type Section = 'menu' | 'personal' | 'password' | 'privacy' | 'notifications' | 'help';

export default function ProfileSettings({ onBack, profile }: ProfileSettingsProps) {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('menu');

  const [formData, setFormData] = useState({
    name: profile?.user?.name || user?.name || 'Patient',
    email: profile?.user?.email || user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.patch('/patient/profile', {
        name: formData.name,
        email: formData.email,
      });
      updateUser({
        name: res.data.user.name,
        email: res.data.user.email,
      });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setActiveSection('menu'), 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setErrorMsg('Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      await api.patch('/patient/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMsg('Password updated successfully!');
      setTimeout(() => setActiveSection('menu'), 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (activeSection === 'personal') {
    return (
      <div className="w-full h-full font-sans animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setActiveSection('menu'); setErrorMsg(''); setSuccessMsg(''); }} className="text-emerald-700 hover:text-emerald-800">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Personal Information</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === 'password') {
    return (
      <div className="w-full h-full font-sans animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setActiveSection('menu'); setErrorMsg(''); setSuccessMsg(''); }} className="text-emerald-700 hover:text-emerald-800">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleUpdatePassword}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === 'privacy' || activeSection === 'notifications' || activeSection === 'help') {
    return (
      <div className="w-full h-full font-sans animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveSection('menu')} className="text-emerald-700 hover:text-emerald-800">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeSection} Settings</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center py-16">
          <p className="text-gray-600 font-semibold mb-1">MediTrack Data Protection</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Your medical records and access permissions are cryptographically verified and guarded by strict role-based access controls.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] mb-6 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-full bg-emerald-100 text-emerald-800 font-bold text-2xl flex items-center justify-center shadow-sm">
            {formData.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-0.5">{formData.name}</h2>
            <p className="text-sm text-gray-500 mb-2">{formData.email}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">QR Identifier:</span>
              <span className="text-xs font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                {profile?.qrCodeIdentifier || '—'}
              </span>
              <button
                onClick={() => profile?.qrCodeIdentifier && navigator.clipboard.writeText(profile.qrCodeIdentifier)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy Identifier"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveSection('personal')}
          className="px-5 py-2.5 bg-white border border-gray-200 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-colors shadow-sm"
        >
          Edit Profile
        </button>
      </div>

      {/* Settings List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden">
        <button
          onClick={() => setActiveSection('personal')}
          className="w-full flex items-center justify-between p-5 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-3.5 text-gray-700 group-hover:text-emerald-700 transition-colors">
            <User className="w-4 h-4" />
            <span className="font-bold text-sm">Personal Information</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 transition-colors" />
        </button>

        <button
          onClick={() => setActiveSection('password')}
          className="w-full flex items-center justify-between p-5 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-3.5 text-gray-700 group-hover:text-emerald-700 transition-colors">
            <Lock className="w-4 h-4" />
            <span className="font-bold text-sm">Change Password</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 transition-colors" />
        </button>

        <button
          onClick={() => setActiveSection('privacy')}
          className="w-full flex items-center justify-between p-5 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-3.5 text-gray-700 group-hover:text-emerald-700 transition-colors">
            <Shield className="w-4 h-4" />
            <span className="font-bold text-sm">Privacy & Security</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 transition-colors" />
        </button>

        <button
          onClick={() => setActiveSection('help')}
          className="w-full flex items-center justify-between p-5 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-3.5 text-gray-700 group-hover:text-emerald-700 transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span className="font-bold text-sm">Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 transition-colors" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors group"
        >
          <div className="flex items-center gap-3.5 text-red-600">
            <LogOut className="w-4 h-4" />
            <span className="font-bold text-sm">Log Out</span>
          </div>
        </button>
      </div>
    </div>
  );
}
