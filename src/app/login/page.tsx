'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('admin');
  const [error, setError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneDigitsRegex = /^\d+$/;

  function validateInput(val: string): string {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Email or Phone Number is required.';
    }

    if (phoneDigitsRegex.test(trimmed)) {
      if (trimmed.length !== 10) {
        return 'Mobile number must be exactly 10 digits.';
      }
      return '';
    }

    if (trimmed.includes('@') || /[a-zA-Z]/.test(trimmed)) {
      if (!emailRegex.test(trimmed)) {
        return 'Please enter a valid email address (e.g. name@example.com).';
      }
      return '';
    }

    if (trimmed.length < 10 && !trimmed.includes('@')) {
      return 'Mobile number must be 10 digits or enter a valid email address.';
    }

    return '';
  }

  function handleIdentifierChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (/^\d+$/.test(val) && val.length > 10) {
      return;
    }
    setIdentifier(val);
    setError('');
    setIdentifierError('');
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
    setError('');
    setPasswordError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIdentifierError('');
    setPasswordError('');

    const idErr = validateInput(identifier);
    let passErr = '';
    if (!password) {
      passErr = 'Password is required.';
    }

    if (idErr || passErr) {
      setIdentifierError(idErr);
      setPasswordError(passErr);
      setError(idErr || passErr);
      return;
    }

    setSubmitting(true);
    try {
      await login(identifier.trim(), password, role);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Outdoor</h1>
          <p className="text-sm text-slate-500">Outdoor Media Management Platform</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign in to your account</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['admin', 'tl', 'user', 'bd'] as Role[]).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold uppercase transition cursor-pointer ${
                      role === r
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email or Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="you@outdoor.com or Phone Number"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                  identifierError || (error && !identifier)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {identifierError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{identifierError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 pr-10 transition ${
                    passwordError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 z-10 p-1 text-slate-500 hover:text-slate-700 transition focus:outline-none cursor-pointer flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-slate-500" /> : <Eye className="h-5 w-5 text-slate-500" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{passwordError}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span />
              <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition cursor-pointer"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
