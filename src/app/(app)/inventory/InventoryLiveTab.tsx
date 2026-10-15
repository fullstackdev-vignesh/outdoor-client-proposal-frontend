'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, Download, X, ImageOff, Building2, CheckCircle2, CalendarCheck, Ban, Save, History, Plus, CalendarX,
  BadgeCheck, PauseCircle, AlertTriangle,
} from 'lucide-react';
import api, { resolveImageUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/Card';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import { SiteOwnerMultiSelect } from '@/components/ui/SiteOwnerSelect';
import StatusChangeModal from '@/components/sites/StatusChangeModal';
import SiteViewModal from '@/components/sites/SiteViewModal';
import BulkStatusModal from '@/components/inventory/BulkStatusModal';
import MediaPreviewModal from '@/components/inventory/MediaPreviewModal';
import StatusDetailsPopover from '@/components/inventory/StatusDetailsPopover';
import SiteTimelineModal from '@/components/inventory/SiteTimelineModal';
import CancelUpcomingBookingModal from '@/components/inventory/CancelUpcomingBookingModal';
import AddUpcomingBlockModal from '@/components/inventory/AddUpcomingBlockModal';
import CustomSelect from '@/components/ui/CustomSelect';
import Loader from '@/components/ui/Loader';
import { formatIST } from '@/lib/date';
import type { Site, MediaStatus } from '@/lib/types';
import ScrollTable from '@/components/ui/ScrollTable';
import { MEDIA_STATUS_OPTIONS } from '@/lib/siteStatus';
import { MEDIA_TYPES } from '@/lib/mediaTypes';

// Summary cards — clicking one filters the list by that status ('' = all).
const STATUS_CARDS: { status: '' | MediaStatus; label: string; icon: typeof Building2; ring: string; iconCls: string }[] = [
  { status: '', label: 'Total Sites', icon: Building2, ring: 'ring-red-400 border-red-300', iconCls: 'bg-slate-100 text-slate-600' },
  { status: 'immediate', label: 'Immediate', icon: CheckCircle2, ring: 'ring-emerald-400 border-emerald-300', iconCls: 'bg-emerald-50 text-emerald-600' },
  { status: 'blocked', label: 'Blocked', icon: Ban, ring: 'ring-red-400 border-red-300', iconCls: 'bg-red-50 text-red-600' },
  { status: 'confirmed', label: 'Confirmed', icon: BadgeCheck, ring: 'ring-blue-400 border-blue-300', iconCls: 'bg-blue-50 text-blue-600' },
  { status: 'booked', label: 'Booked', icon: CalendarCheck, ring: 'ring-yellow-400 border-yellow-300', iconCls: 'bg-yellow-50 text-yellow-600' },
  { status: 'hold', label: 'Hold', icon: PauseCircle, ring: 'ring-orange-400 border-orange-300', iconCls: 'bg-orange-50 text-orange-600' },
  { status: 'issue', label: 'Issue', icon: AlertTriangle, ring: 'ring-purple-400 border-purple-300', iconCls: 'bg-purple-50 text-purple-600' },
];

const PAGE_SIZE = 20;
const rowActionCls =
  'inline-flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium transition-colors';
const emptyFilters = { mediaType: '', state: '', city: '', mediaStatus: '', isActive: '', siteOwner: [] as string[] };

export default function InventoryLiveTab() {
  const { showToast } = useToast();

  const [summary, setSummary] = useState<Record<'total' | MediaStatus, number>>({
    total: 0, immediate: 0, booked: 0, blocked: 0, confirmed: 0, hold: 0, issue: 0,
  });
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
  const [timelineSite, setTimelineSite] = useState<Site | null>(null);
  const [cancelUpcomingSite, setCancelUpcomingSite] = useState<Site | null>(null);
  const [addBlockTarget, setAddBlockTarget] = useState<{ site: Site; kind: 'blocked' | 'confirmed' } | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const fetchingRef = useRef(false);
  const queryKey = JSON.stringify({ search, filters });

  const fetchSummary = useCallback(() => {
    api.get('/sites/summary', { params: { search, ...filters, mediaStatus: '' } }).then((res) => setSummary(res.data));
  }, [search, filters.mediaType, filters.state, filters.city, filters.isActive, filters.siteOwner]);

  const fetchPage = useCallback(
    (pageNum: number, append: boolean) => {
      if (fetchingRef.current) return Promise.resolve();
      fetchingRef.current = true;
      const setter = append ? setLoadingMore : setLoading;
      setter(true);
      return api
        // Inventory lists by the latest status/booking/block change, not by Site master edits.
        .get('/sites', { params: { page: pageNum, limit: PAGE_SIZE, search, ...filters, sortBy: 'inventory' } })
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
        params: { search, ...filters, filenamePrefix: 'inventory', sortBy: 'inventory' },
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
  const filtersActive = search || Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));

  const cardBase = 'text-left rounded-xl border bg-white p-4 flex items-center justify-between shadow-sm transition ring-2 ring-transparent hover:shadow-md';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUS_CARDS.map(({ status, label, icon: Icon, ring, iconCls }) => (
          <button
            key={status || 'total'}
            onClick={() => selectStatusCard(status)}
            className={`${cardBase} ${filters.mediaStatus === status ? ring : 'border-slate-200'}`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{status ? summary[status] : summary.total}</p>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconCls}`}>
              <Icon className="h-5 w-5" />
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search MediaCode, Type, City, State..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="w-40">
            <CustomSelect
              value={filters.mediaStatus}
              onChange={(val) => setFilters((f) => ({ ...f, mediaStatus: val }))}
              placeholder="All Media Status"
              options={MEDIA_STATUS_OPTIONS}
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={filters.mediaType}
              onChange={(val) => setFilters((f) => ({ ...f, mediaType: val }))}
              placeholder="All Media Types"
              options={MEDIA_TYPES}
            />
          </div>
          <div className="w-36">
            <CustomSelect
              value={filters.isActive}
              onChange={(val) => setFilters((f) => ({ ...f, isActive: val }))}
              placeholder="Active / Inactive"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          </div>
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
          {/* Several owners can be picked — list, counts and Export all show sites of any of them. */}
          <SiteOwnerMultiSelect
            value={filters.siteOwner}
            onChange={(siteOwner) => setFilters((f) => ({ ...f, siteOwner }))}
            className="w-56"
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
          <div className="w-36">
            <CustomSelect
              value={bulkStatus}
              disabled={selected.size === 0}
              onChange={(val) => setBulkStatus(val as MediaStatus | '')}
              placeholder="Set Status"
              options={MEDIA_STATUS_OPTIONS}
            />
          </div>
          <button
            disabled={!bulkStatus || selected.size === 0}
            onClick={() => setBulkModalOpen(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            Apply to Selected
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-clip">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Inventory Sites</h2>
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
            {total} {total === 1 ? 'Site' : 'Sites'}
          </span>
        </div>
        <ScrollTable>
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
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Site Owner</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Total Cost</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Media Status</th>
                <th className="px-4 py-3">Inventory Updated</th>
                <th className="px-4 py-3">Site Last Updated</th>
                <th className="px-4 py-3">Updated By</th>
                <th className="px-4 py-3 text-center">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={16} className="px-4 py-10 text-center">
                    <Loader overlay text="Loading inventory..." />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={16}>
                    <EmptyState title="No sites found" subtitle="Try adjusting your filters." />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((site, index) => {
                  const pending = rowPending[site._id];
                  const hasChange = !!pending && pending !== site.mediaStatus;
                  return (
                    <tr key={site._id} className={`hover:bg-slate-50 ${selected.has(site._id) ? 'bg-red-50/50' : ''}`}>
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
                      <td className="px-4 py-3 text-slate-600">{site.areaName || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{site.siteOwner || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {site.width && site.height ? `${site.width}x${site.height} ${site.sizeUnit}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {site.totalCost ? `₹${site.totalCost.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${site.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {site.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {!site.isActive && site.inactiveReason && (
                          <p className="mt-0.5 max-w-[11rem] truncate text-[10px] font-medium text-slate-500" title={site.inactiveReason}>
                            {site.inactiveReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {/* Inactive sites stay Immediate — status can't change until the site is Active. */}
                        <div
                          className="flex items-center gap-1.5"
                          title={site.isActive === false ? 'Inactive site — make it Active (Media Master) to change its status' : undefined}
                        >
                          <CustomSelect
                            value={pending || site.mediaStatus}
                            onChange={(val) => setRowPending((prev) => ({ ...prev, [site._id]: val as MediaStatus }))}
                            options={MEDIA_STATUS_OPTIONS}
                            placeholder=""
                            disabled={site.isActive === false}
                            className="w-28 text-xs"
                          />
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
                        </div>
                        {site.isActive !== false && (() => {
                          // Booked → Booked isn't a status "change", so the Save button stays off —
                          // this lets a Booked site take another booking (another client/dates).
                          const canAddBooking = !hasChange && site.mediaStatus === 'booked';
                          // Cancelling an Upcoming booking doesn't change the site's status (whatever it is),
                          // so it's done from its own popup instead of Save — available for every status.
                          const canCancelUpcoming = !!site.bookings?.some((b) => b.status === 'upcoming');
                          // Same idea for Blocked / Confirmed: add another period without touching the current one.
                          const addBlockKind = !hasChange && (site.mediaStatus === 'blocked' || site.mediaStatus === 'confirmed') ? site.mediaStatus : null;
                          if (!canAddBooking && !canCancelUpcoming && !addBlockKind) return null;
                          return (
                            <div className="mt-1.5 flex flex-col gap-1">
                              {canAddBooking && (
                                <button
                                  type="button"
                                  onClick={() => setRowModal({ site, status: 'booked' })}
                                  className={`${rowActionCls} border-red-100 bg-red-50 text-red-600 hover:bg-red-100`}
                                >
                                  <Plus className="h-3 w-3 shrink-0" /> Add Booking
                                </button>
                              )}
                              {addBlockKind && (
                                <button
                                  type="button"
                                  onClick={() => setAddBlockTarget({ site, kind: addBlockKind })}
                                  className={`${rowActionCls} ${
                                    addBlockKind === 'confirmed'
                                      ? 'border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100'
                                      : 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100'
                                  }`}
                                >
                                  <Plus className="h-3 w-3 shrink-0" /> {addBlockKind === 'confirmed' ? 'Add Confirmed' : 'Add Blocked'}
                                </button>
                              )}
                              {canCancelUpcoming && (
                                <button
                                  type="button"
                                  onClick={() => setCancelUpcomingSite(site)}
                                  title="Cancel an upcoming booking"
                                  className={`${rowActionCls} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
                                >
                                  <CalendarX className="h-3 w-3 shrink-0" /> Cancel Upcoming
                                </button>
                              )}
                            </div>
                          );
                        })()}
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
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {site.inventoryUpdatedBy || site.updatedBy || 'System'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setTimelineSite(site)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          <History className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </ScrollTable>
        <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
          {loadingMore && <Loader size="sm" text="Loading more..." />}
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
        status={bulkStatus || 'immediate'}
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

      <SiteTimelineModal
        open={!!timelineSite}
        onClose={() => setTimelineSite(null)}
        siteId={timelineSite?._id || null}
        mediaCode={timelineSite?.mediaCode || timelineSite?.mediaId}
      />

      <CancelUpcomingBookingModal
        open={!!cancelUpcomingSite}
        onClose={() => setCancelUpcomingSite(null)}
        site={cancelUpcomingSite}
        onSaved={refresh}
      />
      <AddUpcomingBlockModal
        open={!!addBlockTarget}
        onClose={() => setAddBlockTarget(null)}
        site={addBlockTarget?.site || null}
        kind={addBlockTarget?.kind || 'blocked'}
        onSaved={refresh}
      />

      <SiteViewModal open={!!viewSite} onClose={() => setViewSite(null)} site={viewSite} />
    </div>
  );
}
