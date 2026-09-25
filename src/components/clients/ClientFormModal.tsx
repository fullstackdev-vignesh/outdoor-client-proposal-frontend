'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Pencil, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import api, { fileBaseURL } from '@/lib/api';
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

function resolveImageUrl(image?: string | null) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
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

  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');
  const [imageRemoved, setImageRemoved] = useState(false);

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
        gst: Number(client.gst) > 0 ? '18' : '',
        notes: '',
      });
      setImageFile(null);
      setImagePreview(resolveImageUrl(client.clientLocationPinImage));
      setImageError('');
      setImageRemoved(false);
    } else {
      setForm(empty);
      setImageFile(null);
      setImagePreview('');
      setImageError('');
      setImageRemoved(false);
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

  function handleImageSelect(file: File) {
    setImageError('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedExts.includes(ext) || !allowedMimes.some((m) => file.type.toLowerCase().includes(m) || file.type.startsWith('image/'))) {
      const msg = 'Only JPG, JPEG, PNG and WEBP image files are allowed.';
      setImageError(msg);
      showToast(msg, 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const msg = 'Image size must be 10MB or smaller.';
      setImageError(msg);
      showToast(msg, 'error');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  }

  function handleImageRemove() {
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    setImageRemoved(true);
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
      const fd = new FormData();
      fd.append('customerType', form.customerType);
      fd.append('name', form.name.trim());
      fd.append('phone', form.phone.trim());
      fd.append('email', form.email.trim());
      fd.append('location', form.location.trim());
      if (form.latitude) fd.append('latitude', String(Number(form.latitude)));
      if (form.longitude) fd.append('longitude', String(Number(form.longitude)));
      fd.append('agencyComm', form.agencyComm ? String(Number(form.agencyComm)) : '');
      fd.append('gst', Number(form.gst) > 0 ? '18' : '0');
      if (form.notes) fd.append('notes', form.notes.trim());

      if (imageFile) {
        fd.append('clientLocationPinImage', imageFile);
      } else if (imageRemoved) {
        fd.append('clientLocationPinImage', '');
        fd.append('removeClientLocationPinImage', 'true');
      }

      if (client) {
        await api.put(`/clients/${client._id}`, fd);
        showToast('Client updated successfully');
      } else {
        await api.post('/clients', fd);
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Client Location Pin Image
          </label>
          {imagePreview ? (
            <div className="relative w-full h-40 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Client location pin"
                className="w-full h-full object-contain cursor-pointer"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <label className="bg-white/90 border border-slate-200 rounded-full p-1.5 shadow text-slate-600 hover:text-blue-600 cursor-pointer" title="Change Image">
                  <Pencil className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleImageRemove}
                  className="bg-white/90 border border-slate-200 rounded-full p-1.5 shadow text-slate-600 hover:text-red-600"
                  title="Remove Image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 text-slate-500 hover:text-blue-600 transition bg-slate-50/50">
              <ImagePlus className="h-6 w-6 mb-1 text-slate-400" />
              <span className="text-xs font-medium">Upload Client Location Pin Image</span>
              <span className="text-[10px] text-slate-400">JPG, JPEG, PNG or WEBP only</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
              />
            </label>
          )}
          {imageError && <p className="mt-1 text-xs font-medium text-red-600">{imageError}</p>}
        </div>

        {isAgency && (
          <Field label="Agency Comm (%)" error={formErrors.agencyComm}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 2 %"
              value={form.agencyComm}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                update('agencyComm', val);
                setFormErrors((prev) => ({ ...prev, agencyComm: undefined }));
              }}
              className={getInputCls(!!formErrors.agencyComm)}
            />
          </Field>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">GST (18%)</label>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50/50">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-slate-800">
                {Number(form.gst) > 0 ? '18% GST Enabled' : 'GST Disabled'}
              </span>
              <p className="text-xs text-slate-400">
                {Number(form.gst) > 0 ? 'Apply 18% GST on proposals for this customer' : 'Do not apply GST for this customer'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Number(form.gst) > 0}
              onClick={() => {
                const nextGst = Number(form.gst) > 0 ? '' : '18';
                update('gst', nextGst);
                setFormErrors((prev) => ({ ...prev, gst: undefined }));
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                Number(form.gst) > 0 ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  Number(form.gst) > 0 ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <Field label="Other Details">
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className={getInputCls(false)}
            rows={2}
          />
        </Field>

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
