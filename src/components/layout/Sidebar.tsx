'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import favicon from '@/images/favicon.png';
import { useAuth } from '@/lib/auth-context';
import { getNavForRole } from '@/lib/nav';

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return null;
  const items = getNavForRole(user.role);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#1c1a1a]">
      <div className="flex items-center gap-3 px-5 h-20 border-b border-white/10">
        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <Image src={favicon} alt="Outdoor" className="h-full w-full object-contain" priority />
        </div>
        <div className="leading-tight">
          <span className="block font-bold text-white">Outdoor</span>
          <span className="block text-[10px] font-semibold tracking-widest text-slate-400">PORTAL</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition border-l-[3px] ${
                active
                  ? 'bg-[#3b1f1f] border-red-500 ring-1 ring-inset ring-red-900/60 text-white font-semibold'
                  : 'border-transparent font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-red-500' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
