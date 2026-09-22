'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Presentation, FileSpreadsheet, Download, CheckCircle2, type LucideIcon } from 'lucide-react';
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

// Generation is a single request/response with no real progress events from the server, so this
// simulates a believable climb in steady steps (10% -> 20% -> ... -> 90%, then a slow crawl up
// to 99%) while waiting — it deliberately NEVER reaches 100% on its own; the caller only shows
// 100%/done once the real API response comes back successfully (see `done` in GenerateTile).
// Used for Excel only (PPT uses the slower, elapsed-time-based curve below).
function useSimulatedProgress(active: boolean) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) {
      setProgress(0);
      return undefined;
    }
    setProgress(10);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p < 90) return Math.min(90, p + 10);
        if (p < 99) return Math.min(99, p + 3);
        return 99;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [active]);
  return progress;
}

// PPT generation can genuinely take up to ~a minute, so — unlike Excel's quick fixed-step climb
// — this maps ELAPSED TIME since the request started onto a slow, realistic curve: ~5% at start,
// ~40% by 20s, ~65% by 40s, ~80-85% by 60s, then a slowing crawl that asymptotically approaches
// (but never reaches) 95% for however much longer the request actually takes. It deliberately
// never shows 100% on its own; the caller ramps 96 -> 98 -> 100 only once the real API response
// comes back successfully (see finishPptProgress below).
function pptProgressForElapsed(elapsedSec: number) {
  if (elapsedSec <= 0) return 5;
  if (elapsedSec <= 20) return 5 + (elapsedSec / 20) * 35; // 5% -> 40%
  if (elapsedSec <= 40) return 40 + ((elapsedSec - 20) / 20) * 25; // 40% -> 65%
  if (elapsedSec <= 60) return 65 + ((elapsedSec - 40) / 20) * 17; // 65% -> 82%
  const t = elapsedSec - 60;
  return Math.min(95, 82 + (95 - 82) * (1 - Math.exp(-t / 40))); // 82% -> asymptotic 95%
}

function usePptGenerationProgress(active: boolean): [number, (value: number) => void] {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) {
      setProgress(0);
      startRef.current = null;
      return undefined;
    }
    startRef.current = Date.now();
    setProgress(5);
    const interval = setInterval(() => {
      const elapsed = (Date.now() - (startRef.current ?? Date.now())) / 1000;
      setProgress(Math.round(pptProgressForElapsed(elapsed)));
    }, 2000);
    return () => clearInterval(interval);
  }, [active]);
  return [progress, setProgress];
}

