'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

export default function RegisterPage() {
  const { register, verifyRegisterOtp, resendRegisterOtp } = useAuth();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('user');

  const [otp, setOtp] = useState('');
  const [testOtp, setTestOtp] = useState('');

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleUserTypeMap: Record<Role, number> = {
    user: 1,
    tl: 2,
    admin: 3,
  };

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setSubmitting(true);

    try {
      const res = await register({
        userName: name,
        userEmail: email,
        userPhone: phone,
        registerPassword: password,
        userType: roleUserTypeMap[role],
        role: role,
      });

      if (res.testOtp) {
        setTestOtp(res.testOtp);
      }
      setInfoMsg(res.message || 'OTP sent successfully to your phone.');
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await verifyRegisterOtp(phone, otp);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Verification failed. Invalid OTP.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    setInfoMsg('');
    try {
      const res = await resendRegisterOtp(phone);
      if (res.testOtp) {
        setTestOtp(res.testOtp);
      }
      setInfoMsg(res.message || 'OTP resent successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resend OTP.');
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
          {step === 'form' ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Create an account</h2>
              <p className="text-sm text-slate-500 mb-6">Enter your details to register as a new user</p>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['user', 'tl', 'admin'] as Role[]).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                          role === r
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {r === 'tl' ? 'Team Leader' : r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@outdoor.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-300 pl-3 pr-10 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register & Send OTP
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-4 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to form
              </button>

              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Verify OTP</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">Enter the 4-digit OTP sent to {phone}</p>

              {infoMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {testOtp && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 font-medium text-center">
                  Demo Test OTP: <span className="font-bold text-slate-900 text-sm tracking-wider">{testOtp}</span>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-full text-center tracking-widest text-lg font-bold rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify & Create Account
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            </>
          )}

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
