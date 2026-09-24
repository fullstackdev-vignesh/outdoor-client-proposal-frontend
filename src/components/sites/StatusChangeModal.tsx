'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { todayISO } from '@/lib/date';
import DatePicker from '@/components/ui/DatePicker';
import type { Site, Client, MediaStatus } from '@/lib/types';

function calcDurationDays(start: string, end: string) {
  if (!start || !end) return 0;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

function formatDay(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTHS[d.getUTCMonth()]}`;
}

// 'YYYY-MM-DD' → the previous day, built from UTC parts so there's no timezone shift.
function dayBefore(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return prev.toISOString().slice(0, 10);
}

function calcBookingAmount(monthlyTotalCost: number, durationDays: number) {
  return Math.round(((monthlyTotalCost / 30) * durationDays + Number.EPSILON) * 100) / 100;
}

export default function StatusChangeModal({
  open,
  onClose,
  site,
  onSaved,
  initialStatus,
  source = 'sites',
}: {
  open: boolean;
  onClose: () => void;
  site: Site | null;
  onSaved: () => void;
  initialStatus?: MediaStatus;
  source?: 'sites' | 'inventory';
}) {
  const { showToast } = useToast();
  const [newStatus, setNewStatus] = useState<MediaStatus>('available');
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [customerType, setCustomerType] = useState<'client' | 'agency'>('client');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // A site that's already Booked can take more bookings (another client, later dates) —
  // 'new' adds a separate booking and leaves the current one untouched; 'edit' changes the
  // current booking's client/dates.
  const [bookingMode, setBookingMode] = useState<'new' | 'edit'>('new');

  function fillBookingFields(mode: 'new' | 'edit') {
    const b = site?.bookingInfo;
    if (mode === 'edit' && b) {
      setCustomerType(b.customerType || 'client');
      setClientId(typeof b.client === 'object' ? b.client?._id || '' : b.client || '');
      setStartDate(b.startDate ? b.startDate.slice(0, 10) : '');
      setEndDate(b.endDate ? b.endDate.slice(0, 10) : '');
    } else {
      setCustomerType('client');
      setClientId('');
      setStartDate('');
      setEndDate('');
    }
  }

  function switchBookingMode(mode: 'new' | 'edit') {
    setBookingMode(mode);
    fillBookingFields(mode);
  }

  useEffect(() => {
    if (!site || !open) return;
    setNewStatus(initialStatus || site.mediaStatus);
    setBookingMode('new');
    fillBookingFields('new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site, open, initialStatus]);

  useEffect(() => {
    if (!site || !open) return;

    if (site.mediaStatus === 'blocked' && site.blockInfo) {
      setBlockReason(site.blockInfo.reason || '');
      setBlockNotes(site.blockInfo.notes || '');
    } else {
      setBlockReason('');
      setBlockNotes('');
    }
    setCancellationReason('');

    api.get('/clients', { params: { limit: 200 } }).then((res) => setClients(res.data.items));
  }, [site, open, initialStatus]);

  const monthlyTotalCost = site?.totalCost || site?.monthlyAmount || 0;
  const durationDays = calcDurationDays(startDate, endDate);
  const bookingAmount = calcBookingAmount(monthlyTotalCost, durationDays);
  const validDateRange = !startDate || !endDate || new Date(endDate) >= new Date(startDate);
  // Booked -> Available is really "cancel the booking that's making this site Booked" — never
  // a silent status flip. Only relevant when the site is CURRENTLY Booked.
  const isCancellingBooking = site?.mediaStatus === 'booked' && newStatus === 'available';
  const hasCurrentBooking = site?.mediaStatus === 'booked' && !!site?.bookingInfo;
  // Bookings still in play (active or upcoming) — shown so a new booking can be placed around them.
  const openBookings = (site?.bookings || [])
    .filter((b) => b.status !== 'cancelled' && b.status !== 'completed')
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  // Older bookings saved from this popup have no customerName stored — fall back to the client list.
  function bookingCustomerName(b: (typeof openBookings)[number]) {
    if (b.customerName) return b.customerName;
    if (typeof b.client === 'object' && b.client?.name) return b.client.name;
    const id = typeof b.client === 'object' ? b.client?._id : b.client;
    return clients.find((c) => c._id === id)?.name;
  }

  // Dates taken by OTHER bookings are greyed out in both pickers (when editing, the booking being
  // edited doesn't block itself).
  const editingId = hasCurrentBooking && bookingMode === 'edit' ? site?.bookingInfo?.bookingId : undefined;
  const bookedRanges = openBookings
    .filter((b) => b.bookingId !== editingId && b.startDate && b.endDate)
    .map((b) => ({ start: b.startDate.slice(0, 10), end: b.endDate.slice(0, 10) }));
  // The End Date can't run past the next booking after the chosen Start Date.
  const nextBookedStart = startDate ? bookedRanges.map((r) => r.start).filter((s) => s > startDate).sort()[0] : undefined;
  const endDateMax = nextBookedStart ? dayBefore(nextBookedStart) : undefined;

  async function submit() {
    if (!site) return;
    setSaving(true);
    try {
      const payload: any = { mediaStatus: newStatus, source };
      if (newStatus === 'blocked') {
        payload.blockReason = blockReason;
        payload.blockNotes = blockNotes;
      }
      if (newStatus === 'booked') {
        payload.bookingInfo = {
          customerType,
          client: clientId,
          customerName: clients.find((c) => c._id === clientId)?.name,
          startDate,
          endDate,
        };
        payload.bookingMode = hasCurrentBooking ? bookingMode : 'new';
      }
      if (isCancellingBooking) {
        payload.cancellationReason = cancellationReason.trim();
      }
      await api.patch(`/sites/${site._id}/status`, payload);
      showToast('Media status updated successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  if (!site) return null;

  const canSubmit =
    (newStatus === 'available' && (!isCancellingBooking || !!cancellationReason.trim())) ||
    (newStatus === 'blocked' && !!blockReason) ||
    (newStatus === 'booked' && !!clientId && !!startDate && !!endDate && validDateRange);

  return (
    <>
      <Modal open={open} onClose={onClose} title="Change Media Status" size="md">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Current Status</p>
            <StatusBadge status={site.mediaStatus} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">New Status</p>
            <div className="flex gap-2">
              {(['available', 'booked', 'blocked'] as MediaStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setNewStatus(s)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                    newStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {newStatus === 'available' && !isCancellingBooking && (
            <p className="text-sm text-slate-500">
              This will mark the site as Available. Previous booking/block history is kept for reference.
            </p>
          )}

          {newStatus === 'available' && isCancellingBooking && (
            <div className="space-y-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Cancel Booking / Change to Available</p>
              <p className="text-xs text-slate-500">
                This site is currently Booked. Changing to Available cancels the current booking — this cannot be a silent
                status flip, so a reason is required. If another Upcoming booking still exists, the site will follow that
                booking&apos;s status instead of becoming Available.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Reason *</label>
                <textarea
                  placeholder="e.g. Client rejected the booking"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className={inputCls}
                  rows={2}
                  required
                />
              </div>
            </div>
          )}

          {newStatus === 'blocked' && (
            <div className="space-y-3 rounded-lg bg-red-50 border border-red-100 p-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Block Reason *</label>
                <input
                  placeholder="Enter reason for blocking this site"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <textarea
                  placeholder="Optional notes"
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  className={inputCls}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Blocked Date</label>
                <DatePicker value={todayISO()} disabled />
              </div>
            </div>
          )}

          {newStatus === 'booked' && (
            <div className="space-y-3 rounded-lg bg-blue-50 border border-blue-100 p-3">
              {openBookings.length > 0 && (
                <div className="rounded-lg bg-white border border-blue-200 p-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Existing Bookings</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {openBookings.map((b) => (
                      <li key={b.bookingId} className="flex justify-between gap-2">
                        <span>
                          {b.customerType === 'agency' ? 'Agency' : 'Client'}:{' '}
                          <span className="font-medium text-slate-800">{bookingCustomerName(b) || '-'}</span>
                        </span>
                        <span>
                          {formatDay(b.startDate)} → {formatDay(b.endDate)}
                          <span className="ml-1.5 capitalize text-blue-600">{b.status}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasCurrentBooking && (
                <div className="flex gap-2">
                  {([
                    ['new', '+ Add New Booking'],
                    ['edit', 'Edit Current Booking'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => switchBookingMode(mode)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        bookingMode === mode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {hasCurrentBooking && bookingMode === 'new' && (
                <p className="text-xs text-slate-500">Adds a separate booking — existing bookings are kept. Dates must not overlap them.</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type *</label>
                <div className="flex gap-2">
                  {(['client', 'agency'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomerType(t)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                        customerType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {customerType === 'agency' ? 'Agency' : 'Client'} *
                </label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls} required>
                  <option value="">Select {customerType === 'agency' ? 'agency' : 'client'}</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <DatePicker
                    value={startDate}
                    onChange={(v) => {
                      setStartDate(v);
                      // Clear an End Date that's no longer valid against the new Start Date (before
                      // it, or reaching into another booking) — a still-valid one is left untouched.
                      if (endDate && v && (endDate < v || bookedRanges.some((r) => r.start > v && r.start <= endDate))) {
                        setEndDate('');
                      }
                    }}
                    min={todayISO()}
                    max={endDate || undefined}
                    disabledRanges={bookedRanges}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    min={startDate || undefined}
                    max={endDateMax}
                    disabledRanges={bookedRanges}
                  />
                </div>
              </div>
              {!validDateRange && <p className="text-xs text-red-500">End Date must be on or after Start Date</p>}
              <div className="rounded-lg bg-white border border-blue-200 p-3 text-sm space-y-1">
                <p className="text-slate-600">Monthly Cost: <span className="font-semibold text-slate-800">₹{monthlyTotalCost.toLocaleString()}</span></p>
                <p className="text-slate-600">Duration: <span className="font-semibold text-slate-800">{durationDays} Days</span></p>
                <p className="text-slate-600">Booking Amount: <span className="font-semibold text-emerald-600">₹{bookingAmount.toLocaleString()}</span></p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Update Status
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Status Change"
        message="Are you sure you want to change this media status?"
        confirmLabel={saving ? 'Updating...' : 'Yes, Update'}
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
