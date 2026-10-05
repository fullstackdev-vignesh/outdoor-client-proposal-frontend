import type { MediaStatus } from '@/lib/types';

type BadgeStatus = MediaStatus | 'cancelled' | 'updated';

const STYLES: Record<BadgeStatus, string> = {
  immediate: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  booked: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  blocked: 'bg-rose-50 text-rose-700 border-rose-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  hold: 'bg-orange-50 text-orange-700 border-orange-200',
  issue: 'bg-purple-50 text-purple-700 border-purple-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  updated: 'bg-sky-50 text-sky-700 border-sky-200',
};

const LABELS: Record<BadgeStatus, string> = {
  immediate: 'IMMEDIATE',
  booked: 'BOOKED',
  blocked: 'BLOCKED',
  confirmed: 'CONFIRMED',
  hold: 'HOLD',
  issue: 'ISSUE',
  cancelled: 'CANCELLED',
  updated: 'UPDATED',
};

const DOT_STYLES: Record<BadgeStatus, string> = {
  immediate: 'bg-emerald-500',
  booked: 'bg-yellow-400',
  blocked: 'bg-rose-500',
  confirmed: 'bg-blue-500',
  hold: 'bg-orange-500',
  issue: 'bg-purple-500',
  cancelled: 'bg-slate-400',
  updated: 'bg-sky-500',
};

export default function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] || STYLES.cancelled}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status] || DOT_STYLES.cancelled}`} />
      {LABELS[status] || String(status).toUpperCase()}
    </span>
  );
}
