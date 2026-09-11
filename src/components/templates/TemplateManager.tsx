'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Pencil, Trash2, Power, UploadCloud } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Template } from '@/lib/types';

export default function TemplateManager({
  title,
  subtitle,
  endpoint,
  showVariant,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  showVariant?: boolean;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const params = useSearchParams();
  const canManage = user?.role === 'admin' || user?.role === 'tl';

  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', description: '', version: '1.0', variant: 'Standard', fileUrl: '', status: 'active' });

  const fetchItems = useCallback(() => {
    setLoading(true);
    api
      .get(endpoint)
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (params.get('action') === 'add') openForm(null);
  }, [params]);

  function openForm(item: Template | null) {
    setEditing(item);
    setForm({
      name: item?.name || '',
      description: item?.description || '',
      version: item?.version || '1.0',
      variant: 'Standard',
      fileUrl: item?.name ? `/${item.name}.file` : '',
      status: item?.status || 'active',
    });
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`${endpoint}/${editing._id}`, form);
        showToast('Template updated successfully');
      } else {
        await api.post(endpoint, form);
        showToast('Template uploaded successfully');
      }
      fetchItems();
      setFormOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save template', 'error');
    }
  }

  async function toggleStatus(item: Template) {
    try {
      await api.patch(`${endpoint}/${item._id}/status`, { status: item.status === 'active' ? 'inactive' : 'active' });
      showToast(`Template ${item.status === 'active' ? 'deactivated' : 'activated'}`);
      fetchItems();
    } catch {
      showToast('Failed to update status', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`${endpoint}/${deleteTarget._id}`);
      showToast('Template deleted successfully');
      fetchItems();
    } catch {
      showToast('Failed to delete template', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {canManage && (
          <button
            onClick={() => openForm(null)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Upload Template
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Template Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Used Count</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Loading templates...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No templates uploaded yet" />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.description || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.version}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          t.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.usedCount}</td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleStatus(t)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                            <Power className="h-4 w-4" />
                          </button>
                          <button onClick={() => openForm(t)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(t)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Template' : 'Upload Template'} size="md">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template Name *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
              <input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} className={inputCls} />
            </div>
            {showVariant && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Variant</label>
                <input value={form.variant} onChange={(e) => setForm((f) => ({ ...f, variant: e.target.value }))} className={inputCls} />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
            <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-6 text-sm text-slate-500 cursor-pointer hover:border-blue-400">
              <UploadCloud className="h-4 w-4" />
              {form.fileUrl ? form.fileUrl : 'Click to select file'}
              <input
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setForm((f) => ({ ...f, fileUrl: `/uploads/${e.target.files![0].name}` }))}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Template"
        message={`Delete template "${deleteTarget?.name}"?`}
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
