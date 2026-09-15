'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import type { AuthUser, Role } from './types';

export interface RegisterData {
  userName: string;
  userEmail?: string;
  userPhone: string;
  password: string;
  confirmPassword: string;
  userType: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string, role: Role) => Promise<void>;
  register: (data: RegisterData) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('outdoor_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(identifier: string, password: string, role: Role) {
    const { data } = await api.post('/auth/login', { email: identifier, identifier, phone: identifier, password, role });
    localStorage.setItem('outdoor_token', data.token);
    localStorage.setItem('outdoor_user', JSON.stringify(data.user));
    setUser(data.user);
    router.push('/dashboard');
  }

  async function register(data: RegisterData) {
    const res = await api.post('/auth/register', data);
    const token = res.data?.token;
    const userData = res.data?.user;
    if (token && userData) {
      localStorage.setItem('outdoor_token', token);
      localStorage.setItem('outdoor_user', JSON.stringify(userData));
      setUser(userData);
      router.push('/dashboard');
    }
    return res.data;
  }

  function logout() {
    localStorage.removeItem('outdoor_token');
    localStorage.removeItem('outdoor_user');
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
