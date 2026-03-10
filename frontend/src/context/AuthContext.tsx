import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, loginDemoApi, checkAuthApi } from '../api/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  role: 'admin' | 'demo' | null;
  isDemo: boolean;
  login: (password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  role: null,
  isDemo: false,
  login: async () => {},
  loginDemo: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'demo' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    checkAuthApi(token)
      .then((data) => {
        setIsAuthenticated(true);
        setRole((data.role as 'admin' | 'demo') || 'admin');
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('role');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (password: string) => {
    const data = await loginApi(password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('role', 'admin');
    setRole('admin');
    setIsAuthenticated(true);
  }, []);

  const loginDemo = useCallback(async () => {
    const data = await loginDemoApi();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('role', 'demo');
    setRole('demo');
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setRole(null);
  }, []);

  const isDemo = role === 'demo';

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, role, isDemo, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
