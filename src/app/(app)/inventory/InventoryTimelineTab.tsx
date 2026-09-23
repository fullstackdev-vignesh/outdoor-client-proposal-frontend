'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Download, X, ImageOff, Building2, CheckCircle2, CalendarCheck, Ban, History } from 'lucide-react';
import api, { fileBaseURL } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import { SiteOwnerSelect } from '@/components/ui/SiteOwnerSelect';
import DatePicker from '@/components/ui/DatePicker';
import SiteTimelineModal from '@/components/inventory/SiteTimelineModal';
import MediaPreviewModal from '@/components/inventory/MediaPreviewModal';
import { formatIST, formatISTDate, todayISO } from '@/lib/date';
import type { InventoryHistoryEntry, MediaStatus } from '@/lib/types';

const PAGE_SIZE = 20;
const emptyFilters = { state: '', city: '', mediaStatus: '', isActive: '', from: '', to: '', siteOwner: '' };

function resolveImageUrl(image?: string) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
}

export default function InventoryTimelineTab() {
  const { showToast } = useToast();

  const [summary, setSummary] = useState({ total: 0, available: 0, booked: 0, blocked: 0 });
  const [items, setItems] = useState<InventoryHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [distinctSiteCount, setDistinctSiteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [exporting, setExporting] = useState(false);
  const [timelineSite, setTimelineSite] = useState<{ id: string; mediaCode: string } | null>(null);
  const [previewEntry, setPreviewEntry] = useState<InventoryHistoryEntry | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const fetchingRef = useRef(false);
  const queryKey = JSON.stringify({ search, filters });

  const fetchSummary = useCallback(() => {
    api.get('/sites/timeline/summary', { params: { search, ...filters, mediaStatus: '' } }).then((res) => setSummary(res.data));
  }, [search, filters.state, filters.city, filters.isActive, filters.from, filters.to, filters.siteOwner]);

  const fetchPage = useCallback(
    (pageNum: number, append: boolean) => {
      if (fetchingRef.current) return Promise.resolve();
      fetchingRef.current = true;
      const setter = append ? setLoadingMore : setLoading;
      setter(true);
      return api
        .get('/sites/timeline', { params: { page: pageNum, limit: PAGE_SIZE, search, ...filters } })
        .then((res) => {
          setTotal(res.data.total);
          setDistinctSiteCount(res.data.distinctSiteCount);
          nextPageRef.current = pageNum + 1;
          setItems((prev) => {
            if (!append) return res.data.items;
            const existingIds = new Set(prev.map((s: InventoryHistoryEntry) => s._id));
            return [...prev, ...res.data.items.filter((s: InventoryHistoryEntry) => !existingIds.has(s._id))];
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

  function selectStatusCard(status: '' | MediaStatus) {
    setFilters((f) => ({ ...f, mediaStatus: status }));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/sites/timeline/export', { params: { search, ...filters }, responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || 'inventory_timeline.xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to export timeline', 'error');
    } finally {
      setExporting(false);
    }
  }

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
        <button onClick={() => selectStatusCard('available')} className={`${cardBase} ${filters.mediaStatus === 'available' ? 'ring-emerald-400 border-emerald-300' : 'border-slate-200'}`}>
          <div>
            <p className="text-xs font-medium text-slate-500">Available Sites</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.available}</p>
          </div>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </button>
        <button onClick={() => selectStatusCard('booked')} className={`${cardBase} ${filters.mediaStatus === 'booked' ? 'ring-blue-400 border-blue-300' : 'border-slate-200'}`}>
          <div>
            <p className="text-xs font-medium text-slate-500">Booked Sites</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.booked}</p>
          </div>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
            <CalendarCheck className="h-5 w-5" />
          </div>
        </button>
        <button onClick={() => selectStatusCard('blocked')} className={`${cardBase} ${filters.mediaStatus === 'blocked' ? 'ring-red-400 border-red-300' : 'border-slate-200'}`}>
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
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search MediaCode, Type, City, State..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-slate-500 mb-1">From Date</label>
            <DatePicker value={filters.from} onChange={(v) => setFilters((f) => ({ ...f, from: v }))} max={filters.to || undefined} />
          </div>
          <div className="w-40">
            <label className="block text-xs text-slate-500 mb-1">To Date</label>
            <DatePicker value={filters.to} onChange={(v) => setFilters((f) => ({ ...f, to: v }))} min={filters.from || undefined} max={todayISO()} />
          </div>
          <select
            value={filters.mediaStatus}
            onChange={(e) => setFilters((f) => ({ ...f, mediaStatus: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
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
          <StateSelect value={filters.state} onChange={(state) => setFilters((f) => ({ ...f, state, city: '' }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-36" />
          <CitySelect state={filters.state} value={filters.city} onChange={(city) => setFilters((f) => ({ ...f, city }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-36" />
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Inventory Timeline</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {total} {total === 1 ? 'Record' : 'Records'} · {distinctSiteCount} {distinctSiteCount === 1 ? 'Site' : 'Sites'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">MediaCode</th>
                <th className="px-4 py-3">Media Type</th>
                <th className="px-4 py-3">City / State</th>
                <th className="px-4 py-3">Site Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">From Date</th>
                <th className="px-4 py-3">To Date</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Changed On</th>
                <th className="px-4 py-3">Changed By</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={15} className="px-4 py-10 text-center text-slate-400">
                    Loading timeline...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={15}>
                    <EmptyState title="No history found" subtitle="Try adjusting your filters or date range." />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((h, index) => {
                  const changedByName = typeof h.changedBy === 'object' ? h.changedBy?.name : undefined;
                  return (
                    <tr key={h._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        {h.mediaImage ? (
                          <button type="button" onClick={() => setPreviewEntry(h)}>
                            <img
                              src={resolveImageUrl(h.mediaImage)}
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
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{h.mediaId}</td>
                      <td className="px-4 py-3 text-slate-600">{h.mediaType}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {h.city}, {h.state}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{h.siteOwner || '-'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatISTDate(h.effectiveFrom)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{h.effectiveTo ? formatISTDate(h.effectiveTo) : 'Ongoing'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {(h.status === 'booked' || h.status === 'cancelled') && h.bookingSnapshot?.durationDays ? `${h.bookingSnapshot.durationDays} Days` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[240px] truncate" title={
                        h.status === 'booked'
                          ? `${h.bookingSnapshot?.customerName || '-'} • ${h.bookingSnapshot?.durationDays || 0} Days • ₹${(h.bookingSnapshot?.amount || 0).toLocaleString()}`
                          : h.status === 'cancelled'
                          ? `Booked Period: ${h.bookingSnapshot?.startDate ? formatISTDate(h.bookingSnapshot.startDate) : '-'} → ${h.bookingSnapshot?.endDate ? formatISTDate(h.bookingSnapshot.endDate) : '-'} • Cancelled: ${h.cancellationSnapshot?.cancelledAt ? formatIST(h.cancellationSnapshot.cancelledAt) : '-'} • Reason: ${h.cancellationSnapshot?.reason || '-'} • By: ${h.cancellationSnapshot?.cancelledByName || '-'}${h.cancellationSnapshot?.cancelledByRole ? ` (${h.cancellationSnapshot.cancelledByRole.toUpperCase()})` : ''}`
                          : h.status === 'blocked'
                          ? h.blockSnapshot?.reason || '-'
                          : ''
                      }>
                        {h.status === 'booked' && (
                          <span>
                            {h.bookingSnapshot?.customerName || '-'} • {h.bookingSnapshot?.durationDays || 0} Days • ₹{(h.bookingSnapshot?.amount || 0).toLocaleString()}
                          </span>
                        )}
                        {h.status === 'cancelled' && (
                          <span>
                            Reason: {h.cancellationSnapshot?.reason || '-'} • By: {h.cancellationSnapshot?.cancelledByName || '-'}
                            {h.cancellationSnapshot?.cancelledByRole ? ` (${h.cancellationSnapshot.cancelledByRole.toUpperCase()})` : ''}
                          </span>
                        )}
                        {h.status === 'blocked' && <span>{h.blockSnapshot?.reason || '-'}</span>}
                        {h.status === 'available' && <span>—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatIST(h.changedAt)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{changedByName || '-'}</td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-500">{h.source}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setTimelineSite({ id: h.site, mediaCode: h.mediaId })}
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
        </div>
        <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
          {loadingMore && 'Loading more...'}
          {!loading && !loadingMore && `Showing ${items.length} of ${total} History Records • ${distinctSiteCount} Sites`}
        </div>
      </div>

      <SiteTimelineModal
        open={!!timelineSite}
        onClose={() => setTimelineSite(null)}
        siteId={timelineSite?.id || null}
        mediaCode={timelineSite?.mediaCode}
      />

      <MediaPreviewModal
        open={!!previewEntry}
        onClose={() => setPreviewEntry(null)}
        image={previewEntry?.mediaImage}
        mediaCode={previewEntry?.mediaId}
        mediaType={previewEntry?.mediaType}
        location={previewEntry ? [previewEntry.city, previewEntry.state].filter(Boolean).join(', ') : undefined}
      />
    </div>
  );
}
