'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { formatISTDate } from '@/lib/date';
import type { BookingRecord, Site } from '@/lib/types';

// Cancels ONE Upcoming booking on a site that is currently Available (Available → Available isn't
// a status change, so the row's Save button can't do it). Uses the same per-booking cancel
// endpoint as Edit Site → Booking Details; the backend then recalculates the site's status.
export default function CancelUpcomingBookingModal({
  open,
  onClose,
  site,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  site: Site | null;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const upcoming = (site?.bookings || [])
    .filter((b) => b.status === 'upcoming')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBookingId(upcoming[0]?.bookingId || '');
    setReason('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, site]);

  function customerName(b: BookingRecord) {
    return b.customerName || (typeof b.client === 'object' ? b.client?.name : undefined) || '-';
  }

  async function submit() {
    if (!site || !bookingId || !reason.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/sites/${site._id}/bookings/${bookingId}/cancel`, { reason: reason.trim(), source: 'inventory' });
      showToast('Upcoming booking cancelled successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to cancel booking', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!site) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Cancel Upcoming Booking — ${site.mediaCode || site.mediaId}`} size="md">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Upcoming Booking{upcoming.length > 1 ? 's' : ''}</p>
          {upcoming.map((b) => (
            <label
              key={b.bookingId}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${
                bookingId === b.bookingId ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="upcoming-booking"
                checked={bookingId === b.bookingId}
                onChange={() => setBookingId(b.bookingId)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-800">{customerName(b)}</span>
                <span className="block text-xs text-amber-700">
                  {formatISTDate(b.startDate)} → {formatISTDate(b.endDate)}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Reason *</label>
          <textarea
            placeholder="e.g. Client rejected the booking"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputCls}
            rows={2}
            required
          />
        </div>

        <p className="text-xs text-slate-500">The site stays Available. The cancelled booking is kept in the site&apos;s timeline.</p>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Close
          </button>
          <button
            onClick={submit}
            disabled={!bookingId || !reason.trim() || saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';
