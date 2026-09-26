'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Loader from '@/components/ui/Loader';
import type { Role } from '@/lib/types';

export default function UserManager({ role, title, subtitle }: { role: Role; title: string; subtitle: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({ name: '', phone: '', isActive: true });

  const fetchItems = useCallback(() => {
    setLoading(true);
    api
      .get('/users', { params: { role } })
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, [role]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openEdit(item: any) {
    setEditing(item);
    setForm({
      name: item?.name || '',
      phone: item?.phone || '',
      isActive: item?.isActive ?? true,
    });
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    try {
      const payload: any = { name: form.name.trim(), phone: form.phone.trim(), isActive: form.isActive };
      await api.put(`/users/${editing._id}`, payload);
      showToast('User updated successfully');
      fetchItems();
      setFormOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update user';
      showToast(msg, 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget._id}`);
      showToast('User deleted successfully');
      fetchItems();
    } catch {
      showToast('Failed to delete user', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  const roleLabel = role === 'tl' ? 'TL' : role === 'bd' ? 'BD' : 'User';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <Loader text="Loading users..." />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No records found" />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* <button onClick={() => openEdit(u)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </button> */}
                        <button onClick={() => setDeleteTarget(u)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={`Edit ${roleLabel}`} size="sm">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm((f) => ({ ...f, phone: val }));
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${roleLabel}`}
        message={`Delete ${roleLabel.toLowerCase()} "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
