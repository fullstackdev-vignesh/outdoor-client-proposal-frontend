'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import BookingStatusSummary from '@/components/ui/BookingStatusSummary';
import { formatISTDate, formatIST } from '@/lib/date';
import type { Site } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/siteStatus';

export default function StatusDetailsPopover({ site, onViewFullDetails }: { site: Site; onViewFullDetails: () => void }) {
  const [open, setOpen] = useState(false);

  if (site.mediaStatus === 'immediate') {
    return <BookingStatusSummary site={site} />;
  }

  const b = site.bookingInfo;
  const bl = site.blockInfo;
  const st = site.statusInfo;
  const title = site.mediaStatus === 'booked' ? 'Booking Details' : `${STATUS_LABELS[site.mediaStatus]} Details`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex">
        <BookingStatusSummary site={site} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="sm">
        <div className="space-y-3 text-sm">
          {site.mediaStatus === 'booked' && (
            <dl className="space-y-2">
              <Row label="Type" value={b?.customerType ? b.customerType.charAt(0).toUpperCase() + b.customerType.slice(1) : '-'} />
              <Row label="Period" value={b?.startDate && b?.endDate ? `${formatISTDate(b.startDate)} → ${formatISTDate(b.endDate)}` : '-'} />
              <Row label="Duration" value={b?.durationDays ? `${b.durationDays} Days` : '-'} />
              <Row label="Monthly Cost" value={b?.monthlyTotalCost ? `₹${b.monthlyTotalCost.toLocaleString()}` : '-'} />
              <Row label="Booking Amount" value={b?.amount ? `₹${b.amount.toLocaleString()}` : '-'} />
              <Row label="Updated" value={formatIST(site.inventoryUpdatedAt)} />
            </dl>
          )}
          {(site.mediaStatus === 'blocked' || site.mediaStatus === 'confirmed') && (
            <dl className="space-y-2">
              {bl?.customerName && <Row label={bl.customerType === 'agency' ? 'Agency' : 'Client'} value={bl.customerName} />}
              {bl?.startDate && bl?.endDate && (
                <Row label={`${site.mediaStatus === 'confirmed' ? 'Confirm' : 'Block'} Period`} value={`${formatISTDate(bl.startDate)} → ${formatISTDate(bl.endDate)}`} />
              )}
              <Row label="Reason" value={bl?.reason || '-'} />
              {bl?.notes && <Row label="Notes" value={bl.notes} />}
              <Row label={site.mediaStatus === 'confirmed' ? 'Confirmed On' : 'Blocked On'} value={bl?.blockedDate ? formatISTDate(bl.blockedDate) : '-'} />
              <Row label="Updated" value={formatIST(site.inventoryUpdatedAt)} />
            </dl>
          )}
          {(site.mediaStatus === 'hold' || site.mediaStatus === 'issue') && (
            <dl className="space-y-2">
              <Row label="Reason" value={st?.reason || '-'} />
              {st?.notes && <Row label="Notes" value={st.notes} />}
              <Row label={`${STATUS_LABELS[site.mediaStatus]} Date`} value={st?.date ? formatIST(st.date) : '-'} />
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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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
