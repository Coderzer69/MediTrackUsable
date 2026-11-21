import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/access';

const VIEWS = [
  { path: '/admin/dashboard', label: 'Admin dashboard', icon: ShieldCheck },
  { path: '/doctor/dashboard', label: 'Doctor dashboard', icon: Stethoscope },
  { path: '/patient/dashboard', label: 'Patient dashboard', icon: User },
];

type AdminViewSwitcherProps = {
  // 'dark' for use on a dark sidebar.
  tone?: 'light' | 'dark';
};

// Lets an admin jump between every dashboard. Renders nothing for other roles.
export default function AdminViewSwitcher({ tone = 'light' }: AdminViewSwitcherProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!isAdmin(user)) return null;

  return (
    <div className={`mt-4 pt-4 border-t ${tone === 'dark' ? 'border-slate-800/80' : 'border-gray-100'}`}>
      <p className={`pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone === 'dark' ? 'px-3 text-slate-500' : 'px-4 text-gray-400'}`}>
        Admin views
      </p>
      {VIEWS.filter((view) => view.path !== pathname).map(({ path, label, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          className={
            tone === 'dark'
              ? 'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 transition-colors duration-200'
              : 'flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[13.5px] text-gray-600 hover:bg-gray-50 transition-colors'
          }
        >
          <Icon className={tone === 'dark' ? 'w-[18px] h-[18px] text-slate-500 group-hover:text-slate-300 transition-colors' : 'w-[18px] h-[18px]'} />
          {label}
        </Link>
      ))}
    </div>
  );
}
