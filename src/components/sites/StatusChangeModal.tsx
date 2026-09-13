'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { formatLocalDate } from '@/lib/date';
import type { Site, Client, MediaStatus } from '@/lib/types';

function calcDurationDays(start: string, end: string) {
  if (!start || !end) return 0;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!site || !open) return;
    setNewStatus(initialStatus || site.mediaStatus);

    if (site.mediaStatus === 'booked' && site.bookingInfo) {
      const b = site.bookingInfo;
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

    if (site.mediaStatus === 'blocked' && site.blockInfo) {
      setBlockReason(site.blockInfo.reason || '');
      setBlockNotes(site.blockInfo.notes || '');
    } else {
      setBlockReason('');
      setBlockNotes('');
    }

    api.get('/clients', { params: { limit: 200 } }).then((res) => setClients(res.data.items));
  }, [site, open, initialStatus]);

  const monthlyTotalCost = site?.totalCost || site?.monthlyAmount || 0;
  const durationDays = calcDurationDays(startDate, endDate);
  const bookingAmount = calcBookingAmount(monthlyTotalCost, durationDays);
  const validDateRange = !startDate || !endDate || new Date(endDate) >= new Date(startDate);

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
        payload.bookingInfo = { customerType, client: clientId, startDate, endDate };
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
    newStatus === 'available' ||
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

          {newStatus === 'available' && (
            <p className="text-sm text-slate-500">
              This will mark the site as Available. Previous booking/block history is kept for reference.
            </p>
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
              <p className="text-xs text-red-500">Blocked Date: {formatLocalDate()}</p>
            </div>
          )}

          {newStatus === 'booked' && (
            <div className="space-y-3 rounded-lg bg-blue-50 border border-blue-100 p-3">
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
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} required />
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
