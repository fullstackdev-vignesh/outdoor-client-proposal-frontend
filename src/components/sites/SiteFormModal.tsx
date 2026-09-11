'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import type { Site } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

const MEDIA_TYPES = ['Hoarding', 'Digital Hoarding', 'Unipole', 'Gantry', 'Bus Shelter', 'Bridge Panel'];

const emptyForm = {
  mediaId: '',
  mediaName: '',
  mediaType: MEDIA_TYPES[0],
  state: '',
  city: '',
  location: '',
  latitude: '',
  longitude: '',
  width: '',
  height: '',
  sizeUnit: 'ft',
  amount: '',
  gstAmount: '',
  monthlyAmount: '',
  image: '',
  mediaStatus: 'available',
};

export default function SiteFormModal({
  open,
  onClose,
  site,
  onSaved,
  saveAndAddAnother,
}: {
  open: boolean;
  onClose: () => void;
  site?: Site | null;
  onSaved: () => void;
  saveAndAddAnother?: boolean;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (site) {
      setForm({
        mediaId: site.mediaId,
        mediaName: site.mediaName,
        mediaType: site.mediaType,
        state: site.state,
        city: site.city,
        location: site.location || '',
        latitude: site.latitude?.toString() || '',
        longitude: site.longitude?.toString() || '',
        width: site.width?.toString() || '',
        height: site.height?.toString() || '',
        sizeUnit: site.sizeUnit || 'ft',
        amount: site.amount?.toString() || '',
        gstAmount: site.gstAmount?.toString() || '',
        monthlyAmount: site.monthlyAmount?.toString() || '',
        image: site.image || '',
        mediaStatus: site.mediaStatus,
      });
      setImagePreview(site.image || '');
    } else {
      setForm(emptyForm);
      setImagePreview('');
    }
  }, [site, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      update('image', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function save(andAddAnother = false) {
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
        monthlyAmount: form.monthlyAmount ? Number(form.monthlyAmount) : undefined,
      };
      if (site) {
        await api.put(`/sites/${site._id}`, payload);
        showToast('Site updated successfully');
      } else {
        await api.post('/sites', payload);
        showToast('Site added successfully');
      }
      onSaved();
      if (andAddAnother) {
        setForm(emptyForm);
        setImagePreview('');
      } else {
        onClose();
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save site', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={site ? 'Edit Site' : 'Add Site'} size="xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="space-y-6"
      >
        <Section title="Basic Details">
          <Field label="Media ID" required>
            <input required value={form.mediaId} onChange={(e) => update('mediaId', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Media Name" required>
            <input required value={form.mediaName} onChange={(e) => update('mediaName', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Media Type" required>
            <select value={form.mediaType} onChange={(e) => update('mediaType', e.target.value)} className={inputCls}>
              {MEDIA_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="State" required>
            <input required value={form.state} onChange={(e) => update('state', e.target.value)} className={inputCls} />
          </Field>
          <Field label="City" required>
            <input required value={form.city} onChange={(e) => update('city', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Location">
            <input value={form.location} onChange={(e) => update('location', e.target.value)} className={inputCls} />
          </Field>
        </Section>

        <Section title="Location Details">
          <Field label="Latitude">
            <input value={form.latitude} onChange={(e) => update('latitude', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Longitude">
            <input value={form.longitude} onChange={(e) => update('longitude', e.target.value)} className={inputCls} />
          </Field>
          {form.latitude && form.longitude && (
            <div className="col-span-2 rounded-lg overflow-hidden border border-slate-200 h-40">
              <iframe
                className="w-full h-full"
                src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=14&output=embed`}
              />
            </div>
          )}
        </Section>

        <Section title="Media Size">
          <Field label="Width">
            <input value={form.width} onChange={(e) => update('width', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Height">
            <input value={form.height} onChange={(e) => update('height', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Unit">
            <select value={form.sizeUnit} onChange={(e) => update('sizeUnit', e.target.value)} className={inputCls}>
              <option value="ft">ft</option>
              <option value="m">m</option>
            </select>
          </Field>
        </Section>

        <Section title="Pricing">
          <Field label="Amount">
            <input value={form.amount} onChange={(e) => update('amount', e.target.value)} className={inputCls} />
          </Field>
          <Field label="GST Amount">
            <input value={form.gstAmount} onChange={(e) => update('gstAmount', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Monthly Amount">
            <input value={form.monthlyAmount} onChange={(e) => update('monthlyAmount', e.target.value)} className={inputCls} />
          </Field>
        </Section>

        <Section title="Media Image">
          <div className="col-span-2">
            {imagePreview ? (
              <div className="relative w-48">
                <img src={imagePreview} alt="preview" className="w-48 h-32 object-cover rounded-lg border border-slate-200" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    update('image', '');
                  }}
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-48 h-32 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 cursor-pointer hover:border-blue-400 hover:text-blue-500">
                <ImagePlus className="h-6 w-6 mb-1" />
                <span className="text-xs">Upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                />
              </label>
            )}
          </div>
        </Section>

        <Section title="Media Status">
          <div className="col-span-2 flex gap-2">
            {['available', 'booked', 'blocked'].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => update('mediaStatus', s)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                  form.mediaStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="col-span-2 text-xs text-slate-400">
            New media defaults to Available. Use the status-change action from the site list to mark as Booked or Blocked with full details.
          </p>
        </Section>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          {!site && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Save & Add Another
            </button>
          )}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

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