// Called right after a successful PPT generation response, while `active` is still true (so the
// auto-climb interval is still running underneath) — briefly overrides the displayed number to
// visibly step 96 -> 98 -> 100 instead of jumping straight from ~90s-elapsed-value to done.
async function finishPptProgress(setProgress: (value: number) => void) {
  for (const step of [96, 98, 100]) {
    setProgress(step);
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
}

export default function ProposalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [proposal, setProposal] = useState<any>(null);
  const [generating, setGenerating] = useState<'ppt-with' | 'ppt-without' | 'excel' | null>(null);
  const [justFinished, setJustFinished] = useState<'ppt-with' | 'ppt-without' | 'excel' | null>(null);

  const [pptWithoutProgress, setPptWithoutProgress] = usePptGenerationProgress(generating === 'ppt-without');
  const [pptWithProgress, setPptWithProgress] = usePptGenerationProgress(generating === 'ppt-with');
  const excelProgress = useSimulatedProgress(generating === 'excel');

  function refresh() {
    return api.get(`/proposals/${id}`).then((res) => setProposal(res.data));
  }

  useEffect(() => {
    refresh();
  }, [id]);

  function openFile(url?: string) {
    if (url) window.open(getFileUrl(url), '_blank', 'noopener,noreferrer');
  }

  // Briefly shows a "100% — Done" state before reverting the tile to its idle look, so the jump
  // from ~90% (simulated) to actually-complete doesn't feel abrupt.
  function flashDone(key: 'ppt-with' | 'ppt-without' | 'excel') {
    setJustFinished(key);
    setTimeout(() => setJustFinished(null), 1500);
  }

  async function generateExcel() {
    setGenerating('excel');
    try {
      const { data } = await api.post(`/proposals/${id}/generate-excel`);
      // The generate-excel response only populates `excelTemplate`, not `pptTemplate` (see
      // proposalController.js) — using it directly would blank out the PPT Template name on
      // screen until a manual page refresh. Refetching via GET (which populates both) keeps the
      // summary panel fully accurate right away.
      await refresh();
      flashDone('excel');
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
    const key = locationMode === 'with' ? 'ppt-with' : 'ppt-without';
    const setProgress = locationMode === 'with' ? setPptWithProgress : setPptWithoutProgress;
    setGenerating(key);
    try {
      const { data } = await api.post(`/proposals/${id}/generate-ppt`, { locationMode });
      // Same reasoning as generateExcel: generate-ppt only populates `pptTemplate`, not
      // `excelTemplate` — refetch instead of using the response directly so both template names
      // stay correct without needing a manual page refresh.
      await refresh();
      await finishPptProgress(setProgress);
      flashDone(key);
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
        <div className="grid gap-3 sm:grid-cols-3">
          <GenerateTile
            icon={Presentation}
            color="blue"
            title="PPT — Without Location"
            active={generating === 'ppt-without'}
            done={justFinished === 'ppt-without'}
            progress={pptWithoutProgress}
            disabled={!!generating}
            onClick={() => generatePpt('without')}
            downloadUrl={proposal.generatedPptWithoutLocationUrl ? getFileUrl(proposal.generatedPptWithoutLocationUrl) : undefined}
          />
          <GenerateTile
            icon={Presentation}
            color="blue"
            title="PPT — With Location"
            active={generating === 'ppt-with'}
            done={justFinished === 'ppt-with'}
            progress={pptWithProgress}
            disabled={!!generating}
            onClick={() => generatePpt('with')}
            downloadUrl={proposal.generatedPptWithLocationUrl ? getFileUrl(proposal.generatedPptWithLocationUrl) : undefined}
          />
          <GenerateTile
            icon={FileSpreadsheet}
            color="emerald"
            title="Excel"
            active={generating === 'excel'}
            done={justFinished === 'excel'}
            progress={excelProgress}
            disabled={!!generating}
            onClick={generateExcel}
            downloadUrl={proposal.generatedExcelUrl ? getFileUrl(proposal.generatedExcelUrl) : undefined}
          />
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

const TILE_COLORS = {
  blue: { icon: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-600', ring: 'ring-blue-100' },
  emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-600', ring: 'ring-emerald-100' },
} as const;

function GenerateTile({
  icon: Icon,
  color,
  title,
  active,
  done,
  progress,
  disabled,
  onClick,
  downloadUrl,
}: {
  icon: LucideIcon;
  color: keyof typeof TILE_COLORS;
  title: string;
  active: boolean;
  done: boolean;
  progress: number;
  disabled?: boolean;
  onClick: () => void;
  downloadUrl?: string;
}) {
  const c = TILE_COLORS[color];
  return (
    <div className={`rounded-xl border p-4 transition-colors ${active ? `border-transparent ring-2 ${c.ring} ${c.bg}` : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.bg}`}>
          {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Icon className={`h-5 w-5 ${c.icon}`} />}
        </span>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>

      {active || done ? (
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-emerald-600' : c.bar}`}
              style={{ width: `${done ? 100 : progress}%` }}
            />
          </div>
          <p className="text-xs font-medium text-slate-500">
            {done ? 'Done — download started' : `Generating... ${progress}%`}
          </p>
        </div>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Generate
        </button>
      )}

      {downloadUrl && !active && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> Download again
        </a>
      )}
    </div>
  );
}
