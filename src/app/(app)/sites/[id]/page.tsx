'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { Panel } from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatISTDate, formatIST } from '@/lib/date';
import type { Site } from '@/lib/types';

export default function SiteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);

  useEffect(() => {
    api.get(`/sites/${id}`).then((res) => setSite(res.data));
  }, [id]);

  if (!site) return <div className="text-sm text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{site.mediaName}</h1>
          <p className="text-sm text-slate-500">
            {site.mediaId} &middot; {site.mediaType}
          </p>
        </div>
        <StatusBadge status={site.mediaStatus} />
      </div>

      {site.mediaImage && <img src={site.mediaImage} alt={site.mediaName} className="w-full max-w-lg rounded-xl border border-slate-200" />}

      <Panel title="Basic Information">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Media Type" value={site.mediaType} />
          <Info label="State" value={site.state} />
          <Info label="City" value={site.city} />
          <Info label="Location" value={site.location || '-'} />
        </dl>
      </Panel>

      <Panel title="Location">
        <dl className="grid grid-cols-2 gap-4 text-sm mb-3">
          <Info label="Latitude" value={site.latitude?.toString() || '-'} />
          <Info label="Longitude" value={site.longitude?.toString() || '-'} />
        </dl>
        {site.latitude && site.longitude && (
          <iframe
            className="w-full h-52 rounded-lg border border-slate-200"
            src={`https://maps.google.com/maps?q=${site.latitude},${site.longitude}&z=14&output=embed`}
          />
        )}
      </Panel>

      <Panel title="Media Size">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Width" value={site.width?.toString() || '-'} />
          <Info label="Height" value={site.height?.toString() || '-'} />
        </dl>
      </Panel>

      <Panel title="Pricing">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <Info label="Amount" value={site.amount ? `₹${site.amount.toLocaleString()}` : '-'} />
          <Info label="GST Amount" value={site.gstAmount ? `₹${site.gstAmount.toLocaleString()}` : '-'} />
          <Info label="Monthly Amount" value={site.monthlyAmount ? `₹${site.monthlyAmount.toLocaleString()}` : '-'} />
        </dl>
      </Panel>

      <Panel title="Booking Information">
        {site.mediaStatus === 'available' && <p className="text-sm text-emerald-600 font-medium">Currently Available</p>}
        {site.mediaStatus === 'booked' && site.bookingInfo && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Info
              label="Client"
              value={typeof site.bookingInfo.client === 'object' ? site.bookingInfo.client?.name || '-' : '-'}
            />
            <Info label="Booking Ref" value={site.bookingInfo.bookingRef || '-'} />
            <Info label="Start Date" value={formatISTDate(site.bookingInfo.startDate)} />
            <Info label="End Date" value={formatISTDate(site.bookingInfo.endDate)} />
            <Info label="Amount" value={site.bookingInfo.amount ? `₹${site.bookingInfo.amount.toLocaleString()}` : '-'} />
          </dl>
        )}
        {site.mediaStatus === 'blocked' && site.blockInfo && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Block Reason" value={site.blockInfo.reason || '-'} />
            <Info label="Blocked Date" value={formatIST(site.blockInfo.blockedDate)} />
            <Info
              label="Blocked By"
              value={typeof site.blockInfo.blockedBy === 'object' ? site.blockInfo.blockedBy?.name || '-' : '-'}
            />
            <Info label="Notes" value={site.blockInfo.notes || '-'} />
          </dl>
        )}
      </Panel>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
