'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import favicon from '@/images/favicon.png';
import { useAuth } from '@/lib/auth-context';
import { getNavForRole } from '@/lib/nav';

const STORAGE_KEY = 'sidebar-collapsed';

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  // Safe to read storage during init: the app layout only mounts the sidebar on the client,
  // after auth has resolved, so there is no server markup to mismatch.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? '0' : '1');
      } catch {}
      return !c;
    });
  };

  if (!user) return null;
  const items = getNavForRole(user.role);

  // Fades labels out while the width animates, so text never wraps mid-transition.
  const labelClass = `whitespace-nowrap transition-opacity duration-200 ${
    collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-100'
  }`;

  return (
    <aside
      className={`relative hidden lg:flex shrink-0 flex-col border-r border-white/10 bg-[#1c1a1a] transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#2a2727] text-slate-300 shadow-md transition hover:bg-red-600 hover:text-white"
      >
        <ChevronLeft
          className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
        />
      </button>

      <div className="flex items-center gap-3 px-5 h-20 border-b border-white/10 overflow-hidden">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <Image src={favicon} alt="Outdoor" className="h-full w-full object-contain" priority />
        </div>
        <div className={`leading-tight ${labelClass}`}>
          <span className="block font-bold text-white">Outdoor</span>
          <span className="block text-[10px] font-semibold tracking-widest text-slate-400">PORTAL</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-5 px-3 space-y-1.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition border-l-[3px] ${
                active
                  ? 'bg-[#3b1f1f] border-red-500 ring-1 ring-inset ring-red-900/60 text-white font-semibold'
                  : 'border-transparent font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-red-500' : 'text-slate-400'}`} />
              <span className={labelClass}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
