'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import api, { fileBaseURL } from '@/lib/api';
import { formatIST, formatISTDate } from '@/lib/date';
import type { Site, SiteHistoryEntry } from '@/lib/types';

function resolveImageUrl(image?: string) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
}

function label(field: string) {
  const map: Record<string, string> = {
    mediaId: 'MediaCode',
    mediaType: 'Media Type',
    quantity: 'Quantity',
    state: 'State',
    city: 'City',
    location: 'Location',
    areaName: 'Area Name',
    locationDetails: 'Location Details',
    latitude: 'Latitude',
    longitude: 'Longitude',
    illumination: 'Illumination',
    width: 'Width',
    height: 'Height',
    sizeUnit: 'Unit',
    amount: 'Amount',
    gstAmount: 'GST Amount',
    monthlyAmount: 'Display Cost Per Month',
    printingCost: 'Printing Cost',
    mountingCost: 'Mounting Cost',
    totalCost: 'Total Cost',
    image: 'Media Image',
    isActive: 'Active Status',
    mediaStatus: 'Media Status',
  };
  return map[field] || field;
}

export default function SiteViewModal({ open, onClose, site: siteProp }: { open: boolean; onClose: () => void; site: Site | null }) {
  const [tab, setTab] = useState<'view' | 'history'>('view');
  const [history, setHistory] = useState<SiteHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fullSite, setFullSite] = useState<Site | null>(null);

  useEffect(() => {
    if (open) setTab('view');
    setFullSite(null);
    if (open && siteProp) {
      api.get(`/sites/${siteProp._id}`).then((res) => setFullSite(res.data));
    }
  }, [open, siteProp]);

  useEffect(() => {
    if (open && tab === 'history' && siteProp) {
      setLoadingHistory(true);
      api
        .get(`/sites/${siteProp._id}/history`)
        .then((res) => setHistory(res.data))
        .finally(() => setLoadingHistory(false));
    }
  }, [open, tab, siteProp]);

  const site = fullSite || siteProp;
  if (!site) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Site Details — ${site.mediaCode || site.mediaId}`} size="xl">
      <div className="flex gap-2 border-b border-slate-200 mb-4">
        {(['view', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'view' ? 'View' : 'Edit History'}
          </button>
        ))}
      </div>

      {tab === 'view' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {site.image ? (
              <img
                src={resolveImageUrl(site.image)}
                alt={site.mediaId}
                className="w-full sm:w-48 h-36 object-cover rounded-lg border border-slate-200 bg-white flex-shrink-0"
              />
            ) : (
              <div className="w-full sm:w-48 h-36 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                No Image
              </div>
            )}
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-base font-bold text-slate-900">{site.mediaCode || site.mediaId}</span>
                <StatusBadge status={site.mediaStatus} />
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${site.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {site.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700">{site.mediaType}</p>
              <p className="text-sm text-slate-600">
                {[site.location, site.areaName, site.city, site.state].filter(Boolean).join(', ') || '-'}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                <span>Inventory Updated: {formatIST(site.inventoryUpdatedAt)}</span>
                <span>Last Updated: {formatIST(site.updatedAt)}</span>
              </div>
            </div>
          </div>

          <ViewSection title="Basic Details">
            <Row label="MediaCode" value={site.mediaCode || site.mediaId} />
            <Row label="Media Type" value={site.mediaType} />
            <Row label="Quantity" value={site.quantity} />
            <Row label="State" value={site.state} />
            <Row label="City" value={site.city} />
            <Row label="Location" value={site.location} />
            <Row label="Area Name" value={site.areaName} />
          </ViewSection>

          <ViewSection title="Location Details">
            <Row label="Latitude" value={site.latitude} />
            <Row label="Longitude" value={site.longitude} />
            {site.latitude && site.longitude && (
              <div className="col-span-2 sm:col-span-3 rounded-lg overflow-hidden border border-slate-200 h-48">
                <iframe
                  className="w-full h-full"
                  src={`https://maps.google.com/maps?q=${site.latitude},${site.longitude}&z=14&output=embed`}
                />
              </div>
            )}
          </ViewSection>

          <ViewSection title="Media Size">
            <Row label="Illumination" value={site.illumination} />
            <Row label="Size" value={site.width && site.height ? `${site.width} x ${site.height} = ${site.autoSize}` : '-'} />
          </ViewSection>

          <ViewSection title="Pricing">
            <Row label="Display Cost Per Month" value={site.monthlyAmount ? `₹${site.monthlyAmount.toLocaleString()}` : '-'} />
            <Row label="Printing Cost" value={site.printingCost ? `₹${site.printingCost.toLocaleString()}` : '-'} />
            <Row label="Mounting Cost" value={site.mountingCost ? `₹${site.mountingCost.toLocaleString()}` : '-'} />
            <Row label="Total Cost" value={<span className="text-emerald-600 font-bold text-base">{site.totalCost ? `₹${site.totalCost.toLocaleString()}` : '-'}</span>} />
          </ViewSection>

          {site.mediaStatus === 'booked' && site.bookingInfo && (
            <ViewSection title="Booking Details">
              <Row
                label="Customer Type"
                value={site.bookingInfo.customerType ? site.bookingInfo.customerType.charAt(0).toUpperCase() + site.bookingInfo.customerType.slice(1) : 'Client'}
              />
              <Row label="Customer" value={typeof site.bookingInfo.client === 'object' ? site.bookingInfo.client?.name : undefined} />
              <Row label="Start Date" value={formatISTDate(site.bookingInfo.startDate)} />
              <Row label="End Date" value={formatISTDate(site.bookingInfo.endDate)} />
              <Row label="Duration" value={site.bookingInfo.durationDays ? `${site.bookingInfo.durationDays} Days` : undefined} />
              <Row label="Monthly Cost" value={site.bookingInfo.monthlyTotalCost ? `₹${site.bookingInfo.monthlyTotalCost.toLocaleString()}` : undefined} />
              <Row
                label="Booking Amount"
                value={
                  site.bookingInfo.amount !== undefined ? (
                    <span className="text-emerald-600 font-bold text-base">₹{site.bookingInfo.amount.toLocaleString()}</span>
                  ) : undefined
                }
              />
            </ViewSection>
          )}

          {site.mediaStatus === 'blocked' && site.blockInfo && (
            <ViewSection title="Block Details">
              <Row label="Block Reason" value={site.blockInfo.reason} />
              <Row label="Additional Notes" value={site.blockInfo.notes} />
              <Row label="Blocked Date" value={formatIST(site.blockInfo.blockedDate)} />
              <Row label="Blocked By" value={typeof site.blockInfo.blockedBy === 'object' ? site.blockInfo.blockedBy?.name : undefined} />
            </ViewSection>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {loadingHistory && <p className="text-sm text-slate-400 text-center py-6">Loading history...</p>}
          {!loadingHistory && history.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No edit history yet.</p>}
          {!loadingHistory &&
            history.map((h) => {
              const changedByName = typeof h.changedBy === 'object' ? h.changedBy?.name : undefined;
              return (
                <div key={h._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-800 mb-1">{label(h.field)}</p>
                  <div className="flex flex-wrap gap-4">
                    <p>
                      <span className="text-xs text-slate-400">OLD: </span>
                      <span className="text-red-600 font-medium">{String(h.oldValue ?? '-')}</span>
                    </p>
                    <p>
                      <span className="text-xs text-slate-400">NEW: </span>
                      <span className="text-emerald-600 font-medium">{String(h.newValue ?? '-')}</span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatIST(h.changedAt)}
                    {changedByName ? ` · by ${changedByName}` : ''}
                  </p>
                </div>
              );
            })}
        </div>
      )}
    </Modal>
  );
}

function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3 pb-2 border-b border-slate-100">{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
