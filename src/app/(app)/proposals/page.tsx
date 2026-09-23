'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Eye, Trash2, Search } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ClientSelect from '@/components/ui/ClientSelect';
import DatePicker from '@/components/ui/DatePicker';
import type { Proposal, PaginatedResponse } from '@/lib/types';

const PAGE_SIZE = 20;

// createdAt is stored via the backend's nowIST() convention (its own UTC digits already ARE the
// IST wall-clock date/time — see Proposal.js) — read with UTC getters, same convention already
// used elsewhere in this app (e.g. BookingStatusSummary), not the browser's local timezone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatCreatedAt(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
}

export default function ProposalsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResponse<Proposal> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientLabel, setClientLabel] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null);

  const fetchProposals = useCallback(() => {
    setLoading(true);
    api
      .get('/proposals', {
        params: {
          page,
          limit: PAGE_SIZE,
          status: status || undefined,
          search: search || undefined,
          client: clientId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [page, status, search, clientId, fromDate, toDate]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  function goToFilteredPage1() {
    setPage(1);
  }

  function handleFromDateChange(value: string) {
    setFromDate(value);
    goToFilteredPage1();
    // From Date moving past the already-picked To Date would make an invalid (empty) range —
    // clear To Date rather than silently keeping a now-inconsistent value.
    if (toDate && value && toDate < value) setToDate('');
  }

  function handleToDateChange(value: string) {
    // Belt-and-braces guard alongside the date input's own `min` attribute (which already stops
    // most browsers from letting the user pick an earlier date in the picker UI).
    if (fromDate && value && value < fromDate) return;
    setToDate(value);
    goToFilteredPage1();
  }

  const hasActiveFilters = !!(search || clientId || fromDate || toDate || status);

  function clearFilters() {
    setSearch('');
    setClientId('');
    setClientLabel('');
    setFromDate('');
    setToDate('');
    setStatus('');
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/proposals/${deleteTarget._id}`);
      showToast('Proposal deleted successfully');
      fetchProposals();
    } catch {
      showToast('Failed to delete proposal', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Proposals</h1>
          <p className="text-sm text-slate-500">Create and manage client media proposals</p>
        </div>
        <Link
          href="/proposals/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Create Proposal
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                goToFilteredPage1();
              }}
              placeholder="Search Proposal ID / Client..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <ClientSelect
            value={clientId}
            valueLabel={clientLabel}
            onChange={(id, label) => {
              setClientId(id);
              setClientLabel(label);
              goToFilteredPage1();
            }}
          />
          <DatePicker value={fromDate} onChange={handleFromDateChange} max={toDate || undefined} placeholder="From Date" />
          <DatePicker value={toDate} onChange={handleToDateChange} min={fromDate || undefined} placeholder="To Date" />
          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                goToFilteredPage1();
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="generated">Generated</option>
              <option value="completed">Completed</option>
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Proposal ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Media Count</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Loading proposals...
                  </td>
                </tr>
              )}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No proposals found" subtitle="Create your first proposal to get started." />
                  </td>
                </tr>
              )}
              {!loading &&
                data?.items.map((p, i) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{(data.page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.proposalId}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.client && typeof p.client === 'object' ? p.client.name : ''}</td>
                    <td className="px-4 py-3 text-slate-600">{Array.isArray(p.sites) ? p.sites.length : 0}</td>
                    <td className="px-4 py-3 text-slate-500">{formatCreatedAt(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/proposals/${p._id}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button onClick={() => setDeleteTarget(p)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Proposal"
        message={`Delete proposal "${deleteTarget?.proposalId}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    generated: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status]}`}>{status}</span>;
}
