'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Search } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Panel } from '@/components/ui/Card';
import type { Client, Site, Template } from '@/lib/types';

const STEPS = ['Client', 'Media', 'PPT Template', 'Excel Template', 'Variant', 'Preview'];
const VARIANTS = ['Variant 1', 'Variant 2', 'Variant 3'];

export default function NewProposalPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [pptTemplates, setPptTemplates] = useState<Template[]>([]);
  const [excelTemplates, setExcelTemplates] = useState<Template[]>([]);

  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [siteIds, setSiteIds] = useState<Set<string>>(new Set());
  const [siteSearch, setSiteSearch] = useState('');
  const [pptId, setPptId] = useState('');
  const [excelId, setExcelId] = useState('');
  const [variant, setVariant] = useState(VARIANTS[0]);

  useEffect(() => {
    api.get('/clients', { params: { limit: 100 } }).then((res) => setClients(res.data.items));
    api.get('/sites/available', { params: { limit: 200 } }).then((res) => setSites(res.data.items));
    api.get('/ppt-templates', { params: { status: 'active' } }).then((res) => setPptTemplates(res.data));
    api.get('/excel-templates', { params: { status: 'active' } }).then((res) => setExcelTemplates(res.data));
  }, []);

  const selectedClient = clients.find((c) => c._id === clientId);
  const selectedSites = sites.filter((s) => siteIds.has(s._id));
  const selectedPpt = pptTemplates.find((t) => t._id === pptId);
  const selectedExcel = excelTemplates.find((t) => t._id === excelId);

  const totalAmount = selectedSites.reduce((sum, s) => sum + (s.amount || 0), 0);
  const gstAmount = selectedSites.reduce((sum, s) => sum + (s.gstAmount || 0), 0);
  const monthlyAmount = selectedSites.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0);

  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  const filteredSites = sites.filter(
    (s) =>
      s.mediaName.toLowerCase().includes(siteSearch.toLowerCase()) ||
      s.city.toLowerCase().includes(siteSearch.toLowerCase())
  );

  function toggleSite(id: string) {
    setSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canNext = [!!clientId, siteIds.size > 0, !!pptId, !!excelId, !!variant, true][step];

  async function generateProposal() {
    setSaving(true);
    try {
      const { data } = await api.post('/proposals', {
        client: clientId,
        sites: Array.from(siteIds),
        pptTemplate: pptId,
        excelTemplate: excelId,
        variant,
        totalAmount,
        gstAmount,
        monthlyAmount,
      });
      showToast('Proposal created successfully');
      router.push(`/proposals/${data._id}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to create proposal', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Create Proposal</h1>
        <p className="text-sm text-slate-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-100 text-blue-700 border-2 border-blue-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <Panel title={STEPS[step]}>
        {step === 0 && (
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search client..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {filteredClients.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setClientId(c._id)}
                  className={`text-left rounded-lg border p-3 text-sm ${
                    clientId === c._id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.email || c.phone}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder="Search available media..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
              {filteredSites.map((s) => (
                <label key={s._id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={siteIds.has(s._id)} onChange={() => toggleSite(s._id)} />
                  <span className="flex-1 font-medium text-slate-800">{s.mediaName}</span>
                  <span className="text-xs text-slate-400">{s.city}, {s.state}</span>
                  <span className="text-xs font-semibold text-slate-600">₹{s.monthlyAmount?.toLocaleString()}</span>
                </label>
              ))}
              {filteredSites.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">No available media found</p>}
            </div>
            <p className="mt-2 text-sm font-medium text-blue-600">{siteIds.size} Media Selected</p>
          </div>
        )}

        {step === 2 && (
          <TemplateGrid items={pptTemplates} selected={pptId} onSelect={setPptId} />
        )}

        {step === 3 && (
          <TemplateGrid items={excelTemplates} selected={excelId} onSelect={setExcelId} />
        )}

        {step === 4 && (
          <div className="flex gap-3">
            {VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                  variant === v ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-sm">
            <Row label="Client" value={selectedClient?.name || '-'} />
            <Row label="Media Count" value={`${siteIds.size} media`} />
            <Row label="PPT Template" value={selectedPpt?.name || '-'} />
            <Row label="Excel Template" value={selectedExcel?.name || '-'} />
            <Row label="Proposal Variant" value={variant} />
            <Row label="Total Amount" value={`₹${totalAmount.toLocaleString()}`} />
            <Row label="GST Amount" value={`₹${gstAmount.toLocaleString()}`} />
            <Row label="Monthly Amount" value={`₹${monthlyAmount.toLocaleString()}`} />
          </div>
        )}
      </Panel>

      <div className="flex justify-between">
        <button
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Back
        </button>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <button
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <>
              <button className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">Save Draft</button>
              <button
                disabled={saving}
                onClick={generateProposal}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Generating...' : 'Generate Proposal'}
              </button>
            </>
          )}
        </div>
      </div>
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
          <p className="font-medium text-slate-800">{t.name}</p>
          <p className="text-xs text-slate-400">{t.description}</p>
        </button>
      ))}
      {items.length === 0 && <p className="col-span-2 text-center text-xs text-slate-400 py-6">No active templates available</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
