'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Role } from '@/lib/types';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function UserManager({ role, title, subtitle }: { role: Role; title: string; subtitle: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', isActive: true });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [errorMsg, setErrorMsg] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneDigitsRegex = /^\d+$/;

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

  function openForm(item: any) {
    setEditing(item);
    setForm({
      name: item?.name || '',
      email: item?.email || '',
      password: '',
      confirmPassword: '',
      phone: item?.phone || '',
      isActive: item?.isActive ?? true,
    });
    setFormErrors({});
    setErrorMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormOpen(true);
  }

  function validateForm(): FormErrors {
    const errors: FormErrors = {};

    if (!form.name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!form.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }

    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else {
      const cleanPhone = form.phone.trim();
      if (!phoneDigitsRegex.test(cleanPhone) || cleanPhone.length !== 10) {
        errors.phone = 'Phone number must be exactly 10 digits.';
      }
    }

    if (!editing) {
      if (!form.password) {
        errors.password = 'Password is required.';
      } else if (form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters.';
      }

      if (!form.confirmPassword) {
        errors.confirmPassword = 'Confirm Password is required.';
      } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Password and Confirm Password do not match.';
      }
    } else {
      if (form.password) {
        if (form.password.length < 6) {
          errors.password = 'Password must be at least 6 characters.';
        }
        if (form.password !== form.confirmPassword) {
          errors.confirmPassword = 'Password and Confirm Password do not match.';
        }
      }
    }

    return errors;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (/^\d+$/.test(val) && val.length > 10) {
      return;
    }
    setForm((f) => ({ ...f, phone: val }));
    setFormErrors((prev) => ({ ...prev, phone: undefined }));
    setErrorMsg('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setFormErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErr = Object.values(errors)[0];
      setErrorMsg(firstErr || 'Please fix the errors in the form.');
      return;
    }

    try {
      if (editing) {
        const payload: any = { name: form.name.trim(), phone: form.phone.trim(), isActive: form.isActive };
        if (form.password) {
          payload.password = form.password;
          payload.confirmPassword = form.confirmPassword;
        }
        await api.put(`/users/${editing._id}`, payload);
        showToast('User updated successfully');
      } else {
        await api.post('/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role,
        });
        showToast('User created successfully');
      }
      fetchItems();
      setFormOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save user';
      setErrorMsg(msg);
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
        <button
          onClick={() => openForm(null)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add {roleLabel}
        </button>
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
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Loading...
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
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openForm(u)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </button>
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit ${roleLabel}` : `Create ${roleLabel}`} size="sm">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setFormErrors((prev) => ({ ...prev, name: undefined }));
                setErrorMsg('');
              }}
              placeholder="Enter full name"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.name
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={!!editing}
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                setFormErrors((prev) => ({ ...prev, email: undefined }));
                setErrorMsg('');
              }}
              placeholder="user@example.com"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                editing ? 'bg-slate-50 cursor-not-allowed border-slate-300' : ''
              } ${
                formErrors.email
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {formErrors.email && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="e.g. 9876543210 (10 digits)"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.phone
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {formErrors.phone && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {editing ? 'New Password (optional)' : <>Password <span className="text-red-500">*</span></>}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => {
                  setForm((f) => ({ ...f, password: e.target.value }));
                  setFormErrors((prev) => ({ ...prev, password: undefined }));
                  setErrorMsg('');
                }}
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 pr-10 transition ${
                  formErrors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 z-10 p-1 text-slate-500 hover:text-slate-700 transition focus:outline-none cursor-pointer flex items-center justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5 text-slate-500" /> : <Eye className="h-5 w-5 text-slate-500" />}
              </button>
            </div>
            {formErrors.password && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.password}</p>}
          </div>

          {(!editing || form.password) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {editing ? 'Confirm New Password' : <>Confirm Password <span className="text-red-500">*</span></>}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, confirmPassword: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 pr-10 transition ${
                    formErrors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 z-10 p-1 text-slate-500 hover:text-slate-700 transition focus:outline-none cursor-pointer flex items-center justify-center"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-slate-500" /> : <Eye className="h-5 w-5 text-slate-500" />}
                </button>
              </div>
              {formErrors.confirmPassword && <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.confirmPassword}</p>}
            </div>
          )}

          {editing && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Active
            </label>
          )}

          {/* {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
              {errorMsg}
            </div>
          )} */}

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
