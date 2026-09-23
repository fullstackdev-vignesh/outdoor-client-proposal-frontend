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

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  latitude?: string;
  longitude?: string;
  agencyComm?: string;
  gst?: string;
}

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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [errorMsg, setErrorMsg] = useState('');

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneDigitsRegex = /^\d{10}$/;

  useEffect(() => {
    setErrorMsg('');
    setFormErrors({});
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
    setErrorMsg('');
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const numericVal = e.target.value.replace(/\D/g, '').slice(0, 10);
    setErrorMsg('');
    setFormErrors((prev) => ({ ...prev, phone: undefined }));
    setForm((f) => ({ ...f, phone: numericVal }));
  }

  function validateForm(): FormErrors {
    const errs: FormErrors = {};

    if (!form.name.trim()) {
      errs.name = form.customerType === 'agency' ? 'Agency name is required.' : 'Client name is required.';
    }

    if (!form.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!phoneDigitsRegex.test(form.phone.trim())) {
      errs.phone = 'Phone number must be 10 digits.';
    }

    if (!form.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!form.latitude.trim()) {
      errs.latitude = 'Latitude is required.';
    } else if (isNaN(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90) {
      errs.latitude = 'Latitude must be between -90 and 90.';
    }

    if (!form.longitude.trim()) {
      errs.longitude = 'Longitude is required.';
    } else if (isNaN(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180) {
      errs.longitude = 'Longitude must be between -180 and 180.';
    }

    if (form.agencyComm && (isNaN(Number(form.agencyComm)) || Number(form.agencyComm) < 0 || Number(form.agencyComm) > 100)) {
      errs.agencyComm = 'Agency Comm must be between 0 and 100.';
    }

    if (form.gst && (isNaN(Number(form.gst)) || Number(form.gst) < 0 || Number(form.gst) > 100)) {
      errs.gst = 'GST must be between 0 and 100.';
    }

    return errs;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setFormErrors({});

    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      const firstErr = Object.values(errs)[0];
      setErrorMsg(firstErr || 'Please fix the errors in the form.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        agencyComm: form.agencyComm ? Number(form.agencyComm) : null,
        gst: form.gst ? Number(form.gst) : null,
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
      const msg = err?.response?.data?.message || 'Failed to save client';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  const isAgency = form.customerType === 'agency';

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Edit Client' : 'Add Client'} size="md">
      <form noValidate onSubmit={submit} className="space-y-4">
        <Field label="Customer Type" required>
          <div className="flex gap-2">
            {(['client', 'agency'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('customerType', t)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize cursor-pointer ${
                  form.customerType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label={isAgency ? 'Agency Name' : 'Client Name'} required error={formErrors.name}>
          <input
            placeholder={isAgency ? 'Enter agency name' : 'Enter client name'}
            value={form.name}
            onChange={(e) => {
              update('name', e.target.value);
              setFormErrors((prev) => ({ ...prev, name: undefined }));
            }}
            className={getInputCls(!!formErrors.name)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" required error={formErrors.phone}>
            <input
              type="tel"
              placeholder="e.g. 9876543210 (10 digits)"
              value={form.phone}
              onChange={handlePhoneChange}
              className={getInputCls(!!formErrors.phone)}
            />
          </Field>
          <Field label="Email" required error={formErrors.email}>
            <input
              type="text"
              placeholder="e.g. name@example.com"
              value={form.email}
              onChange={(e) => {
                update('email', e.target.value);
                setFormErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={getInputCls(!!formErrors.email)}
            />
          </Field>
        </div>

        <Field label="Location">
          <input
            placeholder="Enter location"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            className={getInputCls(false)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude" required error={formErrors.latitude}>
            <input
              placeholder="Enter latitude"
              value={form.latitude}
              onChange={(e) => {
                update('latitude', e.target.value);
                setFormErrors((prev) => ({ ...prev, latitude: undefined }));
              }}
              className={getInputCls(!!formErrors.latitude)}
            />
          </Field>
          <Field label="Longitude" required error={formErrors.longitude}>
            <input
              placeholder="Enter longitude"
              value={form.longitude}
              onChange={(e) => {
                update('longitude', e.target.value);
                setFormErrors((prev) => ({ ...prev, longitude: undefined }));
              }}
              className={getInputCls(!!formErrors.longitude)}
            />
          </Field>
        </div>

        {form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)) && (
          <iframe
            className="w-full h-40 rounded-lg border border-slate-200"
            src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=14&output=embed`}
          />
        )}

        {isAgency && (
          <Field label="Agency Comm (%)" error={formErrors.agencyComm}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 2"
              value={form.agencyComm}
              onChange={(e) => {
                update('agencyComm', e.target.value);
                setFormErrors((prev) => ({ ...prev, agencyComm: undefined }));
              }}
              className={getInputCls(!!formErrors.agencyComm)}
            />
          </Field>
        )}

        <Field label="GST (%)" error={formErrors.gst}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="e.g. 18"
            value={form.gst}
            onChange={(e) => {
              update('gst', e.target.value);
              setFormErrors((prev) => ({ ...prev, gst: undefined }));
            }}
            className={getInputCls(!!formErrors.gst)}
          />
        </Field>

        <Field label="Other Details">
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className={getInputCls(false)}
            rows={2}
          />
        </Field>

        {/* {errorMsg && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
            {errorMsg}
          </div>
        )} */}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

function getInputCls(hasError?: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
  }`;
}
