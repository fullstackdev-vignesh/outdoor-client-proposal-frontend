'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ArrowLeft, KeyRound, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

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
    <div className="flex items-center justify-center gap-3 my-2">
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
          className={`w-12 h-12 text-center text-lg font-bold rounded-xl border transition focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-red-600'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900 bg-slate-50/50 focus:bg-white'
          }`}
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const { forgotPin, resetPin } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [devPin, setDevPin] = useState('');

  const [tempPin, setTempPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleIdentifierChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIdentifier(e.target.value);
    setError('');
  }

  async function handleSendPinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setDevPin('');

    if (!identifier.trim()) {
      setError('Phone number or email is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await forgotPin(identifier.trim());
      setTargetEmail(res.email || identifier);
      setSuccessMsg(res.message || 'A temporary PIN has been sent to your registered email.');
      if (res.pin) {
        setDevPin(res.pin);
        setTempPin(res.pin);
      }
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send temporary PIN. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!tempPin || !/^\d{4}$/.test(tempPin)) {
      setError('Temporary 4-digit PIN is required.');
      return;
    }

    if (!newPin || !/^\d{4}$/.test(newPin)) {
      setError('New MPIN must be exactly 4 numeric digits.');
      return;
    }

    if (!confirmPin || newPin !== confirmPin) {
      setError('New MPIN and Confirm MPIN do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPin({
        identifier: identifier.trim(),
        temporaryPin: tempPin,
        newPin,
        confirmPin,
      });
      setStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset MPIN.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Outdoor</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-8">
          {step === 1 && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Reset your MPIN</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Enter your registered Phone Number or Email to receive a temporary 4-digit PIN on your email.
              </p>

              <form noValidate onSubmit={handleSendPinSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Phone Number or Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    placeholder="Registered phone or email"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                  />
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
                  Send Temporary PIN
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Create New MPIN</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Enter the temporary PIN sent to your email and a new 4-digit MPIN for{' '}
                <span className="font-semibold text-slate-800">{targetEmail || identifier}</span>
              </p>

              {devPin && (
                <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-800 font-medium text-center">
                  [DEV MODE] Temporary PIN: <span className="font-bold text-slate-900 text-sm tracking-wider">{devPin}</span>
                </div>
              )}

              {successMsg && !devPin && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800 font-medium">
                  <MailCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form noValidate onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-center">
                    Temporary 4-Digit PIN <span className="text-red-500">*</span>
                  </label>
                  <MpinBoxInput idPrefix="temp" value={tempPin} onChange={setTempPin} hasError={!!error} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-center">
                    New 4-Digit MPIN <span className="text-red-500">*</span>
                  </label>
                  <MpinBoxInput idPrefix="reset-new" value={newPin} onChange={setNewPin} hasError={!!error} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-center">
                    Confirm New 4-Digit MPIN <span className="text-red-500">*</span>
                  </label>
                  <MpinBoxInput idPrefix="reset-confirm" value={confirmPin} onChange={setConfirmPin} hasError={!!error} />
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
                  Reset MPIN
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-10 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-900">MPIN Reset Successfully</h2>
              <p className="text-sm text-slate-500">
                Your 4-digit MPIN has been updated. You can now log in with your new MPIN.
              </p>
              <Link
                href="/login"
                className="inline-block w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-200"
              >
                Sign In Now
              </Link>
            </div>
          )}

          {step !== 3 && (
            <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:underline font-bold">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
