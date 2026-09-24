'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, MapPin } from 'lucide-react';
import api from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import { useToast } from '@/components/ui/Toast';
import type { Site, PaginatedResponse } from '@/lib/types';

export default function AvailableMediaPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResponse<Site> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ state: '', city: '', mediaType: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchSites = useCallback(() => {
    setLoading(true);
    api
      .get('/sites/available', { params: { page, limit: 12, search, ...filters } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Available Media</h1>
          <p className="text-sm text-slate-500">Search and select media currently available for booking</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => showToast(`${selected.size} media selected for proposal`)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {selected.size} Media Selected — Continue
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Media Name, ID, Location..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <StateSelect
          value={filters.state}
          onChange={(state) => {
            setFilters((f) => ({ ...f, state, city: '' }));
            setPage(1);
          }}
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="w-40">
          <CitySelect
            state={filters.state}
            value={filters.city}
            onChange={(city) => {
              setFilters((f) => ({ ...f, city }));
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <input
          placeholder="Media Type"
          value={filters.mediaType}
          onChange={(e) => {
            setFilters((f) => ({ ...f, mediaType: e.target.value }));
            setPage(1);
          }}
          className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Loading available media...</p>}
      {!loading && data?.items.length === 0 && <EmptyState title="No available media found" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items.map((site) => (
          <div
            key={site._id}
            className={`rounded-xl border bg-white overflow-hidden shadow-sm transition ${
              selected.has(site._id) ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
            }`}
          >
            <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
              {site.mediaImage ? (
                <img src={site.mediaImage} alt={site.mediaName || site.mediaId} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">No image</span>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{site.mediaCode || site.mediaId}</p>
                  <p className="text-xs text-slate-400">{site.mediaType}</p>
                </div>
                <StatusBadge status={site.mediaStatus} />
              </div>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" /> {site.city}, {site.state}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {site.width}x{site.height} {site.sizeUnit}
                </span>
                <span className="font-semibold text-slate-800">₹{site.monthlyAmount?.toLocaleString() || '-'}/mo</span>
              </div>
              <button
                onClick={() => toggleSelect(site._id)}
                className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${
                  selected.has(site._id)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {selected.has(site._id) ? 'Selected' : 'Select Media'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
