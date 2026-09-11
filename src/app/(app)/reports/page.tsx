'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api from '@/lib/api';
import { Panel } from '@/components/ui/Card';

export default function ReportsPage() {
  const [reports, setReports] = useState<any>(null);

  useEffect(() => {
    api.get('/dashboard/reports').then((res) => setReports(res.data));
  }, []);

  if (!reports) return <div className="text-sm text-slate-400">Loading reports...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Site, booking, client and proposal analytics</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" /> Export Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Site Report">
          <ReportGrid
            rows={[
              ['Total Sites', reports.siteReport.total],
              ['Active Sites', reports.siteReport.active],
              ['Inactive Sites', reports.siteReport.inactive],
              ['Available Media', reports.siteReport.available],
              ['Booked Media', reports.siteReport.booked],
              ['Blocked Media', reports.siteReport.blocked],
            ]}
          />
        </Panel>

        <Panel title="Booking Report">
          <ReportGrid
            rows={[
              ['Total Bookings', reports.bookingReport.total],
              ['Active Bookings', reports.bookingReport.active],
              ['Completed Bookings', reports.bookingReport.completed],
              ['Cancelled Bookings', reports.bookingReport.cancelled],
            ]}
          />
        </Panel>

        <Panel title="Client Report">
          <ReportGrid
            rows={[
              ['Total Clients', reports.clientReport.total],
              ['Clients with Bookings', reports.clientReport.withBookings],
              ['Clients with Proposals', reports.clientReport.withProposals],
            ]}
          />
        </Panel>

        <Panel title="Proposal Report">
          <ReportGrid
            rows={[
              ['Total Proposals', reports.proposalReport.total],
              ['Draft', reports.proposalReport.draft],
              ['Generated', reports.proposalReport.generated],
              ['Completed', reports.proposalReport.completed],
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

function ReportGrid({ rows }: { rows: [string, number][] }) {
  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-slate-400">{label}</dt>
          <dd className="text-lg font-bold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
