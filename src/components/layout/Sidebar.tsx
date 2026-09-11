'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getNavForRole } from '@/lib/nav';

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return null;
  const items = getNavForRole(user.role);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200">
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-900">Outdoor</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
