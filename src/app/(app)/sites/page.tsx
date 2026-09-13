'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Upload, Download, Eye, Pencil, Trash2, RefreshCcw, X, ImageOff } from 'lucide-react';
import api, { fileBaseURL } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SiteFormModal from '@/components/sites/SiteFormModal';
import StatusChangeModal from '@/components/sites/StatusChangeModal';
import SiteViewModal from '@/components/sites/SiteViewModal';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import { formatIST } from '@/lib/date';
import type { Site } from '@/lib/types';

const PAGE_SIZE = 20;

function resolveImageUrl(image?: string) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
}

const emptyFilters = { mediaType: '', state: '', city: '', mediaStatus: '', isActive: '' };

export default function SitesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const params = useSearchParams();
  const canManage = user?.role === 'admin' || user?.role === 'tl';

  const [items, setItems] = useState<Site[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [exporting, setExporting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [statusSite, setStatusSite] = useState<Site | null>(null);
  const [viewSite, setViewSite] = useState<Site | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [previewImage, setPreviewImage] = useState('');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const fetchingRef = useRef(false);
  const queryKey = JSON.stringify({ search, filters });

  const fetchPage = useCallback(
    (pageNum: number, append: boolean) => {
      if (fetchingRef.current) return Promise.resolve();
      fetchingRef.current = true;
      const setter = append ? setLoadingMore : setLoading;
      setter(true);
      return api
        .get('/sites', { params: { page: pageNum, limit: PAGE_SIZE, search, ...filters } })
        .then((res) => {
          setTotal(res.data.total);
          nextPageRef.current = pageNum + 1;
          setItems((prev) => {
            if (!append) return res.data.items;
            const existingIds = new Set(prev.map((s) => s._id));
            return [...prev, ...res.data.items.filter((s: Site) => !existingIds.has(s._id))];
          });
        })
        .finally(() => {
          setter(false);
          fetchingRef.current = false;
        });
    },
    [search, filters]
  );

  useEffect(() => {
    nextPageRef.current = 1;
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => {
    if (params.get('action') === 'add') setFormOpen(true);
  }, [params]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current && items.length < total) {
          fetchPage(nextPageRef.current, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, total, fetchPage]);

  function refresh() {
    nextPageRef.current = 1;
    fetchPage(1, false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/sites/${deleteTarget._id}`);
      showToast('Site deleted successfully');
      refresh();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete site', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/sites/export', { params: { search, ...filters }, responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || 'sites_export.xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast('Failed to export sites', 'error');
    } finally {
      setExporting(false);
    }
  }

  const filtersActive = search || Object.values(filters).some(Boolean);

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
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export'}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by MediaCode, Type, City, State, Location..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={filters.mediaStatus}
            onChange={(e) => setFilters((f) => ({ ...f, mediaStatus: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Media Status</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Active / Inactive</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <StateSelect
            value={filters.state}
            onChange={(state) => setFilters((f) => ({ ...f, state, city: '' }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40"
          />
          <CitySelect
            state={filters.state}
            value={filters.city}
            onChange={(city) => setFilters((f) => ({ ...f, city }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40"
          />
          {filtersActive && (
            <button
              onClick={() => {
                setSearch('');
                setFilters(emptyFilters);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Site / Media List</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {total} {total === 1 ? 'Site' : 'Sites'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">MediaCode</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">City / State</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Total Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Inventory Updated</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                    Loading sites...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={12}>
                    <EmptyState title="No sites found" subtitle="Try adjusting your filters or add a new site." />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((site, index) => (
                  <tr key={site._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      {site.image ? (
                        <button type="button" onClick={() => setPreviewImage(resolveImageUrl(site.image))} className="block">
                          <img
                            src={resolveImageUrl(site.image)}
                            alt=""
                            className="h-10 w-14 rounded object-cover border border-slate-200 hover:opacity-80 cursor-zoom-in"
                          />
                        </button>
                      ) : (
                        <div className="h-10 w-14 rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{site.mediaCode || site.mediaId}</td>
                    <td className="px-4 py-3 text-slate-600">{site.mediaType}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {site.city}, {site.state}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {site.width && site.height ? `${site.width}x${site.height} ${site.sizeUnit}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {site.totalCost ? `₹${site.totalCost.toLocaleString()}` : '-'}
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
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatIST(site.inventoryUpdatedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatIST(site.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewSite(site)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Eye className="h-4 w-4" />
                        </button>
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
        <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
          {loadingMore && 'Loading more...'}
          {!loading && !loadingMore && `Showing ${items.length} of ${total} Sites`}
        </div>
      </div>

      <SiteFormModal open={formOpen} onClose={() => setFormOpen(false)} site={editingSite} onSaved={refresh} />
      <StatusChangeModal open={!!statusSite} onClose={() => setStatusSite(null)} site={statusSite} onSaved={refresh} />
      <SiteViewModal open={!!viewSite} onClose={() => setViewSite(null)} site={viewSite} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Site"
        message={`Are you sure you want to delete "${deleteTarget?.mediaCode || deleteTarget?.mediaId}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPreviewImage('')}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img src={previewImage} alt="Media preview" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            <button
              onClick={() => setPreviewImage('')}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 shadow text-slate-600 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
