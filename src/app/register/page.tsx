'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface FormErrors {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const { register } = useAuth();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<number>(1);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneDigitsRegex = /^\d+$/;

  const rolesList = [
    { label: 'User', type: 1 },
    { label: 'Team Leader', type: 2 },
    { label: 'Admin', type: 3 },
    { label: 'BD', type: 4 },
  ];

  function validate() {
    const errs: FormErrors = {};

    if (!userName.trim()) {
      errs.userName = 'Full Name is required.';
    }

    if (!userEmail.trim()) {
      errs.userEmail = 'Email address is required.';
    } else if (!emailRegex.test(userEmail.trim())) {
      errs.userEmail = 'Please enter a valid email address.';
    }

    if (!userPhone.trim()) {
      errs.userPhone = 'Phone number is required.';
    } else if (!phoneDigitsRegex.test(userPhone.trim()) || userPhone.trim().length !== 10) {
      errs.userPhone = 'Phone number must be exactly 10 digits.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm Password is required.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Password and Confirm Password do not match.';
    }

    return errs;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (/^\d+$/.test(val) && val.length > 10) {
      return;
    }
    setUserPhone(val);
    setFormErrors((prev) => ({ ...prev, userPhone: undefined }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFormErrors({});

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      const firstErr = Object.values(errs)[0];
      setError(firstErr || 'Please fix errors in the form.');
      return;
    }

    setSubmitting(true);

    try {
      await register({
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userPhone: userPhone.trim(),
        password,
        confirmPassword,
        userType,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Outdoor</h1>
          <p className="text-sm text-slate-500">Outdoor Media Management Platform</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Create an account</h2>
          <p className="text-sm text-slate-500 mb-6">Enter user details to register</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role / User Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {rolesList.map((r) => (
                  <button
                    type="button"
                    key={r.type}
                    onClick={() => setUserType(r.type)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition cursor-pointer ${
                      userType === r.type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  setFormErrors((prev) => ({ ...prev, userName: undefined }));
                  setError('');
                }}
                placeholder="John Doe"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                  formErrors.userName
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {formErrors.userName && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.userName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setFormErrors((prev) => ({ ...prev, userEmail: undefined }));
                  setError('');
                }}
                placeholder="john.doe@example.com"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                  formErrors.userEmail
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {formErrors.userEmail && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.userEmail}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={userPhone}
                onChange={handlePhoneChange}
                placeholder="9876543210 (10 digits)"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                  formErrors.userPhone
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {formErrors.userPhone && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.userPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors((prev) => ({ ...prev, password: undefined }));
                    setError('');
                  }}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 pr-10 transition ${
                    formErrors.password
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
              {formErrors.password && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    setError('');
                  }}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 pr-10 transition ${
                    formErrors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 z-10 p-1 text-slate-500 hover:text-slate-700 transition focus:outline-none cursor-pointer flex items-center justify-center"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-slate-500" /> : <Eye className="h-5 w-5 text-slate-500" />}
                </button>
              </div>
              {formErrors.confirmPassword && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.confirmPassword}</p>}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition cursor-pointer"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Register
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-4">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
