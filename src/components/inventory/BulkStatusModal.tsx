'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
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

function calcBookingAmount(monthlyTotalCost: number, durationDays: number) {
  return Math.round(((monthlyTotalCost / 30) * durationDays + Number.EPSILON) * 100) / 100;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function BulkStatusModal({
  open,
  onClose,
  sites,
  status,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  sites: Site[];
  status: MediaStatus;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [customerType, setCustomerType] = useState<'client' | 'agency'>('client');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerType('client');
      setClientId('');
      setStartDate('');
      setEndDate('');
      setBlockReason('');
      setBlockNotes('');
      if (status === 'booked') api.get('/clients', { params: { limit: 200 } }).then((res) => setClients(res.data.items));
    }
  }, [open, status]);

  const durationDays = calcDurationDays(startDate, endDate);
  const validDateRange = !startDate || !endDate || new Date(endDate) >= new Date(startDate);
  const perSite = sites.map((s) => {
    const monthlyTotalCost = s.totalCost || s.monthlyAmount || 0;
    return { site: s, monthlyTotalCost, bookingAmount: calcBookingAmount(monthlyTotalCost, durationDays) };
  });
  const grandTotal = perSite.reduce((sum, p) => sum + p.bookingAmount, 0);

  const canSubmit =
    status === 'available' ||
    (status === 'blocked' && !!blockReason) ||
    (status === 'booked' && !!clientId && !!startDate && !!endDate && validDateRange);

  async function submit() {
    setSaving(true);
    try {
      const payload: any = { siteIds: sites.map((s) => s._id), mediaStatus: status };
      if (status === 'blocked') {
        payload.blockReason = blockReason;
        payload.blockNotes = blockNotes;
      }
      if (status === 'booked') {
        payload.bookingInfo = { customerType, client: clientId, startDate, endDate };
      }
      const res = await api.patch('/sites/bulk-status', payload);
      showToast(`Updated ${res.data.updated} of ${res.data.total} sites`);
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update sites', 'error');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  const title = `Bulk ${status.charAt(0).toUpperCase() + status.slice(1)} — ${sites.length} Site${sites.length === 1 ? '' : 's'}`;

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} size={status === 'booked' ? 'xl' : 'md'}>
        <div className="space-y-4">
          {status === 'available' && (
            <p className="text-sm text-slate-600">Mark {sites.length} selected site(s) as Available? Previous history is kept.</p>
          )}

          {status === 'blocked' && (
            <div className="space-y-3 rounded-lg bg-red-50 border border-red-100 p-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Block Reason *</label>
                <input placeholder="Enter reason for blocking" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <textarea placeholder="Optional notes" value={blockNotes} onChange={(e) => setBlockNotes(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Blocked Date</label>
                <DatePicker value={todayISO()} disabled />
              </div>
            </div>
          )}

          {status === 'booked' && (
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
                <label className="block text-sm font-medium text-slate-700 mb-1">{customerType === 'agency' ? 'Agency' : 'Client'} *</label>
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
                  <DatePicker value={startDate} onChange={setStartDate} min={todayISO()} max={endDate || undefined} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                  <DatePicker value={endDate} onChange={setEndDate} min={startDate || undefined} />
                </div>
              </div>
              {!validDateRange && <p className="text-xs text-red-500">End Date must be on or after Start Date</p>}
              <p className="text-sm text-slate-600">Duration: <span className="font-semibold text-slate-800">{durationDays} Days</span> · Selected Sites: <span className="font-semibold text-slate-800">{sites.length}</span></p>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-blue-200 bg-white divide-y divide-slate-100">
                {perSite.map(({ site, monthlyTotalCost, bookingAmount }) => (
                  <div key={site._id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="font-mono text-slate-500">{site.mediaCode || site.mediaId}</span>
                    <span className="text-slate-600">Monthly ₹{monthlyTotalCost.toLocaleString()}</span>
                    <span className="font-semibold text-emerald-600">₹{bookingAmount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-800">Grand Booking Amount: ₹{grandTotal.toLocaleString()}</p>
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
              Apply to Selected
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Bulk Update"
        message={`Are you sure you want to update ${sites.length} site(s) to ${status}?`}
        confirmLabel={saving ? 'Updating...' : 'Yes, Update'}
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
