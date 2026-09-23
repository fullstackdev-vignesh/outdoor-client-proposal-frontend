'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Building2, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

interface FormErrors {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  registerPassword?: string;
  password?: string;
  confirmPassword?: string;
}

function MpinBoxInput({
  idPrefix,
  value,
  onChange,
  hasError,
}: {
  idPrefix: string;
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
      const nextInput = document.getElementById(`${idPrefix}-mpin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const prevInput = document.getElementById(`${idPrefix}-mpin-${index - 1}`);
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
      const targetInput = document.getElementById(`${idPrefix}-mpin-${targetIndex}`);
      targetInput?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 my-3">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          id={`${idPrefix}-mpin-${i}`}
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

function RegisterContent() {
  const { register } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<number>(1);

  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const pinDigitsRegex = /^\d{4}$/;
  const phoneDigitsRegex = /^\d{10}$/;

  const rolesList = [
    { label: 'USER', type: 1, role: 'user' as Role, passHint: 'Adinn@123' },
    { label: 'TL', type: 2, role: 'tl' as Role, passHint: 'Adinn@1234' },
    { label: 'BD', type: 4, role: 'bd' as Role, passHint: 'Adinn@12345' },
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlRole = new URLSearchParams(window.location.search).get('role');
      if (urlRole) {
        const found = rolesList.find((r) => r.role === urlRole);
        if (found) {
          setUserType(found.type);
        }
      }
    }
  }, []);

  const currentRoleObj = rolesList.find((r) => r.type === userType) || rolesList[0];

  function validateStep1(): FormErrors {
    const errs: FormErrors = {};

    if (!userName.trim()) {
      errs.userName = 'Full Name is required.';
    }

    if (!userPhone.trim()) {
      errs.userPhone = 'Phone number is required.';
    } else if (!phoneDigitsRegex.test(userPhone.trim())) {
      errs.userPhone = 'Phone number must be exactly 10 digits.';
    }

    if (!userEmail.trim()) {
      errs.userEmail = 'Email address is required.';
    } else if (!emailRegex.test(userEmail.trim())) {
      errs.userEmail = 'Please enter a valid email address.';
    }

    if (!registerPassword.trim()) {
      errs.registerPassword = 'Registration password is required.';
    }

    return errs;
  }

  function validateStep2(): FormErrors {
    const errs: FormErrors = {};

    if (!password) {
      errs.password = '4-Digit MPIN is required.';
    } else if (!pinDigitsRegex.test(password)) {
      errs.password = 'MPIN must be exactly 4 numeric digits.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm MPIN is required.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'MPIN and Confirm MPIN do not match.';
    }

    return errs;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const numericVal = e.target.value.replace(/\D/g, '').slice(0, 10);
    setUserPhone(numericVal);
    setFormErrors((prev) => ({ ...prev, userPhone: undefined }));
    setError('');
  }

  function handleContinueStep1() {
    setError('');
    setFormErrors({});

    const errs = validateStep1();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      const firstErr = Object.values(errs)[0];
      setError(firstErr || 'Please fix errors in the form.');
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
    setFormErrors({});

    const errs = validateStep2();
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
        registerPassword: registerPassword.trim(),
        password,
        confirmPassword,
        userType,
        role: currentRoleObj.role,
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

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-8">
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Create an account</h2>
                <p className="text-sm text-slate-500 mb-6">Enter user details to register</p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role / User Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {rolesList.map((r) => (
                      <button
                        type="button"
                        key={r.type}
                        onClick={() => {
                          setUserType(r.type);
                          setFormErrors((prev) => ({ ...prev, registerPassword: undefined }));
                          setError('');
                        }}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold transition cursor-pointer ${
                          userType === r.type
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
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
                    className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                      formErrors.userName
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {formErrors.userName && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.userName}</p>}
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
                    className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                      formErrors.userPhone
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {formErrors.userPhone && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.userPhone}</p>}
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
                    className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                      formErrors.userEmail
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {formErrors.userEmail && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.userEmail}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {currentRoleObj.label} Registration Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setFormErrors((prev) => ({ ...prev, registerPassword: undefined }));
                        setError('');
                      }}
                      placeholder={`Enter ${currentRoleObj.label} registration password`}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 pr-10 transition ${
                        formErrors.registerPassword
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((prev) => !prev)}
                      className="absolute right-2.5 z-10 p-1 text-slate-500 hover:text-slate-700 transition focus:outline-none cursor-pointer flex items-center justify-center"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="h-5 w-5 text-slate-500" /> : <Eye className="h-5 w-5 text-slate-500" />}
                    </button>
                  </div>
                  {formErrors.registerPassword && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.registerPassword}</p>}
                </div>

               

                <button
                  type="button"
                  onClick={handleContinueStep1}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-200 cursor-pointer"
                >
                  Continue
                </button>
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
                  <span>Create MPIN</span>
                </button>

                <p className="text-xs text-slate-500 mb-6">
                  Set a 4-digit security MPIN for {userName} ({userPhone})
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-center">
                    Create 4-Digit MPIN <span className="text-red-500">*</span>
                  </label>
                  <MpinBoxInput
                    idPrefix="create"
                    value={password}
                    onChange={(val) => {
                      setPassword(val);
                      setFormErrors((prev) => ({ ...prev, password: undefined }));
                      setError('');
                    }}
                    hasError={!!formErrors.password}
                  />
                  {formErrors.password && <p className="text-center mt-1 text-xs text-red-600 font-medium">{formErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-center">
                    Confirm 4-Digit MPIN <span className="text-red-500">*</span>
                  </label>
                  <MpinBoxInput
                    idPrefix="confirm"
                    value={confirmPassword}
                    onChange={(val) => {
                      setConfirmPassword(val);
                      setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      setError('');
                    }}
                    hasError={!!formErrors.confirmPassword}
                  />
                  {formErrors.confirmPassword && <p className="text-center mt-1 text-xs text-red-600 font-medium">{formErrors.confirmPassword}</p>}
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-md shadow-blue-200 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
