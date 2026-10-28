import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, authToken: string) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const refreshAuth = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return;

    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (err) {
      console.error('Failed to refresh authentication status', err);
      logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUserStr = localStorage.getItem('user');

      if (storedToken && storedUserStr) {
        try {
          const parsedUser = JSON.parse(storedUserStr);
          setToken(storedToken);
          setUser(parsedUser);

          // Verify with server
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (response.data?.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        } catch (e) {
          console.error("Token verification failed, logging out", e);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshAuth,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
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
