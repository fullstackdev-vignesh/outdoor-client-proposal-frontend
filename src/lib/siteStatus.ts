import type { MediaStatus } from '@/lib/types';

// Site media statuses in display order — labels, filter/dropdown options and colours all come
// from here so every page shows them the same way.
export const MEDIA_STATUS_LIST: MediaStatus[] = ['immediate', 'blocked', 'confirmed', 'booked', 'hold', 'issue'];

export const STATUS_LABELS: Record<MediaStatus, string> = {
  immediate: 'Immediate',
  booked: 'Booked',
  blocked: 'Blocked',
  confirmed: 'Confirmed',
  hold: 'Hold',
  issue: 'Issue',
};

export const MEDIA_STATUS_OPTIONS = MEDIA_STATUS_LIST.map((value) => ({ value, label: STATUS_LABELS[value] }));

// Blocked / Confirmed (customer + dates + reason) / Hold / Issue (reason) need extra details.
export const MANUAL_STATUSES: MediaStatus[] = ['blocked', 'confirmed', 'hold', 'issue'];

// Blocked and Confirmed share one flow: a customer over its own Start/End Date (Site.blockInfo).
export type DatedStatus = 'blocked' | 'confirmed';
export const isDatedStatus = (s?: string): s is DatedStatus => s === 'blocked' || s === 'confirmed';

export const statusLabel = (status?: string) => (status && STATUS_LABELS[status as MediaStatus]) || status || '-';
