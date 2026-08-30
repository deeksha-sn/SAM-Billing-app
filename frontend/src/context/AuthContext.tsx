import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'OFFICE' | 'SERVICE_MANAGER' | 'SERVICE_TECHNICIAN';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sam_auth_token');
    if (token) {
      apiRequest('/auth/me')
        .then((res) => {
          if (res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('sam_auth_token');
            setUser(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('sam_auth_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('sam_auth_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('sam_auth_token');
    setUser(null);
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
