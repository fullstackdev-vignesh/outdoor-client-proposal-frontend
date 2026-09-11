'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ArrowLeft, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Outdoor</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
          {sent ? (
            <div className="text-center space-y-3">
              <MailCheck className="h-10 w-10 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-500">
                If an account exists for {email}, a password reset link has been sent.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Reset your password</h2>
              <p className="text-sm text-slate-500 mb-6">Enter your email and we&apos;ll send you a reset link.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-4"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@outdoor.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Send Reset Link
                </button>
              </form>
            </>
          )}
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
