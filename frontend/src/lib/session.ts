// Per-tab login session.
//
// The active session lives in sessionStorage, which is private to each browser
// tab, so you can be logged in as a doctor in one tab and a patient in another
// without the tabs overwriting each other.
//
// The most recent login is also copied to localStorage so that a brand-new tab
// (or a browser restart) starts out logged in as that account.

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

// Adopt the last login for a fresh tab that has no session of its own yet.
const adoptPersistedSession = () => {
  safe(() => {
    if (sessionStorage.getItem(TOKEN_KEY)) return;
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (token && user) {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, user);
    }
  }, undefined);
};

adoptPersistedSession();

export const getToken = (): string | null =>
  safe(() => sessionStorage.getItem(TOKEN_KEY), null);

export const getStoredUserRaw = (): string | null =>
  safe(() => sessionStorage.getItem(USER_KEY), null);

export const setSession = (token: string, userJson: string) => {
  safe(() => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, userJson);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, userJson);
  }, undefined);
};

export const setStoredUser = (userJson: string) => {
  safe(() => {
    sessionStorage.setItem(USER_KEY, userJson);
    // Only update the persisted copy if it belongs to this tab's session.
    if (localStorage.getItem(TOKEN_KEY) === sessionStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(USER_KEY, userJson);
    }
  }, undefined);
};

export const clearSession = () => {
  safe(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    // Don't log other tabs' accounts out: only clear the persisted copy if it is ours.
    if (token && localStorage.getItem(TOKEN_KEY) === token) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, undefined);
};

export const dashboardPathForRole = (role?: string | null): string => {
  switch (role) {
    case 'DOCTOR':
      return '/doctor/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'PATIENT':
      return '/patient/dashboard';
    default:
      return '/login';
  }
};
