'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import type { AuthUser, Role } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, role: Role) => Promise<void>;
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

  async function login(email: string, password: string, role: Role) {
    const { data } = await api.post('/auth/login', { email, password, role });
    localStorage.setItem('outdoor_token', data.token);
    localStorage.setItem('outdoor_user', JSON.stringify(data.user));
    setUser(data.user);
    router.push('/dashboard');
  }

  function logout() {
    localStorage.removeItem('outdoor_token');
    localStorage.removeItem('outdoor_user');
    setUser(null);
    router.push('/login');
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
