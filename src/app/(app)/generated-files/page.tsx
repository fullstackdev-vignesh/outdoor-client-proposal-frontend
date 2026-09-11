'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Presentation, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';

export default function GeneratedFilesPage() {
  const [proposals, setProposals] = useState<any[]>([]);

  useEffect(() => {
    api.get('/proposals', { params: { limit: 100 } }).then((res) =>
      setProposals(res.data.items.filter((p: any) => p.generatedPptUrl || p.generatedExcelUrl))
    );
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Generated Files</h1>
        <p className="text-sm text-slate-500">PPT and Excel files generated from your proposals</p>
      </div>

      {proposals.length === 0 ? (
        <EmptyState title="No generated files yet" subtitle="Generate a PPT or Excel from a proposal to see it here." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {proposals.map((p) => (
            <Link key={p._id} href={`/proposals/${p._id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-800">{p.proposalId}</p>
                <p className="text-xs text-slate-400">{typeof p.client === 'object' ? p.client?.name : ''}</p>
              </div>
              <div className="flex gap-2">
                {p.generatedPptUrl && <Presentation className="h-4 w-4 text-blue-600" />}
                {p.generatedExcelUrl && <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
