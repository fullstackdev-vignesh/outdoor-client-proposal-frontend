'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import api, { fileBaseURL } from '@/lib/api';
import type { BookingRecord, Site, Client, MediaStatus } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { todayISO } from '@/lib/date';
import DatePicker from '@/components/ui/DatePicker';

const MEDIA_TYPES = ['Hoarding', 'Digital Hoarding', 'Unipole', 'Gantry', 'Bus Shelter', 'Bridge Panel'];
const ILLUMINATION_OPTIONS = ['Front Lit', 'Not Lit'];

const emptyForm = {
  mediaId: '',
  mediaType: MEDIA_TYPES[0],
  quantity: '1',
  state: '',
  city: '',
  location: '',
  areaName: '',
  siteOwner: '',
  locationDetails: '',
  latitude: '',
  longitude: '',
  illumination: 'Front Lit',
  width: '',
  height: '',
  sizeUnit: 'ft',
  amount: '',
  gstAmount: '',
  monthlyAmount: '',
  printingCost: '',
  mountingCost: '',
  mediaImage: '',
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

interface BookingRow {
  bookingId?: string;
  customerType: 'client' | 'agency';
  clientId: string;
  startDate: string;
  endDate: string;
  status?: string;
}

function newBookingRow(): BookingRow {
  return { customerType: 'client', clientId: '', startDate: '', endDate: '' };
}

function bookingRecordToRow(b: BookingRecord): BookingRow {
  return {
    bookingId: b.bookingId,
    customerType: b.customerType || 'client',
    clientId: typeof b.client === 'object' ? b.client?._id || '' : b.client || '',
    startDate: b.startDate ? b.startDate.slice(0, 10) : '',
    endDate: b.endDate ? b.endDate.slice(0, 10) : '',
    status: b.status,
  };
}

// Standard overlap rule: two ranges touch if aStart <= bEnd AND aEnd >= bStart.
function rowsOverlap(a: BookingRow, b: BookingRow) {
  if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) return false;
  return new Date(a.startDate) <= new Date(b.endDate) && new Date(a.endDate) >= new Date(b.startDate);
}

