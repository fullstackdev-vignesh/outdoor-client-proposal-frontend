'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { Panel } from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    api.get(`/bookings/${id}`).then((res) => setBooking(res.data));
  }, [id]);

  if (!booking) return <div className="text-sm text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900">{booking.bookingId}</h1>
        <p className="text-sm text-slate-500 capitalize">Status: {booking.status}</p>
      </div>

      <Panel title="Booking Information">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Client Name" value={booking.client?.name} />
          <Info label="Created By" value={booking.createdBy?.name || '-'} />
          <Info label="Start Date" value={new Date(booking.startDate).toLocaleDateString()} />
          <Info label="End Date" value={new Date(booking.endDate).toLocaleDateString()} />
          <Info label="Amount" value={booking.amount ? `₹${booking.amount.toLocaleString()}` : '-'} />
          <Info label="GST" value={booking.gstAmount ? `₹${booking.gstAmount.toLocaleString()}` : '-'} />
          <Info label="Total Amount" value={booking.totalAmount ? `₹${booking.totalAmount.toLocaleString()}` : '-'} />
          <Info label="Created Date" value={new Date(booking.createdAt).toLocaleDateString()} />
        </dl>
      </Panel>

      <Panel title="Media">
        <ul className="divide-y divide-slate-100">
          {booking.sites?.map((s: any) => (
            <li key={s._id} className="flex items-center justify-between py-2.5 text-sm">
              <Link href={`/sites/${s._id}`} className="font-medium text-blue-600 hover:underline">
                {s.mediaName}
              </Link>
              <StatusBadge status={s.mediaStatus} />
            </li>
          ))}
        </ul>
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
