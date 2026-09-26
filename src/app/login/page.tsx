'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';
import loginBg from '@/images/login-bg.png';

const roleOptions: { key: Role; label: string; fullLabel: string }[] = [
  { key: 'user', label: 'USER', fullLabel: 'User' },
  { key: 'tl', label: 'TL', fullLabel: 'Team Leader' },
  { key: 'bd', label: 'BD', fullLabel: 'BD' },
  { key: 'admin', label: 'ADMIN', fullLabel: 'Admin' },
];

function MpinInput({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
}) {
  const digits = value.padEnd(4, '').slice(0, 4).split('');

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value.replace(/\D/g, '');
    if (!inputVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join('').trim());
      return;
    }

    const char = inputVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join('');
    onChange(combined);

    if (index < 3 && char) {
      const nextInput = document.getElementById(`login-mpin-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const prevInput = document.getElementById(`login-mpin-box-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      onChange(pasted);
      const targetIndex = Math.min(pasted.length - 1, 3);
      const targetInput = document.getElementById(`login-mpin-box-${targetIndex}`);
      targetInput?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 my-4">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          id={`login-mpin-box-${i}`}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-14 h-14 text-center text-xl font-bold rounded-2xl border transition focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-red-600'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900 bg-slate-50/50 focus:bg-white'
          }`}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [error, setError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneDigitsRegex = /^\d+$/;

  const currentRoleObj = roleOptions.find((r) => r.key === role) || roleOptions[0];

  function validateIdentifier(val: string): string {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Mobile Number or Email is required.';
    }

    if (phoneDigitsRegex.test(trimmed)) {
      if (trimmed.length !== 10) {
        return 'Mobile number must be exactly 10 digits.';
      }
      return '';
    }

    if (trimmed.includes('@') || /[a-zA-Z]/.test(trimmed)) {
      if (!emailRegex.test(trimmed)) {
        return 'Please enter a valid email address.';
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

  function handleContinueStep1() {
    setError('');
    setIdentifierError('');
    const idErr = validateIdentifier(identifier);
    if (idErr) {
      setIdentifierError(idErr);
      setError(idErr);
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      handleContinueStep1();
      return;
    }

    setError('');
    setPasswordError('');

    if (!password || password.length !== 4) {
      const err = '4-digit MPIN is required.';
      setPasswordError(err);
      setError(err);
      return;
    }

    setSubmitting(true);
    try {
      await login(identifier.trim(), password, role);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Please check your MPIN and credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBg.src})` }}
      />
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-8">
          <form noValidate onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-2xl mb-6">
                  <span>Sign In</span>
                </div>

                <div className="mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    <Building2 className="h-3.5 w-3.5" />
                    {currentRoleObj.fullLabel}
                  </span>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Select Role</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {roleOptions.map((r) => (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => {
                          setRole(r.key);
                          setError('');
                        }}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold transition cursor-pointer ${
                          role === r.key
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Mobile Number / Email
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    placeholder="Enter 10-digit mobile number or email"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                      identifierError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {identifierError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">{identifierError}</p>
                  )}
                </div>

                {/* {error && (
                  <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700 font-medium">
                    {error}
                  </div>
                )} */}

                <button
                  type="button"
                  onClick={handleContinueStep1}
                  className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-200 cursor-pointer"
                >
                  Continue as {currentRoleObj.fullLabel}
                </button>

                {role !== 'admin' && (
                  <div className="mt-6 text-center text-xs text-slate-500">
                    Didn&apos;t have an account?{' '}
                    <Link href={`/register?role=${role}`} className="font-bold text-blue-600 hover:underline">
                      Register
                    </Link>
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                  className="flex items-center gap-2 text-slate-900 font-bold text-2xl mb-1.5 hover:opacity-80 transition cursor-pointer text-left"
                >
                  <span>←</span>
                  <span>Enter MPIN</span>
                </button>

                <p className="text-xs text-slate-500 mb-6">
                  Enter your 4-digit security MPIN to sign in as {currentRoleObj.fullLabel}
                </p>

                <MpinInput
                  value={password}
                  onChange={(val) => {
                    setPassword(val);
                    setPasswordError('');
                    setError('');
                  }}
                  hasError={!!passwordError || !!error}
                />

                <div className="text-right mb-6">
                  <Link href="/forgot-password" className="text-xs font-bold text-blue-600 hover:underline">
                    Forgot MPIN?
                  </Link>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-md shadow-blue-200 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Login
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
