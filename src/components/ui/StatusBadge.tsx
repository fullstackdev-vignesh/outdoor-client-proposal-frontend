import type { MediaStatus } from '@/lib/types';

const STYLES: Record<MediaStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  booked: 'bg-blue-50 text-blue-700 border-blue-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
};

const LABELS: Record<MediaStatus, string> = {
  available: 'AVAILABLE',
  booked: 'BOOKED',
  blocked: 'BLOCKED',
};

export default function StatusBadge({ status }: { status: MediaStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'available' ? 'bg-emerald-500' : status === 'booked' ? 'bg-blue-500' : 'bg-red-500'
        }`}
      />
      {LABELS[status]}
    </span>
  );
}
