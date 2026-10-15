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
  // Only dates are shown here — customer names and reasons are in the status details popup.
  const showBookingLines = site.mediaStatus === 'immediate' || site.mediaStatus === 'booked';
  const block = site.blockInfo;
  const blockPeriod = block?.startDate && block?.endDate ? `${dateLabel(block.startDate)} → ${dateLabel(block.endDate)}` : '';
  const kindLabel = block?.kind === 'confirmed' ? 'Confirmed' : 'Blocked';
  // A Blocked/Confirmed period set ahead of time, shown under Immediate/Booked until it starts.
  const upcomingBlock = showBookingLines && blockPeriod ? `${block?.kind === 'confirmed' ? 'Confirm' : 'Block'}: ${blockPeriod}` : '';
  // The next period added with "+ Add Blocked/Confirmed" (waits until its Start Date).
  const nextAdded = [...(site.upcomingBlocks || [])].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  return (
    <div className="flex flex-col items-start gap-0.5">
      <StatusBadge status={site.mediaStatus} />
      {(site.mediaStatus === 'blocked' || site.mediaStatus === 'confirmed') && blockPeriod && (
        <span className={`text-[10px] font-medium whitespace-nowrap ${site.mediaStatus === 'confirmed' ? 'text-blue-600' : 'text-rose-600'}`}>
          {kindLabel}: {blockPeriod}
        </span>
      )}
      {upcomingBlock && (
        <span className="text-[10px] font-medium text-rose-500 whitespace-nowrap">
          {upcomingBlock}
        </span>
      )}
      {nextAdded && (
        <span className={`text-[10px] font-medium whitespace-nowrap ${nextAdded.kind === 'confirmed' ? 'text-blue-500' : 'text-rose-500'}`}>
          Upcoming {nextAdded.kind === 'confirmed' ? 'Confirmed' : 'Blocked'}: {dateLabel(nextAdded.startDate)} → {dateLabel(nextAdded.endDate)}
          {(site.upcomingBlocks?.length || 0) > 1 ? ` (+${site.upcomingBlocks!.length - 1})` : ''}
        </span>
      )}
      {showBookingLines && site.mediaStatus === 'booked' && active && (
        <span className="text-[10px] font-medium text-yellow-700 whitespace-nowrap">Active: {periodLabel(active)}</span>
      )}
      {showBookingLines && upcoming && (
        <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">Upcoming: {periodLabel(upcoming)}</span>
      )}
    </div>
  );
}
