'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { Site, Client, MediaStatus } from '@/lib/types';

export default function StatusChangeModal({
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
  const [newStatus, setNewStatus] = useState<MediaStatus>('available');
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (site) setNewStatus(site.mediaStatus);
    if (open) {
      api.get('/clients', { params: { limit: 100 } }).then((res) => setClients(res.data.items));
    }
  }, [site, open]);

  async function submit() {
    if (!site) return;
    setSaving(true);
    try {
      const payload: any = { mediaStatus: newStatus };
      if (newStatus === 'blocked') {
        payload.blockReason = blockReason;
        payload.blockNotes = blockNotes;
      }
      if (newStatus === 'booked') {
        payload.bookingInfo = { client: clientId, startDate, endDate, amount: amount ? Number(amount) : undefined };
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

          {newStatus === 'blocked' && (
            <div className="space-y-3 rounded-lg bg-red-50 border border-red-100 p-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Block Reason *</label>
                <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <textarea value={blockNotes} onChange={(e) => setBlockNotes(e.target.value)} className={inputCls} rows={2} />
              </div>
              <p className="text-xs text-red-500">Block Date: {new Date().toLocaleDateString()}</p>
            </div>
          )}

          {newStatus === 'booked' && (
            <div className="space-y-3 rounded-lg bg-blue-50 border border-blue-100 p-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls} required>
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Booking Amount</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={(newStatus === 'blocked' && !blockReason) || (newStatus === 'booked' && !clientId)}
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
