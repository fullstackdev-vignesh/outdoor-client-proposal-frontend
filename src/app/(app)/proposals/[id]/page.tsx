'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Presentation, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import api, { fileBaseURL } from '@/lib/api';
import { Panel } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';

function getFileUrl(url?: string) {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `${fileBaseURL}${url}`;
}

// Indian comma grouping (lakhs/crores), rounded to a whole number — matches how the generated
// Excel itself displays amounts.
function formatINR(value: number) {
  return Math.round(value).toLocaleString('en-IN');
}

export default function ProposalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [proposal, setProposal] = useState<any>(null);
  const [generating, setGenerating] = useState<'ppt-with' | 'ppt-without' | 'excel' | null>(null);

  function refresh() {
    api.get(`/proposals/${id}`).then((res) => setProposal(res.data));
  }

  useEffect(refresh, [id]);

  function openFile(url?: string) {
    if (url) window.open(getFileUrl(url), '_blank', 'noopener,noreferrer');
  }

  async function generateExcel() {
    setGenerating('excel');
    try {
      const { data } = await api.post(`/proposals/${id}/generate-excel`);
      setProposal(data);
      showToast('Excel generated — download starting');
      openFile(data.generatedExcelUrl);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to generate Excel', 'error');
    } finally {
      setGenerating(null);
    }
  }

  // locationMode: 'with' keeps location text/title/map exactly as before; 'without' hides all
  // of that and lets the site photo use the freed space, per template.
  async function generatePpt(locationMode: 'with' | 'without') {
    setGenerating(locationMode === 'with' ? 'ppt-with' : 'ppt-without');
    try {
      const { data } = await api.post(`/proposals/${id}/generate-ppt`, { locationMode });
      setProposal(data);
      showToast('PPT generated — download starting');
      openFile(data.generatedPptUrl);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to generate PPT', 'error');
    } finally {
      setGenerating(null);
    }
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
          <Info label="Total Amount" value={proposal.totalAmount ? `₹${formatINR(proposal.totalAmount)}` : '-'} />
          {/* <Info label="Monthly Amount" value={proposal.monthlyAmount ? `₹${formatINR(proposal.monthlyAmount)}` : '-'} /> */}
        </dl>
      </Panel>

      <Panel title="Selected Media">
        <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
          {proposal.sites?.map((s: any) => {
            const sizeLabel = s.width && s.height ? `${s.width}x${s.height}` : '';
            return (
              <li key={s._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{s.mediaId}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {s.mediaType} · {s.location || s.areaName || '-'} · {s.city}, {s.state}
                    {sizeLabel ? ` · ${sizeLabel}` : ''}
                    {s.siteOwner ? ` · Owner: ${s.siteOwner}` : ''}
                  </p>
                </div>
                <StatusBadge status={s.mediaStatus} />
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Generate & Download">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Generate PPT</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => generatePpt('without')}
                disabled={!!generating}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {generating === 'ppt-without' ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : (
                  <Presentation className="h-4 w-4 text-blue-600" />
                )}
                {generating === 'ppt-without' ? 'Generating & downloading...' : 'Without Location'}
              </button>
              <button
                onClick={() => generatePpt('with')}
                disabled={!!generating}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {generating === 'ppt-with' ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : (
                  <Presentation className="h-4 w-4 text-blue-600" />
                )}
                {generating === 'ppt-with' ? 'Generating & downloading...' : 'With Location'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
          <button
            onClick={generateExcel}
            disabled={!!generating}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {generating === 'excel' ? (
              <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            )}
            {generating === 'excel' ? 'Generating & downloading...' : 'Generate Excel / Refresh'}
          </button>
          {proposal.generatedPptWithoutLocationUrl && (
            <a
              href={getFileUrl(proposal.generatedPptWithoutLocationUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Download PPT (Without Location)
            </a>
          )}
          {proposal.generatedPptWithLocationUrl && (
            <a
              href={getFileUrl(proposal.generatedPptWithLocationUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Download PPT (With Location)
            </a>
          )}
          {proposal.generatedExcelUrl && (
            <a
              href={getFileUrl(proposal.generatedExcelUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Download Excel
            </a>
          )}
          </div>
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
