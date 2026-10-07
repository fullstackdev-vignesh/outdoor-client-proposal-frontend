'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { formatIST } from '@/lib/date';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Loader from '@/components/ui/Loader';
import ScrollTable from '@/components/ui/ScrollTable';
import CustomSelect from '@/components/ui/CustomSelect';
import { MEDIA_TYPES } from '@/lib/mediaTypes';
import { MOUNTING_TYPE_LABELS, type MediaRate, type MountingType } from '@/lib/mediaCostRates';

type RateForm = {
  mediaType: string;
  printingBackLit: string;
  printingOther: string;
  mountingType: MountingType | '';
  mountingAmount: string;
};
type RateErrors = Partial<Record<keyof RateForm, string>>;

const emptyForm: RateForm = { mediaType: '', printingBackLit: '', printingOther: '', mountingType: '', mountingAmount: '' };

const MOUNTING_OPTIONS = (Object.keys(MOUNTING_TYPE_LABELS) as MountingType[]).map((value) => ({
  value,
  label: MOUNTING_TYPE_LABELS[value],
}));

// Digits with an optional decimal part.
const decimalOnly = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

function mountingText(r: MediaRate) {
  if (r.mountingType === 'perSqFt') return `${money(r.mountingAmount)} / Sq.Ft`;
  if (r.mountingType === 'perQuantity') return `${money(r.mountingAmount)} / Quantity`;
  return `${money(r.mountingAmount)} Fixed`;
}

