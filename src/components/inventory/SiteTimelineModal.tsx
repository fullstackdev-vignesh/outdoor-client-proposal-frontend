'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatISTDate, formatIST } from '@/lib/date';
import type { InventoryHistoryEntry } from '@/lib/types';

// One step in a site's history, as returned by GET /sites/:id/timeline (newest first).
type TimelineEvent = InventoryHistoryEntry & {
  eventKey: string;
  eventAt: string;
  // Booked step of a booking that ended automatically because the site was blocked.
  endedEarlyAt?: string;
  // Booked step of a booking that was later cancelled manually (its own Cancelled step follows).
  cancelled?: boolean;
};

// What each history entry means, shown next to its status badge.
const CHANGE_LABEL: Record<string, string> = {
  available: 'Made Available',
  booked: 'Booked',
  blocked: 'Blocked',
  cancelled: 'Booking Cancelled',
};

export default function SiteTimelineModal({
  open,
  onClose,
  siteId,
  mediaCode,
}: {
  open: boolean;
  onClose: () => void;
  siteId: string | null;
  mediaCode?: string;
}) {
  const [items, setItems] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && siteId) {
      setLoading(true);
      api
        .get(`/sites/${siteId}/timeline`)
        .then((res) => setItems(res.data))
        .finally(() => setLoading(false));
    }
  }, [open, siteId]);

  return (
    <Modal open={open} onClose={onClose} title={`Site Timeline — ${mediaCode || ''}`} size="md">
      {loading && <p className="text-sm text-slate-400 text-center py-8">Loading timeline...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No history yet.</p>}
      {!loading && items.length > 0 && (
        <div className="relative pl-5 space-y-5 max-h-[65vh] overflow-y-auto">
          <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
          {items.map((h, index) => {
            const changedByName = typeof h.changedBy === 'object' ? h.changedBy?.name : undefined;
            return (
              <div key={h.eventKey} className="relative">
                <span
                  className={`absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ${
                    index === 0 ? 'bg-emerald-500 ring-emerald-100' : 'bg-blue-500 ring-blue-100'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <StatusBadge status={h.status} />
                  <span className="text-sm font-medium text-slate-700">{CHANGE_LABEL[h.status] || h.status}</span>
                  {index === 0 && <span className="text-[10px] font-semibold uppercase text-emerald-600">Latest</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {h.status === 'cancelled' ? 'Was booked' : 'Period'}: {formatISTDate(h.effectiveFrom)}
                  {h.effectiveTo ? ` → ${formatISTDate(h.effectiveTo)}` : ''}
                  {!h.effectiveTo && <span className="text-emerald-600 font-medium"> · Ongoing</span>}
                </p>
                {h.status === 'booked' && h.bookingSnapshot && (
                  <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    <p>
                      {h.bookingSnapshot.customerType === 'agency' ? 'Agency Name' : 'Client Name'}:{' '}
                      <span className="font-medium text-slate-800">{h.bookingSnapshot.customerName || '-'}</span>
                    </p>
                    <p>
                      Duration: {h.bookingSnapshot.durationDays || 0} Days · Amount: ₹{(h.bookingSnapshot.amount || 0).toLocaleString()}
                    </p>
                  </div>
                )}
                {h.status === 'booked' && h.endedEarlyAt && (
                  <p className="text-xs text-amber-600 mt-0.5">Ended early on {formatIST(h.endedEarlyAt)} — site was blocked</p>
                )}
                {h.status === 'booked' && h.cancelled && <p className="text-xs text-slate-500 mt-0.5">Later cancelled (see above)</p>}
                {h.status === 'cancelled' && (
                  <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    {h.bookingSnapshot?.customerName && (
                      <p>
                        {h.bookingSnapshot.customerType === 'agency' ? 'Agency Name' : 'Client Name'}: {h.bookingSnapshot.customerName}
                      </p>
                    )}
                    <p>Reason: {h.cancellationSnapshot?.reason || '-'}</p>
                    <p>
                      Cancelled By: {h.cancellationSnapshot?.cancelledByName || '-'}
                      {h.cancellationSnapshot?.cancelledByRole ? ` (${h.cancellationSnapshot.cancelledByRole.toUpperCase()})` : ''}
                      {h.cancellationSnapshot?.cancelledAt ? ` · ${formatIST(h.cancellationSnapshot.cancelledAt)}` : ''}
                    </p>
                  </div>
                )}
                {h.status === 'blocked' && h.blockSnapshot && (
                  <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    <p>Reason: {h.blockSnapshot.reason || '-'}</p>
                    {h.blockSnapshot.notes && <p>Notes: {h.blockSnapshot.notes}</p>}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {h.status === 'booked' ? 'Booked' : 'Changed'}: {formatIST(h.eventAt || h.changedAt)} {changedByName ? `· by ${changedByName}` : ''} · via {h.source === 'inventory' ? 'Inventory' : 'Sites'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
