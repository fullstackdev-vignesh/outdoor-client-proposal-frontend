'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Upload, Download, Pencil, Trash2, RefreshCcw, X, ImageOff, Save, CalendarX, ToggleLeft, ToggleRight } from 'lucide-react';
import api, { resolveImageUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SiteFormModal from '@/components/sites/SiteFormModal';
import StatusChangeModal from '@/components/sites/StatusChangeModal';
import SiteViewModal from '@/components/sites/SiteViewModal';
import StatusDetailsPopover from '@/components/inventory/StatusDetailsPopover';
import CancelUpcomingBookingModal from '@/components/inventory/CancelUpcomingBookingModal';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import { SiteOwnerMultiSelect } from '@/components/ui/SiteOwnerSelect';
import { ILLUMINATION_OPTIONS } from '@/lib/mediaTypes';
import Loader from '@/components/ui/Loader';
import CustomSelect from '@/components/ui/CustomSelect';
import { formatIST } from '@/lib/date';
import type { Site, MediaStatus } from '@/lib/types';
import ScrollTable from '@/components/ui/ScrollTable';
import { MEDIA_STATUS_OPTIONS } from '@/lib/siteStatus';

const PAGE_SIZE = 20;
const rowActionCls =
  'inline-flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium transition-colors';

const emptyFilters = { mediaType: '', state: '', city: '', mediaStatus: '', isActive: '', siteOwner: [] as string[], illumination: '' };

export default function SitesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const params = useSearchParams();
  const canManage = user?.role === 'admin' || user?.role === 'tl' || user?.role === 'user';
  // Deleting a site is admin-only (the API enforces the same rule).
  const canDelete = user?.role === 'admin';

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
  const [statusInitial, setStatusInitial] = useState<MediaStatus | undefined>(undefined);
  const [rowPending, setRowPending] = useState<Record<string, MediaStatus>>({});
  const [viewSite, setViewSite] = useState<Site | null>(null);
  const [activeTarget, setActiveTarget] = useState<Site | null>(null);
  const [cancelUpcomingSite, setCancelUpcomingSite] = useState<Site | null>(null);
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

  function openStatusChange(site: Site, status: MediaStatus) {
    setStatusInitial(status);
    setStatusSite(site);
  }

  function refresh() {
    setRowPending({});
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

  // Flips Active/Inactive only, then re-orders the loaded rows by the list's own rule (Active first,
  // Inactive last, newest update first within each) — the site moves straight away, no reload, and
  // the list keeps its scroll position.
  async function handleToggleActive() {
    if (!activeTarget) return;
    const isActive = !activeTarget.isActive;
    try {
      const res = await api.patch(`/sites/${activeTarget._id}/active`, { isActive });
      const byListOrder = (a: Site, b: Site) =>
        Number(b.isActive !== false) - Number(a.isActive !== false) ||
        (b.updatedAt || '').localeCompare(a.updatedAt || '') ||
        b._id.localeCompare(a._id);
      // With the Active / Inactive filter on, a site that no longer matches it leaves the list right away.
      const stillMatches = filters.isActive === '' || String(isActive) === filters.isActive;
      if (stillMatches) {
        setItems((prev) => prev.map((s) => (s._id === activeTarget._id ? { ...s, ...res.data } : s)).sort(byListOrder));
      } else {
        setItems((prev) => prev.filter((s) => s._id !== activeTarget._id));
        setTotal((t) => Math.max(t - 1, 0));
      }
      showToast(`Site marked ${isActive ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update site', 'error');
    } finally {
      setActiveTarget(null);
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

  const filtersActive = search || Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Media Management</h1>
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
              className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
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
          <div className="w-40">
            <CustomSelect
              value={filters.illumination}
              onChange={(val) => setFilters((f) => ({ ...f, illumination: val }))}
              placeholder="All Illumination"
              options={ILLUMINATION_OPTIONS}
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-clip">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Site / Media List</h2>
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
            {total} {total === 1 ? 'Site' : 'Sites'}
          </span>
        </div>
        <ScrollTable>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">MediaCode</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">City / State</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Site Owner</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Total Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Media Status</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Inventory Updated</th>
                <th className="px-4 py-3">Site Updated</th>
                <th className="px-4 py-3">Updated By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={16} className="px-4 py-10 text-center">
                    <Loader overlay text="Loading sites..." />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={16}>
                    <EmptyState title="No sites found" subtitle="Try adjusting your filters or add a new site." />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((site, index) => (
                  <tr key={site._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      {site.mediaImage ? (
                        <button type="button" onClick={() => setPreviewImage(resolveImageUrl(site.mediaImage))} className="block">
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
                    <td className="px-4 py-3 text-slate-600">{site.mediaType}</td>
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
                    {/* Status + Media Status columns work the same as Inventory's. */}
                    <td className="px-4 py-3">
                      {canManage ? (
                        (() => {
                          const pending = rowPending[site._id];
                          const hasChange = !!pending && pending !== site.mediaStatus;
                          // Inactive sites stay Immediate — their status can't be changed until made Active.
                          const inactive = site.isActive === false;
                          const canAddBooking = !inactive && site.mediaStatus === 'booked';
                          const canCancelUpcoming =
                            !inactive &&
                            (site.mediaStatus === 'immediate' || site.mediaStatus === 'booked') &&
                            !!site.bookings?.some((b) => b.status === 'upcoming');
                          return (
                            <>
                              <div className="flex items-center gap-1.5" title={inactive ? 'Inactive site — make it Active to change its status' : undefined}>
                                <CustomSelect
                                  value={pending || site.mediaStatus}
                                  onChange={(val) => setRowPending((prev) => ({ ...prev, [site._id]: val as MediaStatus }))}
                                  options={MEDIA_STATUS_OPTIONS}
                                  placeholder=""
                                  disabled={inactive}
                                  className="w-28 text-xs"
                                />
                                <button
                                  disabled={!hasChange}
                                  onClick={() => hasChange && openStatusChange(site, pending)}
                                  title={hasChange ? 'Save status change' : 'Change status to enable'}
                                  className={`inline-flex items-center justify-center rounded-lg p-2 ${
                                    hasChange ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-50 text-slate-300'
                                  }`}
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                              </div>
                              {!hasChange && (canAddBooking || canCancelUpcoming) && (
                                <div className="mt-1.5 inline-flex min-w-28 flex-col gap-1">
                                  {canAddBooking && (
                                    <button
                                      type="button"
                                      onClick={() => openStatusChange(site, 'booked')}
                                      className={`${rowActionCls} border-red-100 bg-red-50 text-red-600 hover:bg-red-100`}
                                    >
                                      <Plus className="h-3 w-3 shrink-0" /> Add Booking
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
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <span className="text-xs capitalize text-slate-600">{site.mediaStatus}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDetailsPopover site={site} onViewFullDetails={() => setViewSite(site)} />
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
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {site.updatedBy || 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <button
                              onClick={() => setActiveTarget(site)}
                              title={site.isActive ? 'Active — click to make Inactive' : 'Inactive — click to make Active'}
                              aria-label={site.isActive ? 'Make site inactive' : 'Make site active'}
                              className={`rounded p-1.5 hover:bg-slate-100 ${site.isActive ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              {site.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingSite(site);
                                setFormOpen(true);
                              }}
                              title="Edit site"
                              aria-label="Edit site"
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(site)}
                                title="Delete site"
                                aria-label="Delete site"
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ScrollTable>
        <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
          {loadingMore && <Loader size="sm" text="Loading more sites..." />}
          {!loading && !loadingMore && `Showing ${items.length} of ${total} Sites`}
        </div>
      </div>

      <SiteFormModal open={formOpen} onClose={() => setFormOpen(false)} site={editingSite} onSaved={refresh} />
      <StatusChangeModal open={!!statusSite} onClose={() => setStatusSite(null)} site={statusSite} initialStatus={statusInitial} onSaved={refresh} />
      <SiteViewModal open={!!viewSite} onClose={() => setViewSite(null)} site={viewSite} />
      <CancelUpcomingBookingModal open={!!cancelUpcomingSite} onClose={() => setCancelUpcomingSite(null)} site={cancelUpcomingSite} onSaved={refresh} source="sites" />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Site"
        message={`Are you sure you want to delete "${deleteTarget?.mediaCode || deleteTarget?.mediaId}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!activeTarget}
        title={activeTarget?.isActive ? 'Make Site Inactive' : 'Make Site Active'}
        message={
          activeTarget?.isActive
            ? `Make "${activeTarget?.mediaCode || activeTarget?.mediaId}" Inactive? Its status changes to Immediate (any block, confirmation, hold or issue is removed; bookings are kept) and it is hidden from client proposals (not deleted).`
            : `Make "${activeTarget?.mediaCode || activeTarget?.mediaId}" Active? It can appear in client proposals again.`
        }
        confirmLabel={activeTarget?.isActive ? 'Make Inactive' : 'Make Active'}
        danger={!!activeTarget?.isActive}
        onConfirm={handleToggleActive}
        onCancel={() => setActiveTarget(null)}
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
