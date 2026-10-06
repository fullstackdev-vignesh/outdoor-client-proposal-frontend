'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { todayISO } from '@/lib/date';
import DatePicker from '@/components/ui/DatePicker';
import CustomSelect from '@/components/ui/CustomSelect';
import type { Site, Client, MediaStatus } from '@/lib/types';
import { MEDIA_STATUS_LIST, STATUS_LABELS, isDatedStatus } from '@/lib/siteStatus';
import StatusDetailsFields, {
  BlockDetailsFields,
  blockDetailsError,
  blockDetailsFromSite,
  emptyBlockDetails,
  emptyStatusDetails,
  statusDetailsFromSite,
  statusDetailsValid,
  type BlockDetails,
  type StatusDetails,
} from './StatusDetailsFields';

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
  const [newStatus, setNewStatus] = useState<MediaStatus>('immediate');
  const [statusDetails, setStatusDetails] = useState<StatusDetails>(emptyStatusDetails);
  const [blockDetails, setBlockDetails] = useState<BlockDetails>(emptyBlockDetails);
  // "Immediate" on a site with a block scheduled ahead: also remove that block?
  const [removeBlock, setRemoveBlock] = useState(false);
  const [customerType, setCustomerType] = useState<'client' | 'agency'>('client');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  // Optional reason when moving to Immediate from Blocked / Confirmed / Hold / Issue.
  const [immediateReason, setImmediateReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // A site can hold several bookings (active + upcoming). null adds a separate new booking and
  // leaves the others untouched; a bookingId edits that booking's client/dates.
  const [editBookingId, setEditBookingId] = useState<string | null>(null);

  function fillBookingFields(bookingId: string | null) {
    const b = bookingId ? site?.bookings?.find((x) => x.bookingId === bookingId) : undefined;
    if (b) {
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

  function selectBooking(bookingId: string | null) {
    setEditBookingId(bookingId);
    fillBookingFields(bookingId);
  }

  useEffect(() => {
    if (!site || !open) return;
    setNewStatus(initialStatus || site.mediaStatus);
    setEditBookingId(null);
    fillBookingFields(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site, open, initialStatus]);

  useEffect(() => {
    if (!site || !open) return;

    setBlockDetails(blockDetailsFromSite(site));
    setRemoveBlock(false);
    setCancellationReason('');
    setImmediateReason('');
    setStatusDetails(statusDetailsFromSite(site, initialStatus || site.mediaStatus));

    api.get('/clients', { params: { limit: 200 } }).then((res) => setClients(res.data.items));
  }, [site, open, initialStatus]);

  const monthlyTotalCost = site?.totalCost || site?.monthlyAmount || 0;
  const durationDays = calcDurationDays(startDate, endDate);
  const bookingAmount = calcBookingAmount(monthlyTotalCost, durationDays);
  const validDateRange = !startDate || !endDate || new Date(endDate) >= new Date(startDate);
  // Booked -> Immediate is really "cancel the booking that's making this site Booked" — never
  // a silent status flip. Only relevant when the site is CURRENTLY Booked.
  const isCancellingBooking = site?.mediaStatus === 'booked' && newStatus === 'immediate';
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

  // The site's block (running or scheduled ahead) with its own dates.
  const block = site?.blockInfo?.startDate && site?.blockInfo?.endDate ? site.blockInfo : undefined;
  const blockRange = block ? { start: block.startDate!.slice(0, 10), end: block.endDate!.slice(0, 10) } : null;
  // A Blocked/Confirmed period set ahead (the site doesn't have that status yet).
  const upcomingBlock = !!block && !isDatedStatus(site?.mediaStatus);
  const blockKindLabel = block?.kind === 'confirmed' ? 'confirmation' : 'block';
  // Dates taken by OTHER bookings — and by the block — are greyed out in both booking pickers (when
  // editing, the booking being edited doesn't block itself). Choosing Booked on a currently Blocked
  // site ends that block, so its dates are free then.
  const bookedRanges = [
    ...openBookings
      .filter((b) => b.bookingId !== editBookingId && b.startDate && b.endDate)
      .map((b) => ({ start: b.startDate.slice(0, 10), end: b.endDate.slice(0, 10) })),
    ...(blockRange && upcomingBlock ? [blockRange] : []),
  ];
  // A block can't overlap any booking.
  const bookingRangesForBlock = openBookings
    .filter((b) => b.startDate && b.endDate)
    .map((b) => ({ start: b.startDate.slice(0, 10), end: b.endDate.slice(0, 10) }));
  const blockError = blockDetailsError(blockDetails);
  // The End Date can't run past the next booking after the chosen Start Date.
  const nextBookedStart = startDate ? bookedRanges.map((r) => r.start).filter((s) => s > startDate).sort()[0] : undefined;
  const endDateMax = nextBookedStart ? dayBefore(nextBookedStart) : undefined;

  async function submit() {
    if (!site) return;
    setSaving(true);
    try {
      const payload: any = { mediaStatus: newStatus, source };
      if (isDatedStatus(newStatus)) Object.assign(payload, blockDetails);
      if (newStatus === 'hold' || newStatus === 'issue') Object.assign(payload, statusDetails);
      if (newStatus === 'immediate' && upcomingBlock && removeBlock) payload.removeBlock = true;
      if (newStatus === 'booked') {
        payload.bookingInfo = {
          customerType,
          client: clientId,
          customerName: clients.find((c) => c._id === clientId)?.name,
          startDate,
          endDate,
        };
        payload.bookingMode = editBookingId ? 'edit' : 'new';
        if (editBookingId) payload.bookingId = editBookingId;
      }
      if (isCancellingBooking) {
        payload.cancellationReason = cancellationReason.trim();
      }
      if (newStatus === 'immediate' && !isCancellingBooking && immediateReason.trim()) {
        payload.changeReason = immediateReason.trim();
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
    site.isActive !== false &&
    (newStatus === 'immediate' && (!isCancellingBooking || !!cancellationReason.trim())) ||
    (isDatedStatus(newStatus) && !blockError) ||
    ((newStatus === 'hold' || newStatus === 'issue') && statusDetailsValid(newStatus, statusDetails)) ||
    (newStatus === 'booked' && !!clientId && !!startDate && !!endDate && validDateRange);

  return (
    <>
      <Modal open={open} onClose={onClose} title="Change Media Status" size="md">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Current Status</p>
            <StatusBadge status={site.mediaStatus} />
          </div>
          {site.isActive === false && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              This site is Inactive, so it stays Immediate. Make it Active in Media Master to change its status.
            </p>
          )}

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">New Status</p>
            <div className="flex flex-wrap gap-2">
              {MEDIA_STATUS_LIST.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setNewStatus(s);
                    setStatusDetails(statusDetailsFromSite(site, s));
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    newStatus === s ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {newStatus === 'immediate' && !isCancellingBooking && (
            <div className="space-y-2">
              {/* <p className="text-sm text-slate-500">
                This will mark the site as Immediate (free for proposals). Previous booking/block history is kept for reference.
              </p> */}
              {site.mediaStatus !== 'immediate' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea
                    placeholder="e.g. Client dropped the plan (optional)"
                    value={immediateReason}
                    onChange={(e) => setImmediateReason(e.target.value)}
                    className={inputCls}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          {newStatus === 'immediate' && upcomingBlock && block && (
            <label className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5" checked={removeBlock} onChange={(e) => setRemoveBlock(e.target.checked)} />
              <span>
                Also remove the upcoming {blockKindLabel} ({block.customerName || 'customer'}, {formatDay(block.startDate)} → {formatDay(block.endDate)})
              </span>
            </label>
          )}

          {newStatus === 'immediate' && isCancellingBooking && (
            <div className="space-y-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Cancel Booking / Change to Immediate</p>
              <p className="text-xs text-slate-500">
                This site is currently Booked. Changing to Immediate cancels the current booking — this cannot be a silent
                status flip, so a reason is required. If another Upcoming booking still exists, the site will follow that
                booking&apos;s status instead of becoming Immediate.
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

          {isDatedStatus(newStatus) && (
            <BlockDetailsFields
              kind={newStatus}
              value={blockDetails}
              onChange={setBlockDetails}
              clients={clients}
              bookedRanges={bookingRangesForBlock}
              // A running block keeps its own (past) Start Date when edited.
              minStartDate={isDatedStatus(site.mediaStatus) && blockRange && blockRange.start < todayISO() ? blockRange.start : todayISO()}
            />
          )}

          <StatusDetailsFields status={newStatus} value={statusDetails} onChange={setStatusDetails} />

          {newStatus === 'booked' && (
            <div className="space-y-3 rounded-lg bg-red-50 border border-red-100 p-3">
              {openBookings.length > 0 && (
                <div className="rounded-lg bg-white border border-red-200 p-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Existing Bookings</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {openBookings.map((b) => (
                      <li
                        key={b.bookingId}
                        className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 ${
                          editBookingId === b.bookingId ? 'bg-red-50 ring-1 ring-red-200' : ''
                        }`}
                      >
                        <span>
                          {b.customerType === 'agency' ? 'Agency' : 'Client'}:{' '}
                          <span className="font-medium text-slate-800">{bookingCustomerName(b) || '-'}</span>
                        </span>
                        <span>
                          {formatDay(b.startDate)} → {formatDay(b.endDate)}
                          <span className="ml-1.5 capitalize text-red-600">{b.status}</span>
                          <button
                            type="button"
                            onClick={() => selectBooking(b.bookingId)}
                            className={`ml-2 rounded border px-2 py-0.5 text-[11px] font-medium ${
                              editBookingId === b.bookingId
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                          >
                            {editBookingId === b.bookingId ? 'Editing' : 'Edit'}
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {openBookings.length > 0 && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => selectBooking(null)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
                      !editBookingId
                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                        : 'bg-white text-red-600 border-dashed border-red-300 hover:bg-red-50 hover:border-red-400'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add New Booking
                  </button>
                  <p className="text-xs text-slate-500">
                    {editBookingId
                      ? 'Editing the highlighted booking — other bookings are kept.'
                      : 'Adds a separate booking. Click Edit on a booking above to change it.'}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type *</label>
                <div className="flex gap-2">
                  {(['client', 'agency'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setCustomerType(t);
                        setClientId('');
                      }}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                        customerType === t ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'
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
                <CustomSelect
                  value={clientId}
                  onChange={setClientId}
                  placeholder={`Select ${customerType === 'agency' ? 'agency' : 'client'}`}
                  options={clients
                    .filter((c) => (customerType === 'agency' ? c.customerType === 'agency' : c.customerType !== 'agency'))
                    .map((c) => ({ value: c._id, label: c.name }))}
                  className={inputCls}
                />
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
              <div className="rounded-lg bg-white border border-red-200 p-3 text-sm space-y-1">
                <p className="text-slate-600">Monthly Cost: <span className="font-semibold text-slate-800">₹{monthlyTotalCost.toLocaleString()}</span></p>
                <p className="text-slate-600">Duration: <span className="font-semibold text-slate-800">{durationDays} Days</span></p>
                <p className="text-slate-600">
                  Booking Amount: <span className="font-semibold text-emerald-600">₹{bookingAmount.toLocaleString()}</span>{' '}
                  <span className="text-xs font-medium text-slate-500">(Excluding GST)</span>
                </p>
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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';
