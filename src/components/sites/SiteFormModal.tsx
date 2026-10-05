'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Plus, Star, Trash2, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import api, { resolveImageUrl } from '@/lib/api';
import { SiteOwnerInput } from '@/components/ui/SiteOwnerSelect';
import type { BookingRecord, Site, Client, MediaStatus, SiteInfo } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { todayISO } from '@/lib/date';
import { formatINR, parseINRInput, formatIndianGroups } from '@/lib/currency';
import DatePicker from '@/components/ui/DatePicker';
import MediaPreviewModal from '@/components/inventory/MediaPreviewModal';
import CustomSelect from '@/components/ui/CustomSelect';
import { MEDIA_TYPES, ILLUMINATION_OPTIONS } from '@/lib/mediaTypes';
import { MEDIA_STATUS_LIST, STATUS_LABELS, isDatedStatus } from '@/lib/siteStatus';
import StatusDetailsFields, {
  BlockDetailsFields,
  blockDetailsError,
  blockDetailsFromSite,
  emptyBlockDetails,
  emptyStatusDetails,
  statusDetailsFromSite,
  statusDetailsValid,
  type BlockDetails,
  type StatusDetails,
} from './StatusDetailsFields';


const emptyForm = {
  mediaId: '',
  mediaType: '',
  quantity: '1',
  state: '',
  city: '',
  location: '',
  areaName: '',
  siteOwner: '',
  locationDetails: '',
  trafficViewFrom: '',
  trafficViewTo: '',
  specification: '',
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
  mediaStatus: 'immediate' as MediaStatus,
  // Active/Inactive is the site's own setting — Inactive sites never appear in client proposals.
  isActive: true,
  siteInfoId: '',
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

// One tile in the Media Image gallery — a saved image (url) or one picked but not yet uploaded (file).
type GalleryImage = { key: string; url?: string; file?: File; preview: string };

// All images saved for a site. Sites from before the multi-image gallery only have mediaImage.
function galleryOf(site: Site): string[] {
  const list = [...(site.mediaImages || [])];
  if (site.mediaImage && !list.includes(site.mediaImage)) list.unshift(site.mediaImage);
  return list;
}

// Default Specification text from the size, e.g. "30 x 20" ('' until both are filled in).
function specFromSize(width: string, height: string) {
  return width && height ? `${width} x ${height}` : '';
}

// Width/Height from a Specification that starts with a size: "30 x 20", "30X20", "30 × 20 ft double side".
function parseSpecSize(text: string): { width: string; height: string } | null {
  const m = text.trim().match(/^(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)/);
  return m ? { width: m[1], height: m[2] } : null;
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
  // Media image gallery: saved images (url) and newly picked ones (file); one is the default.
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [defaultKey, setDefaultKey] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedPriceField, setFocusedPriceField] = useState<string | null>(null);

  // Booking Details (inline, shown when Media Status = Booked) — one site can have several
  // non-overlapping booking orders; "+ Add Booking" appends another inline card below.
  const [clients, setClients] = useState<Client[]>([]);
  const [bookingRows, setBookingRows] = useState<BookingRow[]>([]);
  // "Delete" on an already-saved booking (has a bookingId) opens this confirm-with-reason
  // modal instead of removing it locally — cancellation must go through the backend so it's
  // recorded in history/timeline and the site's status is recalculated from what remains.
  const [cancelTarget, setCancelTarget] = useState<{ index: number; row: BookingRow } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Site Information (optional) — a reusable master list of Title/Description cards shown on
  // PPT templates that support it (e.g. Adinn-Direct-Client-format). "+ Add Site Information"
  // opens a small quick-create modal instead of navigating away from the site form.
  const [siteInfos, setSiteInfos] = useState<SiteInfo[]>([]);
  const [siteInfoModalOpen, setSiteInfoModalOpen] = useState(false);

  function loadSiteInfos() {
    api.get('/site-info').then((res) => setSiteInfos(res.data));
  }

  // Block Details (customer + dates + reason, shown when Media Status = Blocked)
  const [blockDetails, setBlockDetails] = useState<BlockDetails>(emptyBlockDetails);
  // Hold / Issue (reason) details.
  const [statusDetails, setStatusDetails] = useState<StatusDetails>(emptyStatusDetails);

  useEffect(() => {
    if (!open) return;
    api.get('/clients', { params: { limit: 200 } }).then((res) => setClients(res.data.items));
    loadSiteInfos();
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
        trafficViewFrom: site.trafficViewFrom || '',
        trafficViewTo: site.trafficViewTo || '',
        specification: site.specification || specFromSize(site.width?.toString() || '', site.height?.toString() || ''),
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
        mediaImage: site.mediaImage || '',
        mediaStatus: site.mediaStatus,
        isActive: site.isActive !== false,
        siteInfoId: typeof site.siteInfoId === 'object' ? site.siteInfoId?._id || '' : site.siteInfoId || '',
      });
      const saved = galleryOf(site);
      setImages(saved.map((url) => ({ key: url, url, preview: resolveImageUrl(url) })));
      setDefaultKey(site.mediaImage || saved[0] || '');

      if (site.bookings && site.bookings.length > 0) {
        // Cancelled bookings stay in `site.bookings` for history/timeline, but they're no
        // longer an editable/active booking, so they don't belong in this list.
        setBookingRows(site.bookings.filter((b) => b.status !== 'cancelled').map(bookingRecordToRow));
      } else if (site.mediaStatus === 'booked' && site.bookingInfo) {
        setBookingRows([bookingRecordToRow({ ...site.bookingInfo, status: 'active' } as BookingRecord)]);
      } else {
        setBookingRows([]);
      }

      setStatusDetails(statusDetailsFromSite(site, site.mediaStatus));
      // A block running now or scheduled ahead pre-fills the Blocked form.
      setBlockDetails(blockDetailsFromSite(site));
    } else {
      setForm(emptyForm);
      setImages([]);
      setDefaultKey('');
      setBookingRows([]);
      setBlockDetails(emptyBlockDetails);
      setStatusDetails(emptyStatusDetails);
    }
    setErrors({});
  }, [site, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Specification follows Width x Height while it's empty or still the auto text ("30 x 20");
      // anything the user wrote themselves is left alone.
      if ((key === 'width' || key === 'height') && (!f.specification.trim() || f.specification === specFromSize(f.width, f.height))) {
        next.specification = specFromSize(next.width, next.height);
      }
      // And the other way: clearing the Specification clears Width/Height; typing a size ("30 x 20",
      // "30 x 20 ft double side") sets them from it. Other text leaves them as they are.
      if (key === 'specification') {
        const text = String(value);
        const size = parseSpecSize(text);
        if (!text.trim()) {
          next.width = '';
          next.height = '';
        } else if (size) {
          next.width = size.width;
          next.height = size.height;
        }
      }
      return next;
    });
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

  function handleImageFiles(fileList: FileList) {
    const added: GalleryImage[] = [];
    for (const file of Array.from(fileList)) {
      if (!/^image\/(jpeg|png)$/.test(file.type) || !/\.(png|jpe?g)$/i.test(file.name)) {
        showToast(`${file.name}: only PNG, JPG or JPEG images are allowed`, 'error');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name}: image is ${(file.size / (1024 * 1024)).toFixed(1)}MB — maximum size is 5MB`, 'error');
        continue;
      }
      // Local preview only — the files are sent with the Save request and uploaded
      // server-side, so no separate upload API call happens on selection.
      added.push({ key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, file, preview: URL.createObjectURL(file) });
    }
    if (!added.length) return;
    setImages((prev) => [...prev, ...added]);
    // The first image ever added becomes the default automatically.
    setDefaultKey((current) => current || added[0].key);
    clearError('mediaImage');
  }

  function removeImage(key: string) {
    const next = images.filter((img) => img.key !== key);
    setImages(next);
    // Deleting the default hands the role to the first remaining image.
    if (key === defaultKey) setDefaultKey(next[0]?.key || '');
  }

  const monthlyTotalCost = calcTotalCost(form.monthlyAmount, form.printingCost, form.mountingCost);

  // Shows plain digits while the user is actively typing in a price field (so commas/₹
  // never fight the cursor), and the formatted ₹ / Indian-grouped value once they blur out.
  function priceDisplayValue(key: 'monthlyAmount' | 'printingCost' | 'mountingCost') {
    const raw = form[key];
    if (focusedPriceField === key) return formatIndianGroups(raw);
    return raw ? formatINR(raw) : '';
  }

  function updatePriceField(key: 'monthlyAmount' | 'printingCost' | 'mountingCost', rawInput: string) {
    update(key, parseINRInput(rawInput));
  }

  function addBookingRow() {
    setBookingRows((rows) => [...rows, newBookingRow()]);
  }

  function removeBookingRow(index: number) {
    setBookingRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function confirmCancelBooking() {
    if (!cancelTarget || !site) return;
    const reason = cancelReason.trim();
    if (!reason) return;
    setCancelling(true);
    try {
      const res = await api.patch(`/sites/${site._id}/bookings/${cancelTarget.row.bookingId}/cancel`, {
        reason,
        source: 'sites',
      });
      // The cancelled booking no longer belongs in this editable list — it's history now,
      // visible via Edit History / Inventory Timeline instead. Remaining bookings (e.g. an
      // Upcoming one) are untouched; the site's live status/mediaStatus is recalculated
      // server-side from whatever's left, so refresh the row list from the response.
      const updatedBookings = (res.data.bookings || []).filter((b: BookingRecord) => b.status !== 'cancelled');
      setBookingRows(updatedBookings.map(bookingRecordToRow));
      showToast('Booking cancelled successfully');
      onSaved();
      setCancelTarget(null);
      setCancelReason('');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelling(false);
    }
  }

  // Dates held by the OTHER booking cards — greyed out in this card's pickers so bookings can't overlap.
  function otherBookingRanges(index: number) {
    return bookingRows
      .filter((r, i) => i !== index && r.startDate && r.endDate)
      .map((r) => ({ start: r.startDate, end: r.endDate }));
  }

  // This card's End Date can't run past the next other booking after its Start Date.
  function endDateLimit(index: number) {
    const start = bookingRows[index]?.startDate;
    if (!start) return undefined;
    const next = otherBookingRanges(index).map((r) => r.start).filter((s) => s > start).sort()[0];
    if (!next) return undefined;
    const [y, m, d] = next.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
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
      // Only compare against EARLIER rows (j < i), so a conflicting pair gets the error
      // assigned once — to the later row (the one being added/edited) — instead of the old
      // symmetric check (j over all rows) which flagged both sides of every overlap.
      for (let j = 0; j < i; j++) {
        if (rows[j].status === 'completed') continue;
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
    // Area Name, Latitude, Longitude, Display Cost Per Month and Media Image are optional —
    // only validated when a value is entered.
    if (form.latitude !== '' && (isNaN(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90)) {
      errs.latitude = 'Latitude must be between -90 and 90';
    }
    if (form.longitude !== '' && (isNaN(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180)) {
      errs.longitude = 'Longitude must be between -180 and 180';
    }

    if (!form.illumination.trim()) errs.illumination = 'Illumination is required';
    if (!form.width) errs.width = 'Width is required';
    else if (Number(form.width) <= 0) errs.width = 'Width must be greater than 0';
    if (!form.height) errs.height = 'Height is required';
    else if (Number(form.height) <= 0) errs.height = 'Height must be greater than 0';
    if (!form.specification.trim()) errs.specification = 'Specification is required';

    for (const [key, label, required] of [
      ['monthlyAmount', 'Display Cost Per Month', false],
      ['printingCost', 'Printing Cost', false],
      ['mountingCost', 'Mounting Cost', false],
    ] as const) {
      const val = form[key];
      if (!val) {
        if (required) errs[key] = `${label} is required`;
      } else if (isNaN(Number(val)) || Number(val) < 0) errs[key] = `${label} must be a valid number >= 0`;
    }

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

    if (isDatedStatus(form.mediaStatus)) {
      const blockError = blockDetailsError(blockDetails);
      if (blockError) errs.blockDetails = blockError;
    }
    if ((form.mediaStatus === 'hold' || form.mediaStatus === 'issue') && !statusDetailsValid(form.mediaStatus, statusDetails)) {
      errs.statusDetails = 'Reason is required';
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
      const OPTIONAL_NUMERIC_FIELDS = new Set(['latitude', 'longitude', 'monthlyAmount', 'printingCost', 'mountingCost']);
      (Object.keys(form) as (keyof typeof form)[]).forEach((key) => {
        if (key === 'mediaImage') return; // never send the existing URL as a field; only a new file goes up
        const value = form[key];
        // Optional numbers are still sent blank on Edit so clearing a saved value actually removes it.
        if (numericFields.has(key) && value === '' && !(site && OPTIONAL_NUMERIC_FIELDS.has(key))) return;
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
      } else if (isDatedStatus(form.mediaStatus)) {
        (Object.keys(blockDetails) as (keyof BlockDetails)[]).forEach((k) => fd.append(k, blockDetails[k]));
      } else if (form.mediaStatus === 'hold' || form.mediaStatus === 'issue') {
        (Object.keys(statusDetails) as (keyof StatusDetails)[]).forEach((k) => fd.append(k, statusDetails[k]));
      }
      // Full gallery: saved images to keep (in order), new files, and which one is the default.
      fd.append('imageGallery', '1');
      fd.append('keepImages', JSON.stringify(images.filter((img) => img.url).map((img) => img.url)));
      const newImages = images.filter((img) => img.file);
      newImages.forEach((img) => fd.append('mediaImages', img.file as File));
      const defaultImg = images.find((img) => img.key === defaultKey) || images[0];
      if (defaultImg) {
        fd.append('defaultImage', defaultImg.url || `new:${newImages.indexOf(defaultImg)}`);
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
        setImages([]);
        setDefaultKey('');
        setBookingRows([]);
        setBlockDetails(emptyBlockDetails);
        setStatusDetails(emptyStatusDetails);
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
            <CustomSelect
              id="site-field-mediaType"
              value={form.mediaType}
              onChange={(val) => update('mediaType', val)}
              placeholder="Select media type"
              options={MEDIA_TYPES}
              className={fieldCls(!!errors.mediaType)}
            />
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
            <CitySelect state={form.state} value={form.city} onChange={(city) => update('city', city)} className={fieldCls(!!errors.city)} allowAdd={true} />
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
          <Field label="Area Name" error={errors.areaName}>
            <input
              id="site-field-areaName"
              placeholder="Enter area name"
              value={form.areaName}
              onChange={(e) => update('areaName', e.target.value)}
              className={fieldCls(!!errors.areaName)}
            />
          </Field>
          <Field label="Site Owner">
            <SiteOwnerInput
              id="site-field-siteOwner"
              value={form.siteOwner}
              onChange={(owner) => update('siteOwner', owner)}
              className={fieldCls(false)}
            />
          </Field>
        </Section>

        <Section title="Location Details">
          <Field label="Latitude" error={errors.latitude}>
            <input
              id="site-field-latitude"
              placeholder="e.g. 13.0827"
              value={form.latitude}
              onChange={(e) => update('latitude', e.target.value)}
              className={fieldCls(!!errors.latitude)}
            />
          </Field>
          <Field label="Longitude" error={errors.longitude}>
            <input
              id="site-field-longitude"
              placeholder="e.g. 80.2707"
              value={form.longitude}
              onChange={(e) => update('longitude', e.target.value)}
              className={fieldCls(!!errors.longitude)}
            />
          </Field>
          <Field label="Traffic View From">
            <input
              id="site-field-trafficViewFrom"
              placeholder="e.g. Madurai"
              value={form.trafficViewFrom}
              onChange={(e) => update('trafficViewFrom', e.target.value)}
              className={fieldCls(false)}
            />
          </Field>
          <Field label="Traffic View To">
            <input
              id="site-field-trafficViewTo"
              placeholder="e.g. Trichy"
              value={form.trafficViewTo}
              onChange={(e) => update('trafficViewTo', e.target.value)}
              className={fieldCls(false)}
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
            <CustomSelect
              id="site-field-illumination"
              value={form.illumination}
              onChange={(val) => update('illumination', val)}
              options={ILLUMINATION_OPTIONS}
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
          <Field label="Total Sq.ft">
            <input disabled value={`${form.width || 0} x ${form.height || 0} = ${calcAutoSize(form.width, form.height)}`} className={`${inputCls} bg-slate-50 text-slate-500`} />
          </Field>
          <Field label="Specification" required error={errors.specification}>
            <input
              id="site-field-specification"
              placeholder="e.g. 30 x 20"
              value={form.specification}
              onChange={(e) => update('specification', e.target.value)}
              className={fieldCls(!!errors.specification)}
            />
          </Field>
        </Section>

        <Section title="Pricing">
          <Field label="Display Cost Per Month" error={errors.monthlyAmount}>
            <input
              id="site-field-monthlyAmount"
              type="text"
              inputMode="decimal"
              placeholder="Enter display cost per month"
              value={priceDisplayValue('monthlyAmount')}
              onFocus={() => setFocusedPriceField('monthlyAmount')}
              onBlur={() => setFocusedPriceField(null)}
              onChange={(e) => updatePriceField('monthlyAmount', e.target.value)}
              className={fieldCls(!!errors.monthlyAmount)}
            />
          </Field>
          <Field label="Printing Cost" error={errors.printingCost}>
            <input
              id="site-field-printingCost"
              type="text"
              inputMode="decimal"
              placeholder="Enter printing cost"
              value={priceDisplayValue('printingCost')}
              onFocus={() => setFocusedPriceField('printingCost')}
              onBlur={() => setFocusedPriceField(null)}
              onChange={(e) => updatePriceField('printingCost', e.target.value)}
              className={fieldCls(!!errors.printingCost)}
            />
          </Field>
          <Field label="Mounting Cost" error={errors.mountingCost}>
            <input
              id="site-field-mountingCost"
              type="text"
              inputMode="decimal"
              placeholder="Enter mounting cost"
              value={priceDisplayValue('mountingCost')}
              onFocus={() => setFocusedPriceField('mountingCost')}
              onBlur={() => setFocusedPriceField(null)}
              onChange={(e) => updatePriceField('mountingCost', e.target.value)}
              className={fieldCls(!!errors.mountingCost)}
            />
          </Field>
          <Field label="Total Cost">
            <input disabled value={formatINR(monthlyTotalCost)} className={`${inputCls} bg-slate-50 text-slate-500`} />
          </Field>
        </Section>

        <Section title="Media Image">
          <div className="col-span-2" id="site-field-mediaImage">
            <div className="flex flex-wrap gap-3">
              {images.map((img) => {
                const isDefault = img.key === defaultKey;
                return (
                  <div
                    key={img.key}
                    className={`relative w-44 rounded-lg border-2 bg-white ${isDefault ? 'border-red-500 shadow-sm' : 'border-slate-200'}`}
                  >
                    <img
                      src={img.preview}
                      alt="Media"
                      className="h-28 w-full cursor-zoom-in rounded-t-md object-cover bg-slate-50"
                      onClick={() => setPreviewImage(img.preview)}
                    />
                    {isDefault && (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        <Star className="h-3 w-3 fill-current" /> Default
                      </span>
                    )}
                    <button
                      type="button"
                      title="Delete image"
                      onClick={() => removeImage(img.key)}
                      className="absolute -right-2 -top-2 rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow hover:border-red-300 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                      <span className="text-[11px] text-slate-400">{img.file ? 'New' : 'Saved'}</span>
                      {isDefault ? (
                        <span className="text-[11px] font-medium text-red-600">Default image</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDefaultKey(img.key)}
                          className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                        >
                          Set default
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <label
                className={`flex h-[9.25rem] w-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                  errors.mediaImage ? 'border-red-400 text-red-400 hover:border-red-500' : 'border-slate-300 text-slate-400 hover:border-red-400 hover:text-red-500'
                }`}
              >
                <ImagePlus className="h-6 w-6 mb-1" />
                <span className="text-xs">{images.length ? 'Add more images' : 'Upload images'}</span>
                <span className="mt-1 text-[10px] text-slate-400">PNG, JPG, JPEG · Max 5MB</span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) handleImageFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {images.length > 1 && (
              <p className="mt-2 text-xs text-slate-500">The default image is the one shown in lists, PPT and Excel exports.</p>
            )}
            {errors.mediaImage && <p className="mt-1 text-xs font-medium text-red-600">{errors.mediaImage}</p>}
          </div>
        </Section>

        <Section title="Site Information">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Site Information</label>
            <CustomSelect
              id="site-field-siteInfoId"
              value={form.siteInfoId}
              onChange={(val) => {
                if (val === '__add_new__') {
                  setSiteInfoModalOpen(true);
                  return;
                }
                update('siteInfoId', val);
              }}
              placeholder="None"
              options={[
                ...siteInfos.map((si) => ({ value: si._id, label: si.title })),
                { value: '__add_new__', label: '+ Add Site Information' },
              ]}
              className={fieldCls(false)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Optional — shown as a description card on PPT templates that support it (e.g. Adinn-Direct-Client-format).
            </p>
          </div>
        </Section>

        <Section title="Media Status">
          <div className="col-span-2 flex flex-wrap gap-2">
            {MEDIA_STATUS_LIST.map((s) => (
              <button
                type="button"
                key={s}
                disabled={!form.isActive}
                onClick={() => {
                  update('mediaStatus', s);
                  setStatusDetails(statusDetailsFromSite(site, s));
                  clearError('statusDetails');
                  if (s === 'booked') setBookingRows((rows) => (rows.length ? rows : [newBookingRow()]));
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  form.mediaStatus === s ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {!form.isActive && (
            <p className="col-span-2 -mt-1 text-xs text-slate-500">
              Inactive sites are always Immediate — any block, confirmation, hold or issue is removed when saved (bookings are kept). Make the site Active to change its status.
            </p>
          )}
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-700">Site Active</p>
              <p className="text-xs text-slate-500">Inactive sites are kept but hidden from client proposals.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => {
                const nextActive = !form.isActive;
                update('isActive', nextActive);
                // Inactive sites are always Immediate.
                if (!nextActive) update('mediaStatus', 'immediate');
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              <span className="sr-only">{form.isActive ? 'Active' : 'Inactive'}</span>
            </button>
          </div>
        </Section>

        {form.mediaStatus === 'booked' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700">Booking Details</h4>
              <button
                type="button"
                onClick={addBookingRow}
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
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
                <div key={row.bookingId || index} className="space-y-3 rounded-lg bg-red-50 border border-red-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-red-700">
                      Booking #{index + 1} {row.status && <span className="capitalize font-normal text-red-500">({row.status})</span>}
                    </p>
                    {!readOnly && bookingRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          // A booking already saved on the server (has a bookingId) must go
                          // through the Cancel Booking confirmation + reason flow — only a
                          // brand-new, not-yet-saved row can be removed locally with no trace.
                          row.bookingId ? setCancelTarget({ index, row }) : removeBookingRow(index)
                        }
                        className="text-slate-400 hover:text-red-600"
                      >
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
                          onClick={() => updateBookingRow(index, { customerType: t, clientId: '' })}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize disabled:opacity-60 ${
                            row.customerType === t ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{row.customerType === 'agency' ? 'Agency' : 'Client'} *</label>
                    <CustomSelect
                      id={`site-field-booking-${index}`}
                      value={row.clientId}
                      disabled={readOnly}
                      onChange={(val) => updateBookingRow(index, { clientId: val })}
                      placeholder={`Select ${row.customerType === 'agency' ? 'agency' : 'client'}`}
                      options={clients
                        .filter((c) => (row.customerType === 'agency' ? c.customerType === 'agency' : c.customerType !== 'agency'))
                        .map((c) => ({ value: c._id, label: c.name }))}
                      className={fieldCls(!!errors[`booking-${index}`])}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                      <DatePicker
                        value={row.startDate}
                        onChange={(v) =>
                          updateBookingRow(index, {
                            startDate: v,
                            // Only clear End Date if it's no longer valid against the new
                            // Start Date — leave a still-valid End Date untouched.
                            ...(row.endDate && row.endDate < v ? { endDate: '' } : {}),
                          })
                        }
                        // Start Date selection is always floored at today, for new AND already-
                        // saved bookings alike — this only disables which NEW dates are pickable
                        // in the calendar. It never touches `row.startDate` itself, so an existing
                        // historical booking keeps displaying its own saved (possibly past) value
                        // untouched until the user actively picks a different date.
                        min={todayISO()}
                        max={row.endDate || undefined}
                        disabledRanges={otherBookingRanges(index)}
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
                        max={endDateLimit(index)}
                        disabledRanges={otherBookingRanges(index)}
                        error={!!errors[`booking-${index}`]}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  {errors[`booking-${index}`] && <p className="text-xs font-medium text-red-600">{errors[`booking-${index}`]}</p>}
                  <div className="rounded-lg bg-white border border-red-200 p-3 text-sm space-y-1">
                    <p className="text-slate-600">Monthly Cost: <span className="font-semibold text-slate-800">{formatINR(monthlyTotalCost)}</span></p>
                    <p className="text-slate-600">Duration: <span className="font-semibold text-slate-800">{durationDays} Days</span></p>
                    <p className="text-slate-600">Booking Amount: <span className="font-semibold text-emerald-600">{formatINR(bookingAmount)}</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isDatedStatus(form.mediaStatus) && (
          <div id="site-field-blockDetails">
            <BlockDetailsFields
              kind={form.mediaStatus}
              value={blockDetails}
              onChange={(next) => {
                setBlockDetails(next);
                clearError('blockDetails');
              }}
              clients={clients}
              // A block can't overlap the site's bookings.
              bookedRanges={bookingRows.filter((r) => r.startDate && r.endDate).map((r) => ({ start: r.startDate, end: r.endDate }))}
              // A block that's already running keeps its own (past) Start Date.
              minStartDate={
                isDatedStatus(site?.mediaStatus) && site?.blockInfo?.startDate && site.blockInfo.startDate.slice(0, 10) < todayISO()
                  ? site.blockInfo.startDate.slice(0, 10)
                  : todayISO()
              }
              error={errors.blockDetails}
            />
          </div>
        )}

        <div id="site-field-statusDetails">
          <StatusDetailsFields
            status={form.mediaStatus}
            value={statusDetails}
            onChange={(next) => {
              setStatusDetails(next);
              clearError('statusDetails');
            }}
          />
          {errors.statusDetails && <p className="mt-1 text-xs font-medium text-red-600">{errors.statusDetails}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          {!site && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Save & Add Another
            </button>
          )}
          <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      <MediaPreviewModal
        open={!!previewImage}
        onClose={() => setPreviewImage('')}
        image={previewImage}
        mediaCode={form.mediaId}
        mediaType={form.mediaType}
        location={form.location}
      />

      <SiteInfoQuickAddModal
        open={siteInfoModalOpen}
        onClose={() => setSiteInfoModalOpen(false)}
        onSaved={(created) => {
          setSiteInfos((prev) => [created, ...prev]);
          update('siteInfoId', created._id);
          setSiteInfoModalOpen(false);
        }}
      />

      <Modal
        open={!!cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
        title="Cancel Booking"
        size="sm"
      >
        {cancelTarget && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Booking: <span className="font-medium text-slate-800">{formatDateLabel(cancelTarget.row.startDate)} → {formatDateLabel(cancelTarget.row.endDate)}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Reason *</label>
              <textarea
                autoFocus
                placeholder="e.g. Client rejected the booking"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCancelBooking}
                disabled={!cancelReason.trim() || cancelling}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  );
}

// Small quick-create modal for the "+ Add Site Information" dropdown option — lets the user
// create a new SiteInfo master record without leaving the Site form, then selects it immediately.
function SiteInfoQuickAddModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (created: SiteInfo) => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setErrors({});
    }
  }, [open]);

  async function save() {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!description.trim()) errs.description = 'Description is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const res = await api.post('/site-info', { title: title.trim(), description: description.trim() });
      showToast('Site Information saved');
      onSaved(res.data);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save Site Information', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Site Information" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. High Traffic Location"
            className={fieldCls(!!errors.title)}
          />
          {errors.title && <p className="mt-1 text-xs font-medium text-red-600">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. This site is strategically important due to heavy daily traffic and strong visibility from multiple approach directions."
            rows={4}
            className={fieldCls(!!errors.description)}
          />
          {errors.description && <p className="mt-1 text-xs font-medium text-red-600">{errors.description}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';

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
