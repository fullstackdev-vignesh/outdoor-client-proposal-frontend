'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, CalendarCheck, FileText } from 'lucide-react';
import api, { fileBaseURL } from '@/lib/api';
import { StatCard, Panel } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';

const TABS = ['Overview', 'Media / Sites', 'Bookings', 'Proposals', 'Generated PPT', 'Generated Excel'] as const;

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  useEffect(() => {
    api.get(`/clients/${id}`).then((res) => setData(res.data));
  }, [id]);

  if (!data) return <div className="text-sm text-slate-400">Loading...</div>;
  const { client, bookings, proposals, siteCount } = data;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
        <p className="text-sm text-slate-500">
          {client.phone} {client.email && `· ${client.email}`} {client.location && `· ${client.location}`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Sites" value={siteCount} icon={Building2} accent="blue" />
        <StatCard label="Booked Sites" value={siteCount} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Total Proposals" value={proposals.length} icon={FileText} accent="amber" />
        <StatCard label="Total Bookings" value={bookings.length} icon={CalendarCheck} accent="blue" />
        <StatCard label="Active Bookings" value={bookings.filter((b: any) => b.status === 'active').length} icon={CalendarCheck} accent="emerald" />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <Panel title="Client Overview">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Name" value={client.name} />
            <Info label="Phone" value={client.phone || '-'} />
            <Info label="Email" value={client.email || '-'} />
            <Info label="Location" value={client.location || '-'} />
          </dl>
          {client.clientLocationPinImage && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-400 mb-2">Location Pin Image</p>
              <img
                src={client.clientLocationPinImage.startsWith('http') ? client.clientLocationPinImage : `${fileBaseURL}${client.clientLocationPinImage}`}
                alt="Location Pin"
                className="max-h-60 rounded-lg border border-slate-200 object-contain"
              />
            </div>
          )}
        </Panel>
      )}

      {tab === 'Bookings' && (
        <Panel title="Bookings">
          {bookings.length === 0 ? (
            <EmptyState title="No bookings yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {bookings.map((b: any) => (
                <li key={b._id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-800">{b.bookingId}</span>
                  <span className="text-xs text-slate-500 capitalize">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'Proposals' && (
        <Panel title="Proposals">
          {proposals.length === 0 ? (
            <EmptyState title="No proposals yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {proposals.map((p: any) => (
                <li key={p._id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-800">{p.proposalId}</span>
                  <span className="text-xs text-slate-500 capitalize">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'Media / Sites' && (
        <Panel title="Media / Sites">
          <p className="text-sm text-slate-500">{siteCount} media currently linked to this client.</p>
        </Panel>
      )}

      {tab === 'Generated PPT' && (
        <Panel title="Generated PPT">
          <EmptyState title="No PPT files generated for this client yet" />
        </Panel>
      )}

      {tab === 'Generated Excel' && (
        <Panel title="Generated Excel">
          <EmptyState title="No Excel files generated for this client yet" />
        </Panel>
      )}
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