// Rate Master — Printing / Mounting rates per Media Type (GET/POST/PUT/DELETE /media-rates).
// The site form uses these rates to fill Printing Cost and Mounting Cost.
export default function RateMasterManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'admin';

  const [rates, setRates] = useState<MediaRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MediaRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaRate | null>(null);
  const [form, setForm] = useState<RateForm>(emptyForm);
  const [errors, setErrors] = useState<RateErrors>({});
  const [saving, setSaving] = useState(false);

  // Refetches keep the current rows on screen; only the first load shows the loader.
  function fetchRates() {
    return api
      .get('/media-rates')
      .then((res) => setRates(res.data))
      .catch(() => showToast('Failed to load rates', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = search.trim().toLowerCase();
  const visible = useMemo(() => (query ? rates.filter((r) => r.mediaType.toLowerCase().includes(query)) : rates), [rates, query]);

  // Every Media Type, plus any saved rate whose type isn't in that list.
  const mediaTypeOptions = useMemo(() => {
    const list: string[] = [...MEDIA_TYPES];
    rates.forEach((r) => {
      if (!list.some((t) => t.toLowerCase() === r.mediaType.trim().toLowerCase())) list.push(r.mediaType);
    });
    return list;
  }, [rates]);

  const rateFor = (mediaType: string) => rates.find((r) => r.mediaType.trim().toLowerCase() === mediaType.trim().toLowerCase());

  // Picking a type that already has a rate loads that rate, so saving updates it instead of
  // creating a duplicate.
  function selectMediaType(value: string) {
    const existing = rateFor(value);
    if (existing && existing._id !== editing?._id) {
      openForm(existing);
      return;
    }
    setField('mediaType', value);
  }

  function openForm(item: MediaRate | null) {
    setEditing(item);
    setForm(
      item
        ? {
            mediaType: item.mediaType,
            printingBackLit: String(item.printingBackLit ?? ''),
            printingOther: String(item.printingOther ?? ''),
            mountingType: item.mountingType,
            mountingAmount: String(item.mountingAmount ?? ''),
          }
        : emptyForm
    );
    setErrors({});
    setFormOpen(true);
  }

  function setField<K extends keyof RateForm>(key: K, value: RateForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: RateErrors = {};
    if (!form.mediaType) errs.mediaType = 'Media Type is required';
    if (form.printingBackLit === '') errs.printingBackLit = 'Back Lit printing rate is required';
    if (form.printingOther === '') errs.printingOther = 'Front / Non Lit printing rate is required';
    if (!form.mountingType) errs.mountingType = 'Mounting Type is required';
    if (form.mountingAmount === '') errs.mountingAmount = 'Mounting amount is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      mediaType: form.mediaType,
      printingBackLit: Number(form.printingBackLit),
      printingOther: Number(form.printingOther),
      mountingType: form.mountingType,
      mountingAmount: Number(form.mountingAmount),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/media-rates/${editing._id}`, body);
        showToast('Rate updated successfully');
      } else {
        await api.post('/media-rates', body);
        showToast('Rate saved successfully');
      }
      fetchRates();
      setFormOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save rate', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/media-rates/${deleteTarget._id}`);
      showToast('Rate deleted successfully');
      fetchRates();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete rate', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  const colCount = canManage ? 6 : 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Rate Master</h1>
            {!loading && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                {rates.length} {rates.length === 1 ? 'Rate' : 'Rates'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Printing and Mounting rates per Media Type. The site form fills Printing Cost and Mounting Cost from these.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => openForm(null)}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" /> Add Rate
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Media Type..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              title="Clear search"
              className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-clip">
        <ScrollTable>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Media Type</th>
                <th className="px-4 py-3">Printing – Back Lit</th>
                <th className="px-4 py-3">Printing – Front / Non Lit</th>
                <th className="px-4 py-3">Mounting</th>
                <th className="px-4 py-3">Updated</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center">
                    <Loader overlay text="Loading rates..." />
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={colCount}>
                    <EmptyState title={query ? `No rates match "${search.trim()}"` : 'No rates added yet'} />
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.mediaType}</td>
                    <td className="px-4 py-3 text-slate-600">{money(r.printingBackLit)} / Sq.Ft</td>
                    <td className="px-4 py-3 text-slate-600">{money(r.printingOther)} / Sq.Ft</td>
                    <td className="px-4 py-3 text-slate-600">{mountingText(r)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.updatedAt ? formatIST(r.updatedAt) : '—'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openForm(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </ScrollTable>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Rate' : 'Add Rate'} size="md">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Media Type" required error={errors.mediaType}>
            <CustomSelect
              value={form.mediaType}
              onChange={selectMediaType}
              options={mediaTypeOptions}
              placeholder="Select Media Type"
            />
            {editing && (
              <p className="mt-1 text-xs text-slate-500">This Media Type already has a rate — saving will update it.</p>
            )}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Printing – Back Lit (₹ / Sq.Ft)" required error={errors.printingBackLit}>
              <input
                inputMode="decimal"
                value={form.printingBackLit}
                onChange={(e) => setField('printingBackLit', decimalOnly(e.target.value))}
                placeholder="e.g. 25"
                className={fieldCls(!!errors.printingBackLit)}
              />
            </Field>
            <Field label="Printing – Front / Non Lit (₹ / Sq.Ft)" required error={errors.printingOther}>
              <input
                inputMode="decimal"
                value={form.printingOther}
                onChange={(e) => setField('printingOther', decimalOnly(e.target.value))}
                placeholder="e.g. 13"
                className={fieldCls(!!errors.printingOther)}
              />
            </Field>
            <Field label="Mounting Type" required error={errors.mountingType}>
              <CustomSelect
                value={form.mountingType}
                onChange={(v) => setField('mountingType', v as MountingType)}
                options={MOUNTING_OPTIONS}
                placeholder="Select Mounting Type"
              />
            </Field>
            <Field
              label={`Mounting Amount (₹${form.mountingType === 'perSqFt' ? ' / Sq.Ft' : form.mountingType === 'perQuantity' ? ' / Quantity' : ''})`}
              required
              error={errors.mountingAmount}
            >
              <input
                inputMode="decimal"
                value={form.mountingAmount}
                onChange={(e) => setField('mountingAmount', decimalOnly(e.target.value))}
                placeholder="e.g. 5"
                className={fieldCls(!!errors.mountingAmount)}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Printing Cost = rate × Sq.Ft × Quantity. Mounting Cost = (Per Sq.Ft: amount × Sq.Ft · Fixed / Per Quantity: amount) × Quantity.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rate"
        message={`Delete the rate for "${deleteTarget?.mediaType}"? Sites of this Media Type will no longer get Printing / Mounting Cost filled automatically.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';

function fieldCls(hasError: boolean) {
  return hasError
    ? 'w-full rounded-lg border border-red-400 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100'
    : inputCls;
}
