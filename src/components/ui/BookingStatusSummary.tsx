import StatusBadge from './StatusBadge';
import type { BookingRecord, Site } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateLabel(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

function periodLabel(b?: BookingRecord) {
  if (!b) return '';
  return `${dateLabel(b.startDate)} → ${dateLabel(b.endDate)}`;
}

/**
 * Reads the site's own `bookings` array (already kept accurate by the backend's booking
 * reconciliation — see services/bookingScheduler.js) to find the currently active booking
 * and the nearest future one. Same data, same rule, for both /sites and /inventory — never
 * recomputed differently per page.
 */
export function getBookingSummary(site: Site) {
  const bookings = site.bookings || [];
  const active = bookings.find((b) => b.status === 'active');
  const upcoming = bookings
    .filter((b) => b.status === 'upcoming')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return { active, upcoming };
}

/** Status badge + at-a-glance Active/Upcoming booking period, shared by Site and Inventory tables. */
export default function BookingStatusSummary({ site }: { site: Site }) {
  const { active, upcoming } = getBookingSummary(site);
  const showBookingLines = site.mediaStatus !== 'blocked';

  return (
    <div className="flex flex-col items-start gap-0.5">
      <StatusBadge status={site.mediaStatus} />
      {showBookingLines && site.mediaStatus === 'booked' && active && (
        <span className="text-[10px] font-medium text-blue-600 whitespace-nowrap">Active: {periodLabel(active)}</span>
      )}
      {showBookingLines && upcoming && (
        <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">Upcoming: {periodLabel(upcoming)}</span>
      )}
    </div>
  );
}
