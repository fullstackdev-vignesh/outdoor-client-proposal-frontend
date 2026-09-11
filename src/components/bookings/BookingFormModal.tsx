'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { Client, Site } from '@/lib/types';

export default function BookingFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [clientId, setClientId] = useState('');
  const [siteIds, setSiteIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [gstAmount, setGstAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get('/clients', { params: { limit: 100 } }).then((res) => setClients(res.data.items));
    api.get('/sites/available', { params: { limit: 100 } }).then((res) => setSites(res.data.items));
    setClientId('');
    setSiteIds(new Set());
    setStartDate('');
    setEndDate('');
    setAmount('');
    setGstAmount('');
    setNotes('');
  }, [open]);

  function toggleSite(id: string) {
    setSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalAmount = (Number(amount) || 0) + (Number(gstAmount) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/bookings', {
        client: clientId,
        sites: Array.from(siteIds),
        startDate,
        endDate,
        amount: Number(amount) || undefined,
        gstAmount: Number(gstAmount) || undefined,
        totalAmount,
        notes,
      });
      showToast('Booking created successfully. Media status updated to BOOKED.');
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to create booking', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Media Booking" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Client" required>
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Available Media / Sites" required>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            {sites.map((s) => (
              <label key={s._id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={siteIds.has(s._id)} onChange={() => toggleSite(s._id)} />
                <span className="flex-1">{s.mediaName}</span>
                <span className="text-xs text-slate-400">
                  {s.city}, {s.state}
                </span>
              </label>
            ))}
            {sites.length === 0 && <p className="px-3 py-4 text-xs text-slate-400">No available media found</p>}
          </div>
          <p className="text-xs text-slate-400 mt-1">{siteIds.size} media selected</p>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Booking Start Date" required>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Booking End Date" required>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Amount">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="GST Amount">
            <input value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Total Amount">
            <input disabled value={totalAmount} className={`${inputCls} bg-slate-50`} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} />
        </Field>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || siteIds.size === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Confirming...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
