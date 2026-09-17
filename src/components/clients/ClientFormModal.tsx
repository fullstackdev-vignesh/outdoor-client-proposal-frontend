'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { Client } from '@/lib/types';

const empty = {
  customerType: 'client' as 'client' | 'agency',
  name: '',
  phone: '',
  email: '',
  location: '',
  latitude: '',
  longitude: '',
  agencyComm: '',
  gst: '',
  notes: '',
};

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
        customerType: client.customerType || 'client',
        name: client.name,
        phone: client.phone || '',
        email: client.email || '',
        location: client.location || '',
        latitude: client.latitude?.toString() || '',
        longitude: client.longitude?.toString() || '',
        agencyComm: client.agencyComm?.toString() || '',
        gst: client.gst?.toString() || '',
        notes: '',
      });
    } else {
      setForm(empty);
    }
  }, [client, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return form.customerType === 'agency' ? 'Agency name is required' : 'Client name is required';
    if (!form.latitude) return 'Latitude is required';
    if (!form.longitude) return 'Longitude is required';
    if (isNaN(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90) return 'Latitude must be between -90 and 90';
    if (isNaN(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180) return 'Longitude must be between -180 and 180';
    if (form.agencyComm && (isNaN(Number(form.agencyComm)) || Number(form.agencyComm) < 0 || Number(form.agencyComm) > 100)) return 'Agency Comm must be a percentage between 0 and 100';
    if (form.gst && (isNaN(Number(form.gst)) || Number(form.gst) < 0 || Number(form.gst) > 100)) return 'GST must be a percentage between 0 and 100';
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      showToast(error, 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        agencyComm: form.agencyComm ? Number(form.agencyComm) : undefined,
        gst: form.gst ? Number(form.gst) : undefined,
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

  const isAgency = form.customerType === 'agency';

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Edit Client' : 'Add Client'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Customer Type" required>
          <div className="flex gap-2">
            {(['client', 'agency'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('customerType', t)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                  form.customerType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label={isAgency ? 'Agency Name' : 'Client Name'} required>
          <input
            required
            placeholder={isAgency ? 'Enter agency name' : 'Enter client name'}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input placeholder="Enter phone number" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" placeholder="Enter email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Location">
          <input placeholder="Enter location" value={form.location} onChange={(e) => update('location', e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude" required>
            <input placeholder="Enter latitude" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Longitude" required>
            <input placeholder="Enter longitude" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} className={inputCls} />
          </Field>
        </div>
        {form.latitude && form.longitude && (
          <iframe
            className="w-full h-40 rounded-lg border border-slate-200"
            src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=14&output=embed`}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          {isAgency && (
            <Field label="Agency Comm">
              <input type="number" min={0} max={100} placeholder="e.g. 2 (for 2%)" value={form.agencyComm} onChange={(e) => update('agencyComm', e.target.value)} className={inputCls} />
            </Field>
          )}
          <Field label="GST">
            <input type="number" min={0} max={100} placeholder="e.g. 18 (for 18%)" value={form.gst} onChange={(e) => update('gst', e.target.value)} className={inputCls} />
          </Field>
        </div>
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
