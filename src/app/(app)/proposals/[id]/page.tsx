'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Presentation, FileSpreadsheet, Download } from 'lucide-react';
import api, { fileBaseURL } from '@/lib/api';
import { Panel } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';

function getFileUrl(url?: string) {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `${fileBaseURL}${url}`;
}

export default function ProposalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [proposal, setProposal] = useState<any>(null);
  const [generating, setGenerating] = useState<'ppt' | 'excel' | null>(null);

  function refresh() {
    api.get(`/proposals/${id}`).then((res) => setProposal(res.data));
  }

  useEffect(refresh, [id]);

  async function generate(type: 'ppt' | 'excel') {
    setGenerating(type);
    try {
      await api.post(`/proposals/${id}/generate-${type}`);
      showToast(`${type === 'ppt' ? 'PPT' : 'Excel'} generated successfully`);
      refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || `Failed to generate ${type === 'ppt' ? 'PPT' : 'Excel'}`;
      showToast(msg, 'error');
    } finally {
      setGenerating(null);
    }
  }

  // The stored URL's own filename is a randomized storage key (collision-safe for concurrent
  // generations) — `?download=` tells the SERVER (see backend app.js) to set a Content-
  // Disposition header with the real human-readable name, so a plain navigation downloads it
  // under the right name without depending on fetch/blob/CORS working in the browser.
  function download(type: 'ppt' | 'excel') {
    const url = type === 'ppt' ? proposal.generatedPptUrl : proposal.generatedExcelUrl;
    if (!url) return;
    const downloadName =
      (type === 'ppt' ? proposal.generatedPptFileName : proposal.generatedExcelFileName) ||
      `proposal.${type === 'ppt' ? 'pptx' : 'xlsx'}`;
    const separator = url.includes('?') ? '&' : '?';
    window.location.href = `${getFileUrl(url)}${separator}download=${encodeURIComponent(downloadName)}`;
  }

  if (!proposal) return <div className="text-sm text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{proposal.proposalId}</h1>
          <p className="text-sm text-slate-500">{proposal.client?.name}</p>
        </div>
        <span className="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
          {proposal.status}
        </span>
      </div>

      <Panel title="Proposal Summary">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Client" value={proposal.client?.name} />
          <Info label="Media Count" value={proposal.sites?.length?.toString()} />
          <Info label="PPT Template" value={proposal.pptTemplate?.name || '-'} />
          <Info label="Excel Template" value={proposal.excelTemplate?.name || '-'} />
          <Info label="Variant" value={proposal.variant} />
          <Info label="Total Amount" value={proposal.totalAmount ? `₹${proposal.totalAmount.toLocaleString()}` : '-'} />
          <Info label="GST Amount" value={proposal.gstAmount ? `₹${proposal.gstAmount.toLocaleString()}` : '-'} />
          <Info label="Monthly Amount" value={proposal.monthlyAmount ? `₹${proposal.monthlyAmount.toLocaleString()}` : '-'} />
        </dl>
      </Panel>

      <Panel title="Selected Media">
        <ul className="divide-y divide-slate-100">
          {proposal.sites?.map((s: any) => (
            <li key={s._id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium text-slate-800">{s.mediaName}</span>
              <StatusBadge status={s.mediaStatus} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Generate & Download">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generate('ppt')}
            disabled={generating === 'ppt'}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Presentation className="h-4 w-4 text-blue-600" />
            {generating === 'ppt' ? 'Generating...' : 'Generate PPT / Refresh'}
          </button>
          <button
            onClick={() => generate('excel')}
            disabled={generating === 'excel'}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            {generating === 'excel' ? 'Generating...' : 'Generate Excel / Refresh'}
          </button>
          {proposal.generatedPptUrl && (
            <button
              type="button"
              onClick={() => download('ppt')}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Download PPT
            </button>
          )}
          {proposal.generatedExcelUrl && (
            <button
              type="button"
              onClick={() => download('excel')}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Download Excel
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800">{value || '-'}</dd>
    </div>
  );
}
