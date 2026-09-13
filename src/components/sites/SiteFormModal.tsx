'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import api, { fileBaseURL } from '@/lib/api';
import type { Site, Client, MediaStatus } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { todayISO } from '@/lib/date';
import DatePicker from '@/components/ui/DatePicker';

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
  mediaStatus: 'available' as MediaStatus,
};

function calcAutoSize(width: string, height: string) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  return w > 0 && h > 0 ? w * h : 0;
}

function calcTotalCost(monthlyAmount: string, printingCost: string, mountingCost: string) {
  return (Number(monthlyAmount) || 0) + (Number(printingCost) || 0) + (Number(mountingCost) || 0);
}

function calcDurationDays(start: string, end: string) {
  if (!start || !end) return 0;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

function calcBookingAmount(monthlyTotalCost: number, durationDays: number) {
  return Math.round(((monthlyTotalCost / 30) * durationDays + Number.EPSILON) * 100) / 100;
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Booking Details (inline, shown when Media Status = Booked)
  const [customerType, setCustomerType] = useState<'client' | 'agency'>('client');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Block Details (inline, shown when Media Status = Blocked)
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    api.get('/clients', { params: { limit: 200 } }).then((res) => setClients(res.data.items));
  }, [open]);

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
    } else {
      setForm(emptyForm);
      setImagePreview('');
      setCustomerType('client');
      setClientId('');
      setStartDate('');
      setEndDate('');
      setBlockReason('');
      setBlockNotes('');
    }
    setErrors({});
  }, [site, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  function clearError(key: string) {
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
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

  const monthlyTotalCost = calcTotalCost(form.monthlyAmount, form.printingCost, form.mountingCost);
  const durationDays = calcDurationDays(startDate, endDate);
  const bookingAmount = calcBookingAmount(monthlyTotalCost, durationDays);
  const validDateRange = !startDate || !endDate || new Date(endDate) >= new Date(startDate);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.mediaId.trim()) errs.mediaId = 'MediaCode is required';
    if (!form.mediaType.trim()) errs.mediaType = 'Media Type is required';
    if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = 'Quantity must be greater than 0';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    if (!form.areaName.trim()) errs.areaName = 'Area Name is required';

    if (!form.latitude) errs.latitude = 'Latitude is required';
    else if (isNaN(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90) {
      errs.latitude = 'Latitude must be between -90 and 90';
    }
    if (!form.longitude) errs.longitude = 'Longitude is required';
    else if (isNaN(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180) {
      errs.longitude = 'Longitude must be between -180 and 180';
    }

    if (!form.illumination.trim()) errs.illumination = 'Illumination is required';
    if (!form.width) errs.width = 'Width is required';
    else if (Number(form.width) <= 0) errs.width = 'Width must be greater than 0';
    if (!form.height) errs.height = 'Height is required';
    else if (Number(form.height) <= 0) errs.height = 'Height must be greater than 0';

    for (const [key, label] of [
      ['monthlyAmount', 'Display Cost Per Month'],
      ['printingCost', 'Printing Cost'],
      ['mountingCost', 'Mounting Cost'],
    ] as const) {
      const val = form[key];
      if (!val) errs[key] = `${label} is required`;
      else if (isNaN(Number(val)) || Number(val) < 0) errs[key] = `${label} must be a valid number >= 0`;
    }

    if (!form.image) errs.image = 'Media Image is required';

    if (form.mediaStatus === 'booked') {
      if (!clientId) errs.clientId = `Select a ${customerType === 'agency' ? 'agency' : 'client'}`;
      if (!startDate) errs.startDate = 'Start Date is required';
      if (!endDate) errs.endDate = 'End Date is required';
      if (startDate && endDate && !validDateRange) errs.endDate = 'End Date must be on or after Start Date';
    }

    if (form.mediaStatus === 'blocked') {
      if (!blockReason.trim()) errs.blockReason = 'Block Reason is required';
      if (!blockNotes.trim()) errs.blockNotes = 'Additional Notes is required';
    }

    return errs;
  }

  async function save(andAddAnother = false) {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showToast('Please fix the highlighted fields', 'error');
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`site-field-${firstKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement | null)?.focus?.();
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
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
      if (form.mediaStatus === 'booked') {
        payload.bookingInfo = { customerType, client: clientId, startDate, endDate };
      } else if (form.mediaStatus === 'blocked') {
        payload.blockReason = blockReason;
        payload.blockNotes = blockNotes;
      }
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
        setCustomerType('client');
        setClientId('');
        setStartDate('');
        setEndDate('');
        setBlockReason('');
        setBlockNotes('');
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
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="space-y-6"
      >
        <Section title="Basic Details">
          <Field label="MediaCode" required error={errors.mediaId}>
            <input
              id="site-field-mediaId"
              placeholder="Enter media code"
              value={form.mediaId}
              onChange={(e) => update('mediaId', e.target.value)}
              className={fieldCls(!!errors.mediaId)}
            />
          </Field>
          <Field label="Media Type" required error={errors.mediaType}>
            <select
              id="site-field-mediaType"
              value={form.mediaType}
              onChange={(e) => update('mediaType', e.target.value)}
              className={fieldCls(!!errors.mediaType)}
            >
              {MEDIA_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity" required error={errors.quantity}>
            <input
              id="site-field-quantity"
              type="number"
              min={1}
              placeholder="Enter quantity"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              className={fieldCls(!!errors.quantity)}
            />
          </Field>
          <Field label="State" required error={errors.state}>
            <StateSelect
              value={form.state}
              onChange={(state) => {
                setForm((f) => ({ ...f, state, city: '' }));
                clearError('state');
              }}
              className={fieldCls(!!errors.state)}
            />
          </Field>
          <Field label="City" required error={errors.city}>
            <CitySelect state={form.state} value={form.city} onChange={(city) => update('city', city)} className={fieldCls(!!errors.city)} />
          </Field>
          <Field label="Location" required error={errors.location}>
            <input
              id="site-field-location"
              placeholder="Enter location"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className={fieldCls(!!errors.location)}
            />
          </Field>
          <Field label="Area Name" required error={errors.areaName}>
            <input
              id="site-field-areaName"
              placeholder="Enter area name"
              value={form.areaName}
              onChange={(e) => update('areaName', e.target.value)}
              className={fieldCls(!!errors.areaName)}
            />
          </Field>
        </Section>

        <Section title="Location Details">
          <Field label="Latitude" required error={errors.latitude}>
            <input
              id="site-field-latitude"
              placeholder="e.g. 13.0827"
              value={form.latitude}
              onChange={(e) => update('latitude', e.target.value)}
              className={fieldCls(!!errors.latitude)}
            />
          </Field>
          <Field label="Longitude" required error={errors.longitude}>
            <input
              id="site-field-longitude"
              placeholder="e.g. 80.2707"
              value={form.longitude}
              onChange={(e) => update('longitude', e.target.value)}
              className={fieldCls(!!errors.longitude)}
            />
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
          <Field label="Illumination" required error={errors.illumination}>
            <input
              id="site-field-illumination"
              placeholder="e.g. Front Lit, Non Lit"
              value={form.illumination}
              onChange={(e) => update('illumination', e.target.value)}
              className={fieldCls(!!errors.illumination)}
            />
          </Field>
          <Field label="Width" required error={errors.width}>
            <input
              id="site-field-width"
              type="number"
              min={0}
              placeholder="Enter width"
              value={form.width}
              onChange={(e) => update('width', e.target.value)}
              className={fieldCls(!!errors.width)}
            />
          </Field>
          <Field label="Height" required error={errors.height}>
            <input
              id="site-field-height"
              type="number"
              min={0}
              placeholder="Enter height"
              value={form.height}
              onChange={(e) => update('height', e.target.value)}
              className={fieldCls(!!errors.height)}
            />
          </Field>
          <Field label="Auto Size">
            <input disabled value={`${form.width || 0} x ${form.height || 0} = ${calcAutoSize(form.width, form.height)}`} className={`${inputCls} bg-slate-50 text-slate-500`} />
          </Field>
        </Section>

        <Section title="Pricing">
          <Field label="Display Cost Per Month" required error={errors.monthlyAmount}>
            <input
              id="site-field-monthlyAmount"
              type="number"
              min={0}
              placeholder="Enter display cost per month"
              value={form.monthlyAmount}
              onChange={(e) => update('monthlyAmount', e.target.value)}
              className={fieldCls(!!errors.monthlyAmount)}
            />
          </Field>
          <Field label="Printing Cost" required error={errors.printingCost}>
            <input
              id="site-field-printingCost"
              type="number"
              min={0}
              placeholder="Enter printing cost"
              value={form.printingCost}
              onChange={(e) => update('printingCost', e.target.value)}
              className={fieldCls(!!errors.printingCost)}
            />
          </Field>
          <Field label="Mounting Cost" required error={errors.mountingCost}>
            <input
              id="site-field-mountingCost"
              type="number"
              min={0}
              placeholder="Enter mounting cost"
              value={form.mountingCost}
              onChange={(e) => update('mountingCost', e.target.value)}
              className={fieldCls(!!errors.mountingCost)}
            />
          </Field>
          <Field label="Total Cost">
            <input disabled value={monthlyTotalCost} className={`${inputCls} bg-slate-50 text-slate-500`} />
          </Field>
        </Section>

        <Section title="Media Image">
          <div className="col-span-2" id="site-field-image">
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
              <label
                className={`flex flex-col items-center justify-center w-48 h-32 rounded-lg border-2 border-dashed cursor-pointer ${
                  errors.image ? 'border-red-400 text-red-400 hover:border-red-500' : 'border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500'
                }`}
              >
                <ImagePlus className="h-6 w-6 mb-1" />
                <span className="text-xs">Upload image *</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                />
              </label>
            )}
            {errors.image && <p className="mt-1 text-xs font-medium text-red-600">{errors.image}</p>}
          </div>
        </Section>

        <Section title="Media Status">
          <div className="col-span-2 flex gap-2">
            {(['available', 'booked', 'blocked'] as MediaStatus[]).map((s) => (
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
        </Section>

        {form.mediaStatus === 'booked' && (
          <div className="space-y-3 rounded-lg bg-blue-50 border border-blue-100 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">Booking Details</h4>
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
              <select
                id="site-field-clientId"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  clearError('clientId');
                }}
                className={fieldCls(!!errors.clientId)}
              >
                <option value="">Select {customerType === 'agency' ? 'agency' : 'client'}</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.clientId && <p className="mt-1 text-xs font-medium text-red-600">{errors.clientId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                <DatePicker
                  id="site-field-startDate"
                  value={startDate}
                  onChange={(v) => {
                    setStartDate(v);
                    clearError('startDate');
                  }}
                  max={endDate || undefined}
                  error={!!errors.startDate}
                />
                {errors.startDate && <p className="mt-1 text-xs font-medium text-red-600">{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                <DatePicker
                  id="site-field-endDate"
                  value={endDate}
                  onChange={(v) => {
                    setEndDate(v);
                    clearError('endDate');
                  }}
                  min={startDate || undefined}
                  error={!!errors.endDate}
                />
                {errors.endDate && <p className="mt-1 text-xs font-medium text-red-600">{errors.endDate}</p>}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-blue-200 p-3 text-sm space-y-1">
              <p className="text-slate-600">Monthly Cost: <span className="font-semibold text-slate-800">₹{monthlyTotalCost.toLocaleString()}</span></p>
              <p className="text-slate-600">Duration: <span className="font-semibold text-slate-800">{durationDays} Days</span></p>
              <p className="text-slate-600">Booking Amount: <span className="font-semibold text-emerald-600">₹{bookingAmount.toLocaleString()}</span></p>
            </div>
          </div>
        )}

        {form.mediaStatus === 'blocked' && (
          <div className="space-y-3 rounded-lg bg-red-50 border border-red-100 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700">Block Details</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Block Reason *</label>
              <input
                id="site-field-blockReason"
                placeholder="Enter block reason"
                value={blockReason}
                onChange={(e) => {
                  setBlockReason(e.target.value);
                  clearError('blockReason');
                }}
                className={fieldCls(!!errors.blockReason)}
              />
              {errors.blockReason && <p className="mt-1 text-xs font-medium text-red-600">{errors.blockReason}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes *</label>
              <textarea
                id="site-field-blockNotes"
                placeholder="Enter additional notes"
                value={blockNotes}
                onChange={(e) => {
                  setBlockNotes(e.target.value);
                  clearError('blockNotes');
                }}
                className={fieldCls(!!errors.blockNotes)}
                rows={2}
              />
              {errors.blockNotes && <p className="mt-1 text-xs font-medium text-red-600">{errors.blockNotes}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Blocked Date *</label>
              <DatePicker value={todayISO()} disabled />
            </div>
          </div>
        )}

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

function fieldCls(hasError: boolean) {
  return hasError
    ? 'w-full rounded-lg border border-red-400 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100'
    : inputCls;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
