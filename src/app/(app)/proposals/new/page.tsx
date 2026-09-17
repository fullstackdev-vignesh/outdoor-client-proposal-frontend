'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Search, ImageOff, Download, Presentation, FileSpreadsheet } from 'lucide-react';
import api, { fileBaseURL } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Panel } from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { StateSelect, CitySelect } from '@/components/ui/StateCitySelect';
import { SiteOwnerSelect } from '@/components/ui/SiteOwnerSelect';
import MediaPreviewModal from '@/components/inventory/MediaPreviewModal';
import type { Client, MediaStatus, Site, Template } from '@/lib/types';

const STEPS = ['Customer Details', 'Site Details', 'PPT Template', 'Excel Template', 'Preview'] as const;
const PAGE_SIZE = 20;

function resolveImageUrl(image?: string) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
}

export default function NewProposalPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<'ppt' | 'excel' | null>(null);
  const [createdProposal, setCreatedProposal] = useState<any>(null);
  const [previewTab, setPreviewTab] = useState<'ppt' | 'excel'>('ppt');

  // Step 1: Customer
  const [customerType, setCustomerType] = useState<'client' | 'agency'>('client');
  const [customers, setCustomers] = useState<Client[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    api.get('/clients', { params: { limit: 100, customerType, search: customerSearch || undefined } }).then((res) => setCustomers(res.data.items));
  }, [customerType, customerSearch]);

  const selectedCustomer = customers.find((c) => c._id === customerId);

  // Step 2: Sites
  const [siteSearch, setSiteSearch] = useState('');
  const [siteState, setSiteState] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [siteStatus, setSiteStatus] = useState<'' | MediaStatus>('');
  const [siteOwner, setSiteOwner] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [siteTotal, setSiteTotal] = useState(0);
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteLoadingMore, setSiteLoadingMore] = useState(false);
  const [selectedSites, setSelectedSites] = useState<Map<string, Site>>(new Map());
  const [previewSite, setPreviewSite] = useState<Site | null>(null);

  const nextPageRef = useRef(1);
  const fetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const siteQueryKey = JSON.stringify({ siteSearch, siteState, siteCity, siteStatus, siteOwner });

  const fetchSitePage = useCallback(
    (pageNum: number, append: boolean) => {
      if (fetchingRef.current) return Promise.resolve();
      fetchingRef.current = true;
      (append ? setSiteLoadingMore : setSiteLoading)(true);
      return api
        .get('/sites', {
          params: {
            page: pageNum,
            limit: PAGE_SIZE,
            search: siteSearch || undefined,
            state: siteState || undefined,
            city: siteCity || undefined,
            mediaStatus: siteStatus || undefined,
            siteOwner: siteOwner || undefined,
          },
        })
        .then((res) => {
          setSiteTotal(res.data.total);
          nextPageRef.current = pageNum + 1;
          setSites((prev) => {
            if (!append) return res.data.items;
            const existingIds = new Set(prev.map((s: Site) => s._id));
            return [...prev, ...res.data.items.filter((s: Site) => !existingIds.has(s._id))];
          });
        })
        .finally(() => {
          (append ? setSiteLoadingMore : setSiteLoading)(false);
          fetchingRef.current = false;
        });
    },
    [siteSearch, siteState, siteCity, siteStatus, siteOwner]
  );

  useEffect(() => {
    nextPageRef.current = 1;
    setSites([]);
    fetchSitePage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteQueryKey]);

  useEffect(() => {
    if (step !== 1) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current && sites.length < siteTotal) {
          fetchSitePage(nextPageRef.current, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [step, sites.length, siteTotal, fetchSitePage]);

  function toggleSite(site: Site) {
    setSelectedSites((prev) => {
      const next = new Map(prev);
      if (next.has(site._id)) next.delete(site._id);
      else next.set(site._id, site);
      return next;
    });
  }

  function clearSiteFilters() {
    setSiteSearch('');
    setSiteState('');
    setSiteCity('');
    setSiteStatus('');
    setSiteOwner('');
  }

  // Step 3 & 4: Templates
  const [pptTemplates, setPptTemplates] = useState<Template[]>([]);
  const [excelTemplates, setExcelTemplates] = useState<Template[]>([]);
  const [pptId, setPptId] = useState('');
  const [excelId, setExcelId] = useState('');

  useEffect(() => {
    api.get('/ppt-templates', { params: { status: 'active' } }).then((res) => setPptTemplates(res.data));
    api.get('/excel-templates', { params: { status: 'active' } }).then((res) => setExcelTemplates(res.data));
  }, []);

  const selectedPpt = pptTemplates.find((t) => t._id === pptId);
  const selectedExcel = excelTemplates.find((t) => t._id === excelId);

  const selectedSiteList = useMemo(() => Array.from(selectedSites.values()), [selectedSites]);
  const totalAmount = selectedSiteList.reduce((sum, s) => sum + (s.amount || 0), 0);
  const gstAmount = selectedSiteList.reduce((sum, s) => sum + (s.gstAmount || 0), 0);
  const monthlyAmount = selectedSiteList.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0);

  const canNext = [!!customerId, selectedSites.size > 0, !!pptId, !!excelId, true][step];

  async function generateProposal() {
    setSaving(true);
    try {
      const { data } = await api.post('/proposals', {
        client: customerId,
        sites: Array.from(selectedSites.keys()),
        pptTemplate: pptId,
        excelTemplate: excelId,
        totalAmount,
        gstAmount,
        monthlyAmount,
      });
      setCreatedProposal(data);
      showToast('Proposal created successfully');
      return data;
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to create proposal', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(type: 'ppt' | 'excel') {
    setGenerating(type);
    try {
      let proposal = createdProposal;
      if (!proposal) proposal = await generateProposal();
      if (!proposal) return;
      const { data } = await api.post(`/proposals/${proposal._id}/generate-${type}`);
      setCreatedProposal(data);
      const url = type === 'ppt' ? data.generatedPptUrl : data.generatedExcelUrl;
      if (url) window.open(/^https?:\/\//i.test(url) ? url : `${fileBaseURL}${url}`, '_blank');
    } catch (err: any) {
      showToast(err?.response?.data?.message || `Failed to generate ${type.toUpperCase()}`, 'error');
    } finally {
      setGenerating(null);
    }
  }

  function goToStep(i: number) {
    setStep(i);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Create Proposal</h1>
        <p className="text-sm text-slate-500">{STEPS[step]}</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 min-w-[120px]">
            <div className="flex items-center gap-2">
              <div
                className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-100 text-blue-700 border-2 border-blue-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${i <= step ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <Panel title={STEPS[step]}>
        {step === 0 && (
          <div>
            <div className="flex gap-2 mb-4">
              {(['client', 'agency'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setCustomerType(t);
                    setCustomerId('');
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                    customerType === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={`Search ${customerType}...`}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setCustomerId(c._id)}
                  className={`text-left rounded-lg border p-3 text-sm ${
                    customerId === c._id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.email || '-'}</p>
                  <p className="text-xs text-slate-400">{c.phone || '-'}</p>
                  {c.gst && <p className="text-xs text-slate-400">GST: {c.gst}</p>}
                </button>
              ))}
              {customers.length === 0 && (
                <p className="col-span-2 text-center text-xs text-slate-400 py-6">No {customerType}s found</p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  placeholder="Search media..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
                />
              </div>
              <StateSelect
                value={siteState}
                onChange={(v) => {
                  setSiteState(v);
                  setSiteCity('');
                }}
              />
              <CitySelect state={siteState} value={siteCity} onChange={setSiteCity} />
            </div>
            <div className="flex items-center justify-between mb-3">
              <select
                value={siteStatus}
                onChange={(e) => setSiteStatus(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="blocked">Blocked</option>
              </select>
              <SiteOwnerSelect value={siteOwner} onChange={setSiteOwner} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button onClick={clearSiteFilters} className="text-xs font-medium text-blue-600 hover:underline">
                Clear Filters
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
              {siteLoading && <p className="px-3 py-6 text-center text-xs text-slate-400">Loading media...</p>}
              {!siteLoading &&
                sites.map((s) => {
                  const disabled = s.mediaStatus !== 'available' && !selectedSites.has(s._id);
                  const src = resolveImageUrl(s.mediaImage);
                  return (
                    <div key={s._id} className={`flex items-center gap-3 px-3 py-2 text-sm ${disabled ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                      <input
                        type="checkbox"
                        checked={selectedSites.has(s._id)}
                        disabled={disabled}
                        onChange={() => toggleSite(s)}
                        title={disabled ? 'Only available media can be added to a proposal' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewSite(s)}
                        className="h-10 w-10 shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center"
                      >
                        {src ? (
                          <img src={src} alt={s.mediaId} className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="h-4 w-4 text-slate-300" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{s.mediaId}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {s.mediaType} · {s.city}, {s.state} {s.areaName ? `· ${s.areaName}` : ''} {s.siteOwner ? `· Owner: ${s.siteOwner}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 shrink-0">₹{(s.totalCost ?? s.amount ?? 0).toLocaleString()}</span>
                      <div className="shrink-0">
                        <StatusBadge status={s.mediaStatus} />
                      </div>
                    </div>
                  );
                })}
              {!siteLoading && sites.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">No media found</p>}
              <div ref={sentinelRef} />
              {siteLoadingMore && <p className="px-3 py-3 text-center text-xs text-slate-400">Loading more...</p>}
            </div>
            <p className="mt-2 text-sm font-medium text-blue-600">
              {selectedSites.size} Sites Selected · Showing {sites.length} of {siteTotal}
            </p>
          </div>
        )}

        {step === 2 && <TemplateGrid items={pptTemplates} selected={pptId} onSelect={setPptId} />}

        {step === 3 && <TemplateGrid items={excelTemplates} selected={excelId} onSelect={setExcelId} />}

        {step === 4 && (
          <div className="space-y-5">
            <div className="space-y-3 text-sm">
              <Row label="Customer" value={selectedCustomer?.name || '-'} action={() => goToStep(0)} />
              <Row label="Customer Type" value={customerType} action={() => goToStep(0)} capitalize />
              <Row label="Selected Site Count" value={`${selectedSites.size} sites`} action={() => goToStep(1)} />
              <Row label="PPT Template" value={selectedPpt?.name || '-'} action={() => goToStep(2)} />
              <Row label="Excel Template" value={selectedExcel?.name || '-'} action={() => goToStep(3)} />
              <Row label="Total Amount" value={`₹${totalAmount.toLocaleString()}`} />
              <Row label="Monthly Amount" value={`₹${monthlyAmount.toLocaleString()}`} />
            </div>

            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setPreviewTab('ppt')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${
                  previewTab === 'ppt' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}
              >
                <Presentation className="h-4 w-4" /> PowerPoint Preview
              </button>
              <button
                onClick={() => setPreviewTab('excel')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${
                  previewTab === 'excel' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel Preview
              </button>
            </div>

            {previewTab === 'ppt' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Slide 1: Cover — customer name, proposal ID</p>
                <p className="text-xs text-slate-400">Slide 2: Summary — pricing totals</p>
                <p className="text-xs text-slate-400">Slide 3: Media table — all selected sites</p>
                <p className="text-xs text-slate-400">Slides 4+: One detail slide per site (image + specs)</p>
                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {selectedSiteList.map((s) => (
                    <div key={s._id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{s.mediaId}</span>
                      <span className="text-xs text-slate-400">{s.city}, {s.state}</span>
                      <span className="ml-auto text-xs font-semibold text-slate-600">₹{(s.monthlyAmount || 0).toLocaleString()}/mo</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => goToStep(2)} className="text-xs font-medium text-blue-600 hover:underline">
                  Edit PPT Template
                </button>
              </div>
            )}

            {previewTab === 'excel' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Sheet: Media</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {['SI.No', 'City', 'Media', 'Location', 'Total Cost', 'Site Status'].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSiteList.map((s, i) => (
                        <tr key={s._id}>
                          <td className="px-2 py-1.5">{i + 1}</td>
                          <td className="px-2 py-1.5">{s.city}</td>
                          <td className="px-2 py-1.5">{s.mediaId}</td>
                          <td className="px-2 py-1.5">{s.location || s.areaName || '-'}</td>
                          <td className="px-2 py-1.5">₹{(s.totalCost || 0).toLocaleString()}</td>
                          <td className="px-2 py-1.5 capitalize">{s.mediaStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => goToStep(3)} className="text-xs font-medium text-blue-600 hover:underline">
                  Edit Excel Template
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
              <button
                disabled={generating === 'ppt'}
                onClick={() => handleDownload('ppt')}
                className="flex items-center gap-1.5 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                <Download className="h-4 w-4" /> {generating === 'ppt' ? 'Generating PPT...' : 'Download PPT'}
              </button>
              <button
                disabled={generating === 'excel'}
                onClick={() => handleDownload('excel')}
                className="flex items-center gap-1.5 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                <Download className="h-4 w-4" /> {generating === 'excel' ? 'Generating Excel...' : 'Download Excel'}
              </button>
              {createdProposal && (
                <button
                  onClick={() => router.push(`/proposals/${createdProposal._id}`)}
                  className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Proposal
                </button>
              )}
            </div>
          </div>
        )}
      </Panel>

      {step < 4 && (
        <div className="flex justify-between">
          <button
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Back
          </button>
          <button
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      {step === 4 && (
        <div className="flex justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
          {!createdProposal && (
            <button
              disabled={saving}
              onClick={generateProposal}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Generate Proposal'}
            </button>
          )}
        </div>
      )}

      <MediaPreviewModal
        open={!!previewSite}
        onClose={() => setPreviewSite(null)}
        image={previewSite?.mediaImage}
        mediaCode={previewSite?.mediaId}
        mediaType={previewSite?.mediaType}
        location={previewSite ? `${previewSite.location || previewSite.areaName || ''} ${previewSite.city}, ${previewSite.state}` : ''}
      />
    </div>
  );
}

function TemplateGrid({ items, selected, onSelect }: { items: Template[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((t) => (
        <button
          key={t._id}
          onClick={() => onSelect(t._id)}
          className={`text-left rounded-lg border p-3 text-sm ${
            selected === t._id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-800">{t.name}</p>
            {selected === t._id && <Check className="h-4 w-4 text-blue-600" />}
          </div>
          <p className="text-xs text-slate-400">{t.description}</p>
        </button>
      ))}
      {items.length === 0 && <p className="col-span-2 text-center text-xs text-slate-400 py-6">No active templates available</p>}
    </div>
  );
}

function Row({ label, value, action, capitalize }: { label: string; value: string; action?: () => void; capitalize?: boolean }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2">
        <span className={`font-medium text-slate-800 ${capitalize ? 'capitalize' : ''}`}>{value}</span>
        {action && (
          <button onClick={action} className="text-xs font-medium text-blue-600 hover:underline">
            Edit
          </button>
        )}
      </span>
    </div>
  );
}
