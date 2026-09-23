'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { formatIST } from '@/lib/date';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { SiteInfo } from '@/lib/types';

// Site Info Management — a reusable master list of Title/Description cards. Sites optionally
// link to one via `siteInfoId`; the description shows up on PPT templates that support it
// (e.g. Adinn-Direct-Client-format). CRUD here is intentionally simple (no pagination/search)
// since this is a small lookup list, not a high-volume table like Sites/Clients.
export default function SiteInfoManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'admin' || user?.role === 'tl' || user?.role === 'user';

  const [items, setItems] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SiteInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteInfo | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(() => {
    setLoading(true);
    api
      .get('/site-info')
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openForm(item: SiteInfo | null) {
    setEditing(item);
    setForm({ title: item?.title || '', description: item?.description || '' });
    setErrors({});
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/site-info/${editing._id}`, form);
        showToast('Site Information updated successfully');
      } else {
        await api.post('/site-info', form);
        showToast('Site Information saved successfully');
      }
      fetchItems();
      setFormOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save Site Information', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/site-info/${deleteTarget._id}`);
      showToast('Site Information deleted successfully');
      fetchItems();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete Site Information', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Site Info Management</h1>
          <p className="text-sm text-slate-500">Reusable Title/Description cards that can be linked to a site and shown on supported PPT templates.</p>
        </div>
        {canManage && (
          <button
            onClick={() => openForm(null)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Site Information
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No Site Information added yet" />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((si) => (
                  <tr key={si._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{si.title}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xl truncate">{si.description}</td>
                    <td className="px-4 py-3 text-slate-500">{formatIST(si.createdAt)}</td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openForm(si)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(si)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Site Information' : 'Add Site Information'} size="md">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. This site is strategically important due to heavy daily traffic and strong visibility from multiple approach directions."
              rows={4}
              className={fieldCls(!!errors.description)}
            />
            {errors.description && <p className="mt-1 text-xs font-medium text-red-600">{errors.description}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Site Information"
        message={`Delete "${deleteTarget?.title}"? Sites already linked to it will simply show no card until relinked.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

function fieldCls(hasError: boolean) {
  return hasError
    ? 'w-full rounded-lg border border-red-400 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100'
    : inputCls;
}
