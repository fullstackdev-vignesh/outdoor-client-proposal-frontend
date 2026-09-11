'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Panel } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || '');

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account preferences</p>
      </div>

      <Panel title="Profile">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            showToast('Profile updated successfully');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input disabled value={user?.email} className={`${inputCls} bg-slate-50`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <input disabled value={user?.role} className={`${inputCls} bg-slate-50 capitalize`} />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save Changes
          </button>
        </form>
      </Panel>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
