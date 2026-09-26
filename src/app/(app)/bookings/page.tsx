'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Eye, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BookingFormModal from '@/components/bookings/BookingFormModal';
import Loader from '@/components/ui/Loader';
import type { Booking, PaginatedResponse } from '@/lib/types';

export default function BookingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const params = useSearchParams();
  const canManage = user?.role === 'admin' || user?.role === 'tl';

  const [data, setData] = useState<PaginatedResponse<Booking> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    api
      .get('/bookings', { params: { page, limit: 20, status } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (params.get('action') === 'add') setFormOpen(true);
  }, [params]);

  async function handleCancel() {
    if (!cancelTarget) return;
    try {
      await api.patch(`/bookings/${cancelTarget._id}/cancel`);
      showToast('Booking cancelled. Media returned to AVAILABLE.');
      fetchBookings();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Media Bookings</h1>
          <p className="text-sm text-slate-500">Track and manage confirmed media bookings</p>
        </div>
        {canManage && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Create Booking
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Booking ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Media Count</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <Loader text="Loading bookings..." />
                  </td>
                </tr>
              )}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No bookings found" />
                  </td>
                </tr>
              )}
              {!loading &&
                data?.items.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.bookingId}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{typeof b.client === 'object' ? b.client.name : ''}</td>
                    <td className="px-4 py-3 text-slate-600">{Array.isArray(b.sites) ? b.sites.length : 0}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(b.startDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(b.endDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-600">{b.totalAmount ? `₹${b.totalAmount.toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/bookings/${b._id}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canManage && b.status === 'active' && (
                          <button onClick={() => setCancelTarget(b)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
      </div>

      <BookingFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchBookings} />
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Booking"
        message={`Cancel booking "${cancelTarget?.bookingId}"? The associated media will return to AVAILABLE.`}
        confirmLabel="Cancel Booking"
        danger
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status]}`}>{status}</span>;
}
