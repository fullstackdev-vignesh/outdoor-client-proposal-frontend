'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Upload, Download, Eye, Pencil, Trash2, RefreshCcw } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SiteFormModal from '@/components/sites/SiteFormModal';
import StatusChangeModal from '@/components/sites/StatusChangeModal';
import type { Site, PaginatedResponse } from '@/lib/types';

export default function SitesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const params = useSearchParams();
  const canManage = user?.role === 'admin' || user?.role === 'tl';

  const [data, setData] = useState<PaginatedResponse<Site> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ mediaType: '', state: '', city: '', mediaStatus: '', isActive: '' });
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [statusSite, setStatusSite] = useState<Site | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);

  const fetchSites = useCallback(() => {
    setLoading(true);
    api
      .get('/sites', { params: { page, limit: 20, search, ...filters } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    if (params.get('action') === 'add') setFormOpen(true);
  }, [params]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/sites/${deleteTarget._id}`);
      showToast('Site deleted successfully');
      fetchSites();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete site', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Site / Media Management</h1>
          <p className="text-sm text-slate-500">Manage outdoor media sites and their availability</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href="/sites/bulk-upload"
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Link>
            <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => {
                setEditingSite(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add Site
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Media ID, Name, Type, City, State, Location..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={filters.mediaStatus}
            onChange={(e) => {
              setFilters((f) => ({ ...f, mediaStatus: e.target.value }));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => {
              setFilters((f) => ({ ...f, isActive: e.target.value }));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Active / Inactive</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <input
            placeholder="State"
            value={filters.state}
            onChange={(e) => {
              setFilters((f) => ({ ...f, state: e.target.value }));
              setPage(1);
            }}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="City"
            value={filters.city}
            onChange={(e) => {
              setFilters((f) => ({ ...f, city: e.target.value }));
              setPage(1);
            }}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={fetchSites}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Media ID</th>
                <th className="px-4 py-3">Media Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">City / State</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Monthly Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    Loading sites...
                  </td>
                </tr>
              )}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState title="No sites found" subtitle="Try adjusting your filters or add a new site." />
                  </td>
                </tr>
              )}
              {!loading &&
                data?.items.map((site) => (
                  <tr key={site._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{site.mediaId}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{site.mediaName}</td>
                    <td className="px-4 py-3 text-slate-600">{site.mediaType}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {site.city}, {site.state}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {site.width && site.height ? `${site.width}x${site.height} ${site.sizeUnit}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {site.monthlyAmount ? `₹${site.monthlyAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={!canManage}
                        onClick={() => setStatusSite(site)}
                        className="disabled:cursor-default"
                      >
                        <StatusBadge status={site.mediaStatus} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${site.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {site.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/sites/${site._id}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setEditingSite(site);
                                setFormOpen(true);
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(site)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
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

      <SiteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        site={editingSite}
        onSaved={fetchSites}
      />
      <StatusChangeModal open={!!statusSite} onClose={() => setStatusSite(null)} site={statusSite} onSaved={fetchSites} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Site"
        message={`Are you sure you want to delete "${deleteTarget?.mediaName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
