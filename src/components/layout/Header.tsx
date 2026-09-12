'use client';

import { useState } from 'react';
import { Bell, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <div>
        <p className="text-sm text-slate-400">Welcome back,</p>
        <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
      </div>
      <div className="flex items-center gap-4">
        {/* <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-50">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button> */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
          >
            <UserCircle className="h-7 w-7 text-slate-400" />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-20">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
