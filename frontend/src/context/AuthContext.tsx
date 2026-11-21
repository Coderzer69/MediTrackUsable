import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { getToken, getStoredUserRaw, setSession, setStoredUser, clearSession } from '../lib/session';

type User = {
  id: string;
  name: string;
  email?: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  specialization?: string;
  verificationStatus?: string;
  rejectionReason?: string;
  documentsSubmitted?: boolean;
  qrCodeIdentifier?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshAuth: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = getStoredUserRaw();
    const token = getToken();
    if (storedUser && token) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const refreshAuth = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const res = await api.get('/auth/me');
      const freshUser = res.data.user;
      setStoredUser(JSON.stringify(freshUser));
      setUser(freshUser);
      return freshUser;
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        clearSession();
        setUser(null);
      }
      return null;
    }
  };

  useEffect(() => {
    // Validate / refresh user token on mount
    if (getToken()) {
      refreshAuth();
    }

    const handleAuthExpired = () => {
      setUser(null);
    };

    const handleRoleMismatch = () => {
      refreshAuth();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    window.addEventListener('auth-role-mismatch', handleRoleMismatch);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
      window.removeEventListener('auth-role-mismatch', handleRoleMismatch);
    };
  }, []);

  const login = (token: string, userData: User) => {
    setSession(token, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const updatedUser = { ...currentUser, ...userData };
      setStoredUser(JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateUser, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
