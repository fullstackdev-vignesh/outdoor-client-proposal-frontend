'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Download, X, ImageOff, Building2, CheckCircle2, CalendarCheck, Ban, Save } from 'lucide-react';
import api, { fileBaseURL } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/Card';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import { SiteOwnerSelect } from '@/components/ui/SiteOwnerSelect';
import StatusChangeModal from '@/components/sites/StatusChangeModal';
import SiteViewModal from '@/components/sites/SiteViewModal';
import BulkStatusModal from '@/components/inventory/BulkStatusModal';
import MediaPreviewModal from '@/components/inventory/MediaPreviewModal';
import StatusDetailsPopover from '@/components/inventory/StatusDetailsPopover';
import { formatIST } from '@/lib/date';
import type { Site, MediaStatus } from '@/lib/types';

const PAGE_SIZE = 20;
const emptyFilters = { state: '', city: '', mediaStatus: '', isActive: '', siteOwner: '' };

function resolveImageUrl(image?: string) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
}

export default function InventoryLiveTab() {
  const { showToast } = useToast();

  const [summary, setSummary] = useState({ total: 0, available: 0, booked: 0, blocked: 0 });
  const [items, setItems] = useState<Site[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [exporting, setExporting] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<MediaStatus | ''>('');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [rowPending, setRowPending] = useState<Record<string, MediaStatus>>({});
  const [rowModal, setRowModal] = useState<{ site: Site; status: MediaStatus } | null>(null);
  const [previewSite, setPreviewSite] = useState<Site | null>(null);
  const [viewSite, setViewSite] = useState<Site | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const fetchingRef = useRef(false);
  const queryKey = JSON.stringify({ search, filters });

  const fetchSummary = useCallback(() => {
    api.get('/sites/summary', { params: { search, ...filters, mediaStatus: '' } }).then((res) => setSummary(res.data));
  }, [search, filters.state, filters.city, filters.isActive, filters.siteOwner]);

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
            const existingIds = new Set(prev.map((s: Site) => s._id));
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
    fetchSummary();
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

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
    fetchSummary();
    setSelected(new Set());
    setRowPending({});
    setBulkStatus('');
    setBulkModalOpen(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((s) => s._id))));
  }

  function selectStatusCard(status: '' | MediaStatus) {
    setFilters((f) => ({ ...f, mediaStatus: status }));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/sites/export', {
        params: { search, ...filters, filenamePrefix: 'inventory' },
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || 'inventory_export.xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to export inventory', 'error');
    } finally {
      setExporting(false);
    }
  }

  const selectedSites = items.filter((s) => selected.has(s._id));
  const filtersActive = search || Object.values(filters).some(Boolean);

  const cardBase = 'text-left rounded-xl border bg-white p-4 flex items-center justify-between shadow-sm transition ring-2 ring-transparent hover:shadow-md';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => selectStatusCard('')} className={`${cardBase} ${filters.mediaStatus === '' ? 'ring-blue-400 border-blue-300' : 'border-slate-200'}`}>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Sites</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600">
            <Building2 className="h-5 w-5" />
          </div>
        </button>
        <button
          onClick={() => selectStatusCard('available')}
          className={`${cardBase} ${filters.mediaStatus === 'available' ? 'ring-emerald-400 border-emerald-300' : 'border-slate-200'}`}
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Available Sites</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.available}</p>
          </div>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </button>
        <button
          onClick={() => selectStatusCard('booked')}
          className={`${cardBase} ${filters.mediaStatus === 'booked' ? 'ring-blue-400 border-blue-300' : 'border-slate-200'}`}
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Booked Sites</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.booked}</p>
          </div>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
            <CalendarCheck className="h-5 w-5" />
          </div>
        </button>
        <button
          onClick={() => selectStatusCard('blocked')}
          className={`${cardBase} ${filters.mediaStatus === 'blocked' ? 'ring-red-400 border-red-300' : 'border-slate-200'}`}
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Blocked Sites</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.blocked}</p>
          </div>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
            <Ban className="h-5 w-5" />
          </div>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search MediaCode, Type, City, State..."
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
          <SiteOwnerSelect
            value={filters.siteOwner}
            onChange={(siteOwner) => setFilters((f) => ({ ...f, siteOwner }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-44"
          />
          {filtersActive && (
            <button
              onClick={() => {
                setSearch('');
                setFilters(emptyFilters);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Reset Filters
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={items.length > 0 && selected.size === items.length}
              onChange={toggleSelectAll}
            />
            {selected.size > 0 ? (
              <span className="font-medium text-slate-800">{selected.size} selected</span>
            ) : (
              <span>Select all</span>
            )}
          </label>
          <select
            value={bulkStatus}
            disabled={selected.size === 0}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            onChange={(e) => setBulkStatus(e.target.value as MediaStatus | '')}
          >
            <option value="">Set Status</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="blocked">Blocked</option>
          </select>
          <button
            disabled={!bulkStatus || selected.size === 0}
            onClick={() => setBulkModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            Apply to Selected
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Inventory Sites</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {total} {total === 1 ? 'Site' : 'Sites'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">MediaCode</th>
                <th className="px-4 py-3">City / State</th>
                <th className="px-4 py-3">Site Owner</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Media Status</th>
                <th className="px-4 py-3">Inventory Updated</th>
                <th className="px-4 py-3">Site Last Updated</th>
                <th className="px-4 py-3 text-center">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                    Loading inventory...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={12}>
                    <EmptyState title="No sites found" subtitle="Try adjusting your filters." />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((site, index) => {
                  const pending = rowPending[site._id];
                  const hasChange = !!pending && pending !== site.mediaStatus;
                  return (
                    <tr key={site._id} className={`hover:bg-slate-50 ${selected.has(site._id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(site._id)} onChange={() => toggleSelect(site._id)} />
                      </td>
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        {site.mediaImage ? (
                          <button type="button" onClick={() => setPreviewSite(site)}>
                            <img
                              src={resolveImageUrl(site.mediaImage)}
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
                      <td className="px-4 py-3 text-slate-600">
                        {site.city}, {site.state}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{site.siteOwner || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${site.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {site.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={pending || site.mediaStatus}
                          onChange={(e) => setRowPending((prev) => ({ ...prev, [site._id]: e.target.value as MediaStatus }))}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs capitalize w-28"
                        >
                          {(['available', 'booked', 'blocked'] as MediaStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusDetailsPopover site={site} onViewFullDetails={() => setViewSite(site)} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatIST(site.inventoryUpdatedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatIST(site.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          disabled={!hasChange}
                          onClick={() => hasChange && setRowModal({ site, status: pending })}
                          title={hasChange ? 'Save status change' : 'Change status to enable'}
                          className={`inline-flex items-center justify-center rounded-lg p-2 ${
                            hasChange ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-50 text-slate-300'
                          }`}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
          {loadingMore && 'Loading more...'}
          {!loading && !loadingMore && `Showing ${items.length} of ${total} Sites`}
        </div>
      </div>

      <StatusChangeModal
        open={!!rowModal}
        onClose={() => setRowModal(null)}
        site={rowModal?.site || null}
        initialStatus={rowModal?.status}
        source="inventory"
        onSaved={refresh}
      />

      <BulkStatusModal
        open={bulkModalOpen && !!bulkStatus && selectedSites.length > 0}
        onClose={() => setBulkModalOpen(false)}
        sites={selectedSites}
        status={bulkStatus || 'available'}
        onSaved={refresh}
      />

      <MediaPreviewModal
        open={!!previewSite}
        onClose={() => setPreviewSite(null)}
        image={previewSite?.mediaImage}
        mediaCode={previewSite?.mediaCode || previewSite?.mediaId}
        mediaType={previewSite?.mediaType}
        location={previewSite ? [previewSite.location, previewSite.areaName, previewSite.city, previewSite.state].filter(Boolean).join(', ') : undefined}
      />

      <SiteViewModal open={!!viewSite} onClose={() => setViewSite(null)} site={viewSite} />
    </div>
  );
}
