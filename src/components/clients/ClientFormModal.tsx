'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { Client } from '@/lib/types';

const empty = { name: '', phone: '', email: '', location: '', latitude: '', longitude: '', notes: '' };

export default function ClientFormModal({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        phone: client.phone || '',
        email: client.email || '',
        location: client.location || '',
        latitude: client.latitude?.toString() || '',
        longitude: client.longitude?.toString() || '',
        notes: '',
      });
    } else {
      setForm(empty);
    }
  }, [client, open]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      };
      if (client) {
        await api.put(`/clients/${client._id}`, payload);
        showToast('Client updated successfully');
      } else {
        await api.post('/clients', payload);
        showToast('Client added successfully');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save client', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Edit Client' : 'Add Client'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Client Name" required>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Location">
          <input value={form.location} onChange={(e) => update('location', e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input value={form.latitude} onChange={(e) => update('latitude', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Longitude">
            <input value={form.longitude} onChange={(e) => update('longitude', e.target.value)} className={inputCls} />
          </Field>
        </div>
        {form.latitude && form.longitude && (
          <iframe
            className="w-full h-40 rounded-lg border border-slate-200"
            src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=14&output=embed`}
          />
        )}
        <Field label="Other Details">
          <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} className={inputCls} rows={2} />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
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
