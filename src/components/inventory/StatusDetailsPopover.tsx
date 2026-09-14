'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatISTDate, formatIST } from '@/lib/date';
import type { Site } from '@/lib/types';

export default function StatusDetailsPopover({ site, onViewFullDetails }: { site: Site; onViewFullDetails: () => void }) {
  const [open, setOpen] = useState(false);

  if (site.mediaStatus !== 'booked' && site.mediaStatus !== 'blocked') {
    return <StatusBadge status={site.mediaStatus} />;
  }

  const b = site.bookingInfo;
  const bl = site.blockInfo;
  const customerName = b && typeof b.client === 'object' ? b.client?.name : undefined;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex">
        <StatusBadge status={site.mediaStatus} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={site.mediaStatus === 'booked' ? 'Booking Details' : 'Block Details'} size="sm">
        <div className="space-y-3 text-sm">
          {site.mediaStatus === 'booked' && (
            <dl className="space-y-2">
              <Row label="Customer" value={customerName || '-'} />
              <Row label="Type" value={b?.customerType ? b.customerType.charAt(0).toUpperCase() + b.customerType.slice(1) : '-'} />
              <Row label="Period" value={b?.startDate && b?.endDate ? `${formatISTDate(b.startDate)} → ${formatISTDate(b.endDate)}` : '-'} />
              <Row label="Duration" value={b?.durationDays ? `${b.durationDays} Days` : '-'} />
              <Row label="Monthly Cost" value={b?.monthlyTotalCost ? `₹${b.monthlyTotalCost.toLocaleString()}` : '-'} />
              <Row label="Booking Amount" value={b?.amount ? `₹${b.amount.toLocaleString()}` : '-'} />
              <Row label="Updated" value={formatIST(site.inventoryUpdatedAt)} />
            </dl>
          )}
          {site.mediaStatus === 'blocked' && (
            <dl className="space-y-2">
              <Row label="Reason" value={bl?.reason || '-'} />
              <Row label="Blocked Date" value={bl?.blockedDate ? formatISTDate(bl.blockedDate) : '-'} />
              <Row label="Notes" value={bl?.notes || '-'} />
              <Row label="Updated" value={formatIST(site.inventoryUpdatedAt)} />
            </dl>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onViewFullDetails();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Full Details
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
