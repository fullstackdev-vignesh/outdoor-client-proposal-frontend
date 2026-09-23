import type { MediaStatus } from '@/lib/types';

type BadgeStatus = MediaStatus | 'cancelled';

const STYLES: Record<BadgeStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  booked: 'bg-blue-50 text-blue-700 border-blue-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const LABELS: Record<BadgeStatus, string> = {
  available: 'AVAILABLE',
  booked: 'BOOKED',
  blocked: 'BLOCKED',
  cancelled: 'CANCELLED',
};

const DOT_STYLES: Record<BadgeStatus, string> = {
  available: 'bg-emerald-500',
  booked: 'bg-blue-500',
  blocked: 'bg-red-500',
  cancelled: 'bg-slate-400',
};

export default function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status]}`} />
      {LABELS[status]}
    </span>
  );
}
