'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import api, { fileBaseURL } from '@/lib/api';
import type { Site } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

const MEDIA_TYPES = ['Hoarding', 'Digital Hoarding', 'Unipole', 'Gantry', 'Bus Shelter', 'Bridge Panel'];

const emptyForm = {
  mediaId: '',
  mediaType: MEDIA_TYPES[0],
  quantity: '1',
  state: '',
  city: '',
  location: '',
  areaName: '',
  locationDetails: '',
  latitude: '',
  longitude: '',
  illumination: '',
  width: '',
  height: '',
  sizeUnit: 'ft',
  amount: '',
  gstAmount: '',
  monthlyAmount: '',
  printingCost: '',
  mountingCost: '',
  image: '',
  mediaStatus: 'available',
};

function calcAutoSize(width: string, height: string) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  return w > 0 && h > 0 ? w * h : 0;
}

function calcTotalCost(monthlyAmount: string, printingCost: string, mountingCost: string) {
  return (Number(monthlyAmount) || 0) + (Number(printingCost) || 0) + (Number(mountingCost) || 0);
}

function resolveImageUrl(image?: string) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
}

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
        mediaId: site.mediaCode || site.mediaId,
        mediaType: site.mediaType,
        quantity: site.quantity?.toString() || '1',
        state: site.state,
        city: site.city,
        location: site.location || '',
        areaName: site.areaName || '',
        locationDetails: site.locationDetails || '',
        latitude: site.latitude?.toString() || '',
        longitude: site.longitude?.toString() || '',
        illumination: site.illumination || '',
        width: site.width?.toString() || '',
        height: site.height?.toString() || '',
        sizeUnit: site.sizeUnit || 'ft',
        amount: site.amount?.toString() || '',
        gstAmount: site.gstAmount?.toString() || '',
        monthlyAmount: site.monthlyAmount?.toString() || '',
        printingCost: site.printingCost?.toString() || '',
        mountingCost: site.mountingCost?.toString() || '',
        image: site.image || '',
        mediaStatus: site.mediaStatus,
      });
      setImagePreview(resolveImageUrl(site.image));
    } else {
      setForm(emptyForm);
      setImagePreview('');
    }
  }, [site, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleImageFile(file: File) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      showToast('Only JPG, PNG, WEBP or GIF images are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be 5MB or smaller', 'error');
      return;
    }
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/sites/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      update('image', res.data.url);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Image upload failed', 'error');
      setImagePreview('');
    } finally {
      setUploadingImage(false);
    }
  }

  function validate(): string | null {
    if (!form.mediaId.trim()) return 'MediaCode is required';
    if (!form.mediaType.trim()) return 'Media Type is required';
    if (!form.state.trim()) return 'State is required';
    if (!form.city.trim()) return 'City is required';
    if (form.width && Number(form.width) <= 0) return 'Width must be greater than 0';
    if (form.height && Number(form.height) <= 0) return 'Height must be greater than 0';
    for (const [label, val] of [
      ['Amount', form.amount],
      ['GST Amount', form.gstAmount],
      ['Monthly Cost', form.monthlyAmount],
      ['Printing Cost', form.printingCost],
      ['Mounting Cost', form.mountingCost],
    ] as const) {
      if (val && (isNaN(Number(val)) || Number(val) < 0)) return `${label} must be a valid number >= 0`;
    }
    if (form.latitude && (isNaN(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90)) {
      return 'Latitude must be between -90 and 90';
    }
    if (form.longitude && (isNaN(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180)) {
      return 'Longitude must be between -180 and 180';
    }
    return null;
  }

  async function save(andAddAnother = false) {
    const validationError = validate();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        mediaCode: form.mediaId,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
        monthlyAmount: form.monthlyAmount ? Number(form.monthlyAmount) : undefined,
        printingCost: form.printingCost ? Number(form.printingCost) : undefined,
        mountingCost: form.mountingCost ? Number(form.mountingCost) : undefined,
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
          <Field label="MediaCode" required>
            <input required placeholder="Enter media code" value={form.mediaId} onChange={(e) => update('mediaId', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Media Type" required>
            <select value={form.mediaType} onChange={(e) => update('mediaType', e.target.value)} className={inputCls}>
              {MEDIA_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input type="number" min={0} placeholder="Enter quantity" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} className={inputCls} />
          </Field>
          <Field label="State" required>
            <StateSelect
              required
              value={form.state}
              onChange={(state) => setForm((f) => ({ ...f, state, city: '' }))}
            />
          </Field>
          <Field label="City" required>
            <CitySelect required state={form.state} value={form.city} onChange={(city) => update('city', city)} />
          </Field>
          <Field label="Location">
            <input placeholder="Enter location" value={form.location} onChange={(e) => update('location', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Area Name">
            <input placeholder="Enter area name" value={form.areaName} onChange={(e) => update('areaName', e.target.value)} className={inputCls} />
          </Field>
        </Section>

        <Section title="Location Details">
          <Field label="Latitude">
            <input placeholder="e.g. 13.0827" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Longitude">
            <input placeholder="e.g. 80.2707" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} className={inputCls} />
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
          <Field label="Illumination">
            <input placeholder="e.g. Front Lit, Non Lit" value={form.illumination} onChange={(e) => update('illumination', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Width">
            <input type="number" min={0} placeholder="Enter width" value={form.width} onChange={(e) => update('width', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Height">
            <input type="number" min={0} placeholder="Enter height" value={form.height} onChange={(e) => update('height', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Auto Size">
            <input disabled value={`${form.width || 0} x ${form.height || 0} = ${calcAutoSize(form.width, form.height)}`} className={`${inputCls} bg-slate-50 text-slate-500`} />
          </Field>
        </Section>

        <Section title="Pricing">
          <Field label="Display Cost Per Month">
            <input type="number" min={0} placeholder="Enter display cost per month" value={form.monthlyAmount} onChange={(e) => update('monthlyAmount', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Printing Cost">
            <input type="number" min={0} placeholder="Enter printing cost" value={form.printingCost} onChange={(e) => update('printingCost', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Mounting Cost">
            <input type="number" min={0} placeholder="Enter mounting cost" value={form.mountingCost} onChange={(e) => update('mountingCost', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Total Cost">
            <input disabled value={calcTotalCost(form.monthlyAmount, form.printingCost, form.mountingCost)} className={`${inputCls} bg-slate-50 text-slate-500`} />
          </Field>
          <Field label="GST Amount">
            <input type="number" min={0} placeholder="Enter GST amount" value={form.gstAmount} onChange={(e) => update('gstAmount', e.target.value)} className={inputCls} />
          </Field>
        </Section>

        <Section title="Media Image">
          <div className="col-span-2">
            {imagePreview ? (
              <div className="relative w-48">
                <img
                  src={imagePreview}
                  alt="Media preview"
                  className="w-48 h-32 object-cover rounded-lg border border-slate-200 bg-slate-50"
                  onError={() => setImagePreview('')}
                />
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
          <button type="submit" disabled={saving || uploadingImage} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {uploadingImage ? 'Uploading image...' : saving ? 'Saving...' : 'Save'}
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
