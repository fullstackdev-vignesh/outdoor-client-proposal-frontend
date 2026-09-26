'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCog,
  UserCheck,
  Building2,
  CheckCircle2,
  XCircle,
  CircleDot,
  CalendarCheck,
  FileText,
  Contact2,
  PlusCircle,
  Upload,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/api';
import Loader from '@/components/ui/Loader';
import { useAuth } from '@/lib/auth-context';
import { StatCard, Panel } from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';

interface DashboardStats {
  cards: Record<string, number>;
  mediaStatusSummary: { available: number; booked: number; blocked: number };
  recent: {
    sites: any[];
    clients: any[];
    bookings: any[];
    proposals: any[];
    users: any[];
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateLabel(value?: string | Date) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <Loader fullPage size="lg" text="Loading dashboard..." />;
  }

  const { cards, mediaStatusSummary, recent } = stats;

  const cardDefs = [
    { key: 'totalUsers', label: 'Total Users', icon: Users, accent: 'blue', roles: ['admin'] },
    { key: 'totalTLs', label: 'Total TLs', icon: UserCog, accent: 'blue', roles: ['admin'] },
    { key: 'totalBDs', label: 'Total BDs', icon: UserCheck, accent: 'blue', roles: ['admin'] },
    { key: 'totalSites', label: 'Total Sites', icon: Building2, accent: 'blue' },
    { key: 'activeSites', label: 'Active Sites', icon: CheckCircle2, accent: 'emerald' },
    // { key: 'inactiveSites', label: 'Inactive Sites', icon: XCircle, accent: 'slate' },
    { key: 'availableMedia', label: 'Available Media', icon: CircleDot, accent: 'emerald' },
    { key: 'bookedMedia', label: 'Booked Media', icon: CalendarCheck, accent: 'blue' },
    { key: 'blockedMedia', label: 'Blocked Media', icon: XCircle, accent: 'red' },
    { key: 'totalClients', label: 'Total Clients', icon: Contact2, accent: 'blue' },
    { key: 'totalProposals', label: 'Total Proposals', icon: FileText, accent: 'amber' },
    { key: 'totalBookings', label: 'Total Bookings', icon: CalendarCheck, accent: 'blue' },
  ].filter((c) => !c.roles || c.roles.includes(user?.role || ''));

  const total = mediaStatusSummary.available + mediaStatusSummary.booked + mediaStatusSummary.blocked || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your outdoor media business</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {cardDefs.map((c) => (
          <StatCard key={c.key} label={c.label} value={cards[c.key] ?? 0} icon={c.icon} accent={c.accent as any} />
        ))}
      </div>

      <Panel title="Media Status Summary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              ['available', 'Available', mediaStatusSummary.available, 'bg-emerald-500'],
              ['booked', 'Booked', mediaStatusSummary.booked, 'bg-blue-500'],
              ['blocked', 'Blocked', mediaStatusSummary.blocked, 'bg-red-500'],
            ] as const
          ).map(([key, label, value, color]) => (
            <div key={key} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={key as any} />
                <span className="text-lg font-bold text-slate-900">{value.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${(value / total) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </Panel>

      {user?.role === 'admin' && (
        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Add Site', href: '/sites?action=add', icon: PlusCircle },
              { label: 'Bulk Upload Sites', href: '/sites/bulk-upload', icon: Upload },
              { label: 'Add Client', href: '/clients?action=add', icon: UserPlus },
              { label: 'Create Proposal', href: '/proposals/new', icon: FileText },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 transition"
              >
                <a.icon className="h-5 w-5 text-blue-600" />
                {a.label}
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Recent Sites">
          <ul className="divide-y divide-slate-100">
            {recent.sites.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{s.mediaCode || s.mediaId || s.mediaName}</p>
                  <p className="text-xs text-slate-400">{s.city}, {s.state}</p>
                </div>
                <StatusBadge status={s.mediaStatus} />
              </li>
            ))}
            {recent.sites.length === 0 && <p className="text-sm text-slate-400 py-4">No sites yet</p>}
          </ul>
        </Panel>

        <Panel title="Recent Clients">
          <ul className="divide-y divide-slate-100">
            {recent.clients.map((c) => (
              <li key={c._id} className="py-2.5 text-sm">
                <p className="font-medium text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{c.email || c.phone}</p>
              </li>
            ))}
            {recent.clients.length === 0 && <p className="text-sm text-slate-400 py-4">No clients yet</p>}
          </ul>
        </Panel>

        <Panel title="Recent Bookings">
          <ul className="divide-y divide-slate-100">
            {recent.bookings.map((b: any) => {
              const clientNameLabel =
                b.clientName && b.clientName !== '-'
                  ? b.clientName
                  : typeof b.client === 'object' && b.client?.name
                  ? b.client.name
                  : '';
              const dateRangeLabel =
                b.startDate && b.endDate
                  ? `${formatDateLabel(b.startDate)} → ${formatDateLabel(b.endDate)}`
                  : '';
              return (
                <li key={b.id || b._id || b.bookingId} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">
                      {b.mediaCode || b.mediaId}
                      {b.mediaType ? ` · ${b.mediaType}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {clientNameLabel && dateRangeLabel
                        ? `${clientNameLabel} (${dateRangeLabel})`
                        : clientNameLabel || (dateRangeLabel ? `(${dateRangeLabel})` : '')}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold capitalize px-2 py-0.5 rounded border ${
                      b.status === 'cancelled'
                        ? 'bg-red-50 text-red-700 border-red-100'
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}
                  >
                    {b.status || 'booked'}
                  </span>
                </li>
              );
            })}
            {recent.bookings.length === 0 && <p className="text-sm text-slate-400 py-4">No bookings yet</p>}
          </ul>
        </Panel>

        <Panel title="Recent Proposals">
          <ul className="divide-y divide-slate-100">
            {recent.proposals.map((p) => (
              <li key={p._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{p.proposalId}</p>
                  <p className="text-xs text-slate-400">{typeof p.client === 'object' ? p.client?.name : ''}</p>
                </div>
                <span className="text-xs font-medium text-slate-500 capitalize">{p.status}</span>
              </li>
            ))}
            {recent.proposals.length === 0 && <p className="text-sm text-slate-400 py-4">No proposals yet</p>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
