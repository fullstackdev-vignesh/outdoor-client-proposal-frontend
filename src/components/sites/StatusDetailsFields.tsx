'use client';

import CustomSelect from '@/components/ui/CustomSelect';
import DatePicker from '@/components/ui/DatePicker';
import { todayISO } from '@/lib/date';
import type { Client, MediaStatus, Site } from '@/lib/types';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';

// ---------------------------------------------------------------------------------------------
// Hold / Issue — a reason (+ notes)
// ---------------------------------------------------------------------------------------------

export type StatusDetails = { statusReason: string; statusNotes: string };

export const emptyStatusDetails: StatusDetails = { statusReason: '', statusNotes: '' };

// Pre-fills the fields from the site's current details when it already has that status.
export function statusDetailsFromSite(site: Site | null | undefined, status: MediaStatus): StatusDetails {
  const info = site?.mediaStatus === status ? site.statusInfo : undefined;
  return info ? { statusReason: info.reason || '', statusNotes: info.notes || '' } : emptyStatusDetails;
}

export function statusDetailsValid(status: MediaStatus, d: StatusDetails) {
  return status === 'hold' || status === 'issue' ? !!d.statusReason.trim() : true;
}

const COPY: Partial<Record<MediaStatus, { box: string; title: string; hint: string; reasonPlaceholder: string }>> = {
  hold: {
    box: 'bg-orange-50 border-orange-100',
    title: 'Hold — pending client query',
    hint: 'Stays on Hold until the status is changed. It does not change automatically.',
    reasonPlaceholder: 'e.g. Amount issue, client clarification, negotiation',
  },
  issue: {
    box: 'bg-purple-50 border-purple-100',
    title: 'Issue — site / operational problem',
    hint: 'Sites with an Issue are hidden from client proposals until the status is changed.',
    reasonPlaceholder: 'e.g. Corporation issue',
  },
};

export default function StatusDetailsFields({
  status,
  value,
  onChange,
}: {
  status: MediaStatus;
  value: StatusDetails;
  onChange: (next: StatusDetails) => void;
}) {
  const copy = COPY[status];
  if (!copy) return null;
  const set = (patch: Partial<StatusDetails>) => onChange({ ...value, ...patch });

  return (
    <div className={`space-y-3 rounded-lg border p-3 ${copy.box}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{copy.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{copy.hint}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
        <input placeholder={copy.reasonPlaceholder} value={value.statusReason} onChange={(e) => set({ statusReason: e.target.value })} className={inputCls} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Blocked / Confirmed — customer + its own Start/End Date, optional reason (same flow for both)
// ---------------------------------------------------------------------------------------------

export type BlockDetails = {
  blockCustomerType: 'client' | 'agency';
  blockClient: string;
  blockStartDate: string;
  blockEndDate: string;
  blockReason: string;
  blockNotes: string;
};

export const emptyBlockDetails: BlockDetails = {
  blockCustomerType: 'client',
  blockClient: '',
  blockStartDate: '',
  blockEndDate: '',
  blockReason: '',
  blockNotes: '',
};

// Pre-fills from the site's block (running or scheduled ahead), if it has one.
export function blockDetailsFromSite(site: Site | null | undefined): BlockDetails {
  const b = site?.blockInfo;
  if (!b) return emptyBlockDetails;
  return {
    blockCustomerType: b.customerType === 'agency' ? 'agency' : 'client',
    blockClient: typeof b.client === 'string' ? b.client : '',
    blockStartDate: b.startDate ? b.startDate.slice(0, 10) : '',
    blockEndDate: b.endDate ? b.endDate.slice(0, 10) : '',
    blockReason: b.reason || '',
    blockNotes: b.notes || '',
  };
}

export function blockDetailsError(d: BlockDetails): string | null {
  if (!d.blockClient) return `Select the ${d.blockCustomerType === 'agency' ? 'agency' : 'client'}`;
  if (!d.blockStartDate || !d.blockEndDate) return 'Start Date and End Date are required';
  if (d.blockEndDate < d.blockStartDate) return 'End Date must be on or after Start Date';
  return null;
}

const KIND_COPY = {
  blocked: { title: 'Block Details', status: 'Blocked', box: 'bg-red-50 border-red-100', titleCls: 'text-red-700', reason: 'Block Reason', reasonPlaceholder: 'Enter reason for blocking this site' },
  confirmed: { title: 'Confirm Details', status: 'Confirmed', box: 'bg-blue-50 border-blue-100', titleCls: 'text-blue-700', reason: 'Confirm Reason', reasonPlaceholder: 'e.g. PO received, client approved' },
} as const;

export function BlockDetailsFields({
  kind = 'blocked',
  value,
  onChange,
  clients,
  bookedRanges = [],
  minStartDate = todayISO(),
  error,
}: {
  kind?: 'blocked' | 'confirmed';
  value: BlockDetails;
  onChange: (next: BlockDetails) => void;
  clients: Client[];
  // Dates already taken by bookings — greyed out (a block can't overlap a booking).
  bookedRanges?: { start: string; end: string }[];
  // A block that is already running keeps its own (past) Start Date.
  minStartDate?: string;
  error?: string | null;
}) {
  const set = (patch: Partial<BlockDetails>) => onChange({ ...value, ...patch });
  const copy = KIND_COPY[kind];
  const nextBookedStart = value.blockStartDate
    ? bookedRanges.map((r) => r.start).filter((s) => s > value.blockStartDate).sort()[0]
    : undefined;
  const endMax = nextBookedStart ? new Date(new Date(nextBookedStart).getTime() - 86400000).toISOString().slice(0, 10) : undefined;

  return (
    <div className={`space-y-3 rounded-lg border p-3 ${copy.box}`}>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${copy.titleCls}`}>{copy.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {`The site shows ${copy.status} as soon as you save, until the End Date, then goes back to Immediate automatically.`}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type *</label>
        <div className="flex gap-2">
          {(['client', 'agency'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ blockCustomerType: t, blockClient: '' })}
              className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                value.blockCustomerType === t ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{value.blockCustomerType === 'agency' ? 'Agency' : 'Client'} *</label>
        <CustomSelect
          value={value.blockClient}
          onChange={(v) => set({ blockClient: v })}
          placeholder={`Select ${value.blockCustomerType === 'agency' ? 'agency' : 'client'}`}
          options={clients
            .filter((c) => (value.blockCustomerType === 'agency' ? c.customerType === 'agency' : c.customerType !== 'agency'))
            .map((c) => ({ value: c._id, label: c.name }))}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
          <DatePicker
            value={value.blockStartDate}
            // Any date from today on can be picked (no cap at the current End Date). An End Date that no
            // longer fits — before the new Start Date, or with a booking in between — is cleared.
            onChange={(v) => {
              const end = value.blockEndDate;
              const endStillFits = !!end && end >= v && !bookedRanges.some((r) => r.start > v && r.start <= end);
              set({ blockStartDate: v, blockEndDate: endStillFits ? end : '' });
            }}
            min={minStartDate}
            disabledRanges={bookedRanges}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
          <DatePicker
            value={value.blockEndDate}
            onChange={(v) => set({ blockEndDate: v })}
            min={value.blockStartDate || minStartDate}
            max={endMax}
            disabledRanges={bookedRanges}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{copy.reason}</label>
        <input placeholder={`${copy.reasonPlaceholder} (optional)`} value={value.blockReason} onChange={(e) => set({ blockReason: e.target.value })} className={inputCls} />
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
