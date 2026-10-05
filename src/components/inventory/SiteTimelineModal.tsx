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
  // A change to an existing booking's client/dates: bookingSnapshot is the booking after the
  // change, previousBooking is what it was before.
  eventType?: 'edited';
  previousBooking?: InventoryHistoryEntry['bookingSnapshot'];
  edits?: unknown[];
};

function periodLabel(start?: string | null, end?: string | null) {
  return `${formatISTDate(start || undefined)}${end ? ` → ${formatISTDate(end)}` : ''}`;
}

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
    <Modal open={open} onClose={onClose} title={`Site History — ${mediaCode || ''}`} size="md">
      {loading && <p className="text-sm text-slate-400 text-center py-8">Loading History...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No history yet.</p>}
      {!loading && items.length > 0 && (
        <div className="relative pl-5 space-y-5 max-h-[65vh] overflow-y-auto">
          <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
          {items.map((h, index) => {
            const changedByName = typeof h.changedBy === 'object' ? h.changedBy?.name : undefined;
            const isEdit = h.eventType === 'edited';
            const before = h.previousBooking;
            const after = h.bookingSnapshot;
            const customerLabel = after?.customerType === 'agency' ? 'Agency Name' : 'Client Name';
            return (
              <div key={h.eventKey} className="relative">
                <span
                  className={`absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ${
                    index === 0 ? 'bg-emerald-500 ring-emerald-100' : 'bg-red-500 ring-red-100'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <StatusBadge status={isEdit ? 'updated' : h.status} />
                  {index === 0 && <span className="text-[10px] font-semibold uppercase text-emerald-600">Latest</span>}
                </div>
                {isEdit ? (
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 text-xs">
                    <div className="grid grid-cols-[88px_1fr_1fr] bg-slate-50 font-semibold uppercase tracking-wide text-[10px]">
                      <span className="px-2.5 py-1.5 text-slate-400" />
                      <span className="px-2.5 py-1.5 text-slate-500">Old</span>
                      <span className="px-2.5 py-1.5 text-sky-700">New</span>
                    </div>
                    {(
                      [
                        ['Period', periodLabel(before?.startDate, before?.endDate), periodLabel(after?.startDate, after?.endDate)],
                        [customerLabel, before?.customerName || '-', after?.customerName || '-'],
                        ['Duration', `${before?.durationDays || 0} Days`, `${after?.durationDays || 0} Days`],
                        ['Amount', `₹${(before?.amount || 0).toLocaleString()}`, `₹${(after?.amount || 0).toLocaleString()}`],
                      ] as const
                    ).map(([label, oldVal, newVal]) => {
                      const changed = oldVal !== newVal;
                      return (
                        <div key={label} className="grid grid-cols-[88px_1fr_1fr] border-t border-slate-100">
                          <span className="px-2.5 py-1.5 text-slate-400">{label}</span>
                          <span className="px-2.5 py-1.5 text-slate-500">{oldVal}</span>
                          <span className={`px-2.5 py-1.5 ${changed ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-600'}`}>{newVal}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {h.status === 'cancelled' ? 'Was booked' : 'Period'}: {formatISTDate(h.effectiveFrom)}
                    {h.effectiveTo ? ` → ${formatISTDate(h.effectiveTo)}` : ''}
                    {!h.effectiveTo && <span className="text-emerald-600 font-medium"> · Ongoing</span>}
                  </p>
                )}
                {!isEdit && h.status === 'booked' && h.bookingSnapshot && (
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
                {!isEdit && h.status === 'booked' && !!h.edits?.length && (
                  <p className="text-xs text-sky-600 mt-0.5">Booking dates/details later updated (see above)</p>
                )}
                {!isEdit && h.status === 'booked' && h.endedEarlyAt && (
                  <p className="text-xs text-amber-600 mt-0.5">Ended early on {formatIST(h.endedEarlyAt)} — site was blocked</p>
                )}
                {!isEdit && h.status === 'booked' && h.cancelled && <p className="text-xs text-slate-500 mt-0.5">Later cancelled (see above)</p>}
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
                {(h.status === 'blocked' || h.status === 'confirmed') && h.blockSnapshot && (
                  <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    {h.blockSnapshot.customerName && (
                      <p>
                        {h.blockSnapshot.customerType === 'agency' ? 'Agency' : 'Client'}: {h.blockSnapshot.customerName}
                      </p>
                    )}
                    {h.blockSnapshot.startDate && h.blockSnapshot.endDate && (
                      <p>
                        {h.status === 'confirmed' ? 'Confirm' : 'Block'} Period: {formatISTDate(h.blockSnapshot.startDate)} → {formatISTDate(h.blockSnapshot.endDate)}
                      </p>
                    )}
                    <p>Reason: {h.blockSnapshot.reason || '-'}</p>
                    {h.blockSnapshot.notes && <p>Notes: {h.blockSnapshot.notes}</p>}
                  </div>
                )}
                {(h.status === 'hold' || h.status === 'issue' || (h.status === 'confirmed' && !h.blockSnapshot)) && h.statusSnapshot && (
                  <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    {h.status === 'confirmed' ? (
                      <p>
                        {h.statusSnapshot.customerType === 'agency' ? 'Agency' : 'Client'}: {h.statusSnapshot.customerName || '-'}
                      </p>
                    ) : (
                      <p>Reason: {h.statusSnapshot.reason || '-'}</p>
                    )}
                    {h.statusSnapshot.notes && <p>Notes: {h.statusSnapshot.notes}</p>}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {isEdit ? 'Updated' : h.status === 'booked' ? 'Booked' : 'Changed'}: {formatIST(h.eventAt || h.changedAt)} · by {changedByName || 'System'} · via {h.source === 'inventory' ? 'Inventory' : 'Sites'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