function formatDateLabel(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Booking Details (inline, shown when Media Status = Booked) — one site can have several
  // non-overlapping booking orders; "+ Add Booking" appends another inline card below.
  const [clients, setClients] = useState<Client[]>([]);
  const [bookingRows, setBookingRows] = useState<BookingRow[]>([]);

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
        siteOwner: site.siteOwner || '',
        locationDetails: site.locationDetails || '',
        latitude: site.latitude?.toString() || '',
        longitude: site.longitude?.toString() || '',
        illumination: site.illumination || 'Front Lit',
        width: site.width?.toString() || '',
        height: site.height?.toString() || '',
        sizeUnit: site.sizeUnit || 'ft',
        amount: site.amount?.toString() || '',
        gstAmount: site.gstAmount?.toString() || '',
        monthlyAmount: site.monthlyAmount?.toString() || '',
        printingCost: site.printingCost?.toString() || '',
        mountingCost: site.mountingCost?.toString() || '',
        mediaImage: site.mediaImage || '',
        mediaStatus: site.mediaStatus,
      });
      setImageFile(null);
      setImagePreview(resolveImageUrl(site.mediaImage));

      if (site.bookings && site.bookings.length > 0) {
        setBookingRows(site.bookings.map(bookingRecordToRow));
      } else if (site.mediaStatus === 'booked' && site.bookingInfo) {
        setBookingRows([bookingRecordToRow({ ...site.bookingInfo, status: 'active' } as BookingRecord)]);
      } else {
        setBookingRows([]);
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
      setImageFile(null);
      setBookingRows([]);
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

  function handleImageFile(file: File) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      showToast('Only JPG, PNG, WEBP or GIF images are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be 5MB or smaller', 'error');
      return;
    }
    // Local preview only — the file itself is sent with the Save request and uploaded
    // server-side, so no separate upload API call happens on selection.
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    clearError('mediaImage');
  }

  const monthlyTotalCost = calcTotalCost(form.monthlyAmount, form.printingCost, form.mountingCost);

  function addBookingRow() {
    setBookingRows((rows) => [...rows, newBookingRow()]);
  }

  function removeBookingRow(index: number) {
    setBookingRows((rows) => rows.filter((_, i) => i !== index));
  }

  function updateBookingRow(index: number, patch: Partial<BookingRow>) {
    setBookingRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setErrors((e) => {
      const next = { ...e };
      delete next[`booking-${index}`];
      return next;
    });
  }

  // Client-side mirror of the backend's overlap rule (newStart <= existingEnd AND newEnd >=
  // existingStart) so the user sees the friendly error before ever hitting Save.
  function findBookingOverlapError(rows: BookingRow[]): Record<string, string> {
    const errs: Record<string, string> = {};
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status === 'completed') continue;
      for (let j = 0; j < rows.length; j++) {
        if (i === j || rows[j].status === 'completed') continue;
        if (rowsOverlap(rows[i], rows[j])) {
          errs[`booking-${i}`] = `This site is already booked from ${formatDateLabel(rows[j].startDate)} to ${formatDateLabel(rows[j].endDate)}.`;
          break;
        }
      }
    }
    return errs;
  }

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

    if (!form.mediaImage && !imageFile) errs.mediaImage = 'Media Image is required';

    if (form.mediaStatus === 'booked') {
      if (bookingRows.length === 0) errs.booking = 'At least one booking is required';
      bookingRows.forEach((row, i) => {
        if (!row.clientId) errs[`booking-${i}`] = `Select a ${row.customerType === 'agency' ? 'agency' : 'client'}`;
        else if (!row.startDate) errs[`booking-${i}`] = 'Start Date is required';
        else if (!row.endDate) errs[`booking-${i}`] = 'End Date is required';
        else if (new Date(row.endDate) < new Date(row.startDate)) errs[`booking-${i}`] = 'End Date must be on or after Start Date';
      });
      Object.assign(errs, findBookingOverlapError(bookingRows));
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
      showToast('Please fill the highlighted fields', 'error');
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`site-field-${firstKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement | null)?.focus?.();
      return;
    }
    setSaving(true);
    try {
      // Single multipart request: site fields + the newly selected image file (if any).
      // The backend uploads it and stores the returned URL — no separate upload call.
      const fd = new FormData();
      const numericFields = new Set(['quantity', 'latitude', 'longitude', 'width', 'height', 'amount', 'gstAmount', 'monthlyAmount', 'printingCost', 'mountingCost']);
      (Object.keys(form) as (keyof typeof form)[]).forEach((key) => {
        if (key === 'mediaImage') return; // never send the existing URL as a field; only a new file goes up
        const value = form[key];
        if (numericFields.has(key) && value === '') return;
        fd.append(key, String(value));
      });
      if (form.mediaStatus === 'booked') {
        const bookingsPayload = bookingRows.map((row) => ({
          bookingId: row.bookingId,
          customerType: row.customerType,
          client: row.clientId,
          customerName: clients.find((c) => c._id === row.clientId)?.name,
          startDate: row.startDate,
          endDate: row.endDate,
        }));
        fd.append('bookings', JSON.stringify(bookingsPayload));
      } else if (form.mediaStatus === 'blocked') {
        fd.append('blockReason', blockReason);
        fd.append('blockNotes', blockNotes);
      }
      if (imageFile) {
        fd.append('mediaImage', imageFile);
      }

      if (site) {
        await api.put(`/sites/${site._id}`, fd);
        showToast('Site updated successfully');
      } else {
        await api.post('/sites', fd);
        showToast('Site added successfully');
      }
      onSaved();
      if (andAddAnother) {
        setForm(emptyForm);
        setImagePreview('');
        setImageFile(null);
        setBookingRows([]);
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
          <Field label="Site Owner">
            <input
              id="site-field-siteOwner"
              placeholder="ex: Adinn"
              value={form.siteOwner}
              onChange={(e) => update('siteOwner', e.target.value)}
              className={fieldCls(false)}
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
            <select
              id="site-field-illumination"
              value={form.illumination}
              onChange={(e) => update('illumination', e.target.value)}
              className={fieldCls(!!errors.illumination)}
            >
              {ILLUMINATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
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
          <div className="col-span-2" id="site-field-mediaImage">
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
                    setImageFile(null);
                    update('mediaImage', '');
                  }}
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center w-48 h-32 rounded-lg border-2 border-dashed cursor-pointer ${
                  errors.mediaImage ? 'border-red-400 text-red-400 hover:border-red-500' : 'border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500'
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
            {errors.mediaImage && <p className="mt-1 text-xs font-medium text-red-600">{errors.mediaImage}</p>}
          </div>
        </Section>

        <Section title="Media Status">
          <div className="col-span-2 flex gap-2">
            {(['available', 'booked', 'blocked'] as MediaStatus[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => {
                  update('mediaStatus', s);
                  if (s === 'booked') setBookingRows((rows) => (rows.length ? rows : [newBookingRow()]));
                }}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">Booking Details</h4>
              <button
                type="button"
                onClick={addBookingRow}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Booking
              </button>
            </div>
            {errors.booking && <p className="text-xs font-medium text-red-600">{errors.booking}</p>}

            {bookingRows.map((row, index) => {
              const durationDays = calcDurationDays(row.startDate, row.endDate);
              const bookingAmount = calcBookingAmount(monthlyTotalCost, durationDays);
              const readOnly = row.status === 'completed';
              return (
                <div key={row.bookingId || index} className="space-y-3 rounded-lg bg-blue-50 border border-blue-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-700">
                      Booking #{index + 1} {row.status && <span className="capitalize font-normal text-blue-500">({row.status})</span>}
                    </p>
                    {!readOnly && bookingRows.length > 0 && (
                      <button type="button" onClick={() => removeBookingRow(index)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type *</label>
                    <div className="flex gap-2">
                      {(['client', 'agency'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          disabled={readOnly}
                          onClick={() => updateBookingRow(index, { customerType: t })}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize disabled:opacity-60 ${
                            row.customerType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{row.customerType === 'agency' ? 'Agency' : 'Client'} *</label>
                    <select
                      id={`site-field-booking-${index}`}
                      value={row.clientId}
                      disabled={readOnly}
                      onChange={(e) => updateBookingRow(index, { clientId: e.target.value })}
                      className={`${fieldCls(!!errors[`booking-${index}`])} disabled:opacity-60`}
                    >
                      <option value="">Select {row.customerType === 'agency' ? 'agency' : 'client'}</option>
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
                      <DatePicker
                        value={row.startDate}
                        onChange={(v) => updateBookingRow(index, { startDate: v })}
                        max={row.endDate || undefined}
                        error={!!errors[`booking-${index}`]}
                        disabled={readOnly}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                      <DatePicker
                        value={row.endDate}
                        onChange={(v) => updateBookingRow(index, { endDate: v })}
                        min={row.startDate || undefined}
                        error={!!errors[`booking-${index}`]}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  {errors[`booking-${index}`] && <p className="text-xs font-medium text-red-600">{errors[`booking-${index}`]}</p>}
                  <div className="rounded-lg bg-white border border-blue-200 p-3 text-sm space-y-1">
                    <p className="text-slate-600">Monthly Cost: <span className="font-semibold text-slate-800">₹{monthlyTotalCost.toLocaleString()}</span></p>
                    <p className="text-slate-600">Duration: <span className="font-semibold text-slate-800">{durationDays} Days</span></p>
                    <p className="text-slate-600">Booking Amount: <span className="font-semibold text-emerald-600">₹{bookingAmount.toLocaleString()}</span></p>
                  </div>
                </div>
              );
            })}
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
