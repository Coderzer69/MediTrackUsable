// Role-based access rules for the dashboards.
// ADMIN is a superuser: it can open every dashboard and use every widget.
// All other roles keep their existing, single-dashboard permissions.

type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';

type AccessUser = {
  role?: Role | string;
  verificationStatus?: string;
} | null | undefined;

export const isAdmin = (user: AccessUser): boolean => user?.role === 'ADMIN';

// Can this user open a dashboard meant for `role`?
export const canAccessRole = (user: AccessUser, role: Role): boolean =>
  isAdmin(user) || user?.role === role;

// Doctor tools (scanning, history, treatments) need an approved doctor, or an admin.
export const canUseDoctorFeatures = (user: AccessUser): boolean =>
  isAdmin(user) || user?.verificationStatus === 'APPROVED';
