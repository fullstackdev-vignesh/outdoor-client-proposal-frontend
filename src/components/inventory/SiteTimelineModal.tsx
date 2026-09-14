'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatISTDate, formatIST } from '@/lib/date';
import type { InventoryHistoryEntry } from '@/lib/types';

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
  const [items, setItems] = useState<InventoryHistoryEntry[]>([]);
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
          {items.map((h) => {
            const changedByName = typeof h.changedBy === 'object' ? h.changedBy?.name : undefined;
            return (
              <div key={h._id} className="relative">
                <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-2 ring-blue-100" />
                <p className="text-xs text-slate-400">{formatISTDate(h.effectiveFrom)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={h.status} />
                  {h.effectiveTo && <span className="text-xs text-slate-400">→ {formatISTDate(h.effectiveTo)}</span>}
                  {!h.effectiveTo && <span className="text-xs text-emerald-600 font-medium">Ongoing</span>}
                </div>
                {h.status === 'booked' && h.bookingSnapshot && (
                  <p className="text-sm text-slate-600 mt-1">
                    {h.bookingSnapshot.customerName || '-'} · {h.bookingSnapshot.durationDays || 0} Days · ₹
                    {(h.bookingSnapshot.amount || 0).toLocaleString()}
                  </p>
                )}
                {h.status === 'blocked' && h.blockSnapshot && <p className="text-sm text-slate-600 mt-1">{h.blockSnapshot.reason || '-'}</p>}
                <p className="text-xs text-slate-400 mt-1">
                  Changed: {formatIST(h.changedAt)} {changedByName ? `· by ${changedByName}` : ''} · via {h.source === 'inventory' ? 'Inventory' : 'Sites'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
