'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { formatISTDate, todayISO } from '@/lib/date';
import { BlockDetailsFields, blockDetailsError, emptyBlockDetails, type BlockDetails } from '@/components/sites/StatusDetailsFields';
import type { BlockInfo, Client, Site, UpcomingBlock } from '@/lib/types';

// 'YYYY-MM-DD' → the next day, built from UTC parts so there's no timezone shift.
function dayAfter(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function detailsFromBlock(b: BlockInfo): BlockDetails {
  const client = b.client as unknown;
  return {
    blockCustomerType: b.customerType === 'agency' ? 'agency' : 'client',
    blockClient: typeof client === 'string' ? client : (client as { _id?: string } | undefined)?._id || '',
    blockStartDate: b.startDate ? b.startDate.slice(0, 10) : '',
    blockEndDate: b.endDate ? b.endDate.slice(0, 10) : '',
    blockReason: b.reason || '',
    blockNotes: b.notes || '',
  };
}

// Which period the form is for: a new one (null), the current one, or a waiting one (its blockId).
type EditTarget = null | 'current' | string;

// "+ Add Blocked" / "+ Add Confirmed" — the Blocked/Confirmed version of "+ Add Booking": adds another
// period (another customer or later dates) without touching the current one. It waits until its Start
// Date and then becomes the site's status automatically. Waiting periods can be cancelled from here too.
export default function AddUpcomingBlockModal({
  open,
  onClose,
  site,
  kind,
  onSaved,
  source = 'inventory',
}: {
  open: boolean;
  onClose: () => void;
  site: Site | null;
  kind: 'blocked' | 'confirmed';
  onSaved: () => void;
  source?: 'sites' | 'inventory';
}) {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [details, setDetails] = useState<BlockDetails>(emptyBlockDetails);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  // Cancelling a waiting period: which one, and why.
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setDetails(emptyBlockDetails);
    setEditTarget(null);
    setCancelId(null);
    setCancelReason('');
    api.get('/clients', { params: { limit: 200 } }).then((res) => setClients(res.data.items));
  }, [open, site]);

  if (!site) return null;

  const current = site.blockInfo?.startDate && site.blockInfo?.endDate ? site.blockInfo : undefined;
  const upcoming: UpcomingBlock[] = [...(site.upcomingBlocks || [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const editingUpcoming = editTarget && editTarget !== 'current' ? upcoming.find((b) => b.blockId === editTarget) : undefined;
  // An edited period keeps its own kind; a new one takes the row's status.
  const formKind: 'blocked' | 'confirmed' =
    editTarget === 'current' ? current?.kind || (site.mediaStatus === 'confirmed' ? 'confirmed' : 'blocked') : editingUpcoming?.kind || kind;
  const label = formKind === 'confirmed' ? 'Confirmed' : 'Blocked';
  const range = (s: string, e: string) => ({ start: s.slice(0, 10), end: e.slice(0, 10) });
  // Dates already taken — bookings, the current period and other waiting periods (not the one being
  // edited) — are greyed out.
  const takenRanges = [
    ...(site.bookings || [])
      .filter((b) => b.status !== 'cancelled' && b.status !== 'completed' && b.startDate && b.endDate)
      .map((b) => range(b.startDate, b.endDate)),
    ...(current && editTarget !== 'current' ? [range(current.startDate!, current.endDate!)] : []),
    ...upcoming.filter((b) => b.blockId !== editTarget).map((b) => range(b.startDate, b.endDate)),
  ];
  // A new/waiting period must start after the current one ends; the current one, when running, keeps
  // its own (past) Start Date.
  const currentStart = current?.startDate?.slice(0, 10);
  const currentEnd = current?.endDate?.slice(0, 10);
  const minStartDate =
    editTarget === 'current'
      ? currentStart && currentStart < todayISO() ? currentStart : todayISO()
      : currentEnd && currentEnd >= todayISO() ? dayAfter(currentEnd) : todayISO();
  const error = blockDetailsError(details);

  function selectTarget(target: EditTarget) {
    setEditTarget(target);
    setCancelId(null);
    const b = target === 'current' ? current : target ? upcoming.find((x) => x.blockId === target) : undefined;
    setDetails(b ? detailsFromBlock(b) : emptyBlockDetails);
  }

  async function submit() {
    if (!site || error) return;
    setSaving(true);
    try {
      if (editTarget === 'current') {
        // The current period is the site's own Blocked/Confirmed status — saved like the status popup does.
        await api.patch(`/sites/${site._id}/status`, { mediaStatus: formKind, ...details, source });
      } else if (editingUpcoming) {
        await api.put(`/sites/${site._id}/upcoming-blocks/${editingUpcoming.blockId}`, { kind: formKind, ...details, source });
      } else {
        await api.post(`/sites/${site._id}/upcoming-blocks`, { kind: formKind, ...details, source });
      }
      showToast(`${label} period ${editTarget ? 'updated' : 'added'} successfully`);
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || `Failed to save ${label.toLowerCase()} period`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function cancelUpcoming() {
    if (!site || !cancelId || !cancelReason.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/sites/${site._id}/upcoming-blocks/${cancelId}/cancel`, { reason: cancelReason.trim(), source });
      showToast('Upcoming period cancelled successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to cancel period', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${editTarget ? 'Edit' : 'Add'} ${label} — ${site.mediaCode || site.mediaId}`} size="md">
      <div className="space-y-4">
        {(current || upcoming.length > 0) && (
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Existing Periods</p>
            <ul className="space-y-1 text-xs text-slate-600">
              {current && (
                <li
                  className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 ${
                    editTarget === 'current' ? 'bg-red-50 ring-1 ring-red-200' : ''
                  }`}
                >
                  <span className="font-medium text-slate-800">{current.customerName || '-'}</span>
                  <span className="flex items-center">
                    {formatISTDate(current.startDate)} → {formatISTDate(current.endDate)}
                    <span className="ml-1.5 capitalize text-red-600">{current.kind || 'blocked'} · Current</span>
                    <EditButton active={editTarget === 'current'} onClick={() => selectTarget('current')} />
                  </span>
                </li>
              )}
              {upcoming.map((b) => (
                <li
                  key={b.blockId}
                  className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 ${
                    cancelId === b.blockId ? 'bg-amber-50 ring-1 ring-amber-200' : editTarget === b.blockId ? 'bg-red-50 ring-1 ring-red-200' : ''
                  }`}
                >
                  <span className="font-medium text-slate-800">{b.customerName || '-'}</span>
                  <span className="flex items-center">
                    {formatISTDate(b.startDate)} → {formatISTDate(b.endDate)}
                    <span className="ml-1.5 capitalize text-amber-600">{b.kind || 'blocked'} · Upcoming</span>
                    <EditButton active={editTarget === b.blockId} onClick={() => selectTarget(b.blockId)} />
                    <button
                      type="button"
                      onClick={() => {
                        setCancelId(cancelId === b.blockId ? null : b.blockId);
                        setCancelReason('');
                      }}
                      className="ml-1.5 rounded border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-50"
                    >
                      {cancelId === b.blockId ? 'Keep' : 'Cancel'}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!cancelId && (current || upcoming.length > 0) && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => selectTarget(null)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
                !editTarget
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-white text-red-600 border-dashed border-red-300 hover:bg-red-50 hover:border-red-400'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add New {kind === 'confirmed' ? 'Confirmed' : 'Blocked'}
            </button>
            <p className="text-xs text-slate-500">
              {editTarget
                ? 'Editing the highlighted period — other periods are kept.'
                : 'Adds a separate period. Click Edit on a period above to change it.'}
            </p>
          </div>
        )}

        {cancelId ? (
          <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cancellation Reason *</label>
              <textarea
                placeholder="e.g. Client dropped the plan"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={inputCls}
                rows={2}
              />
            </div>
            <p className="text-xs text-slate-500">Only the selected upcoming period is cancelled — the current status stays as it is.</p>
          </div>
        ) : (
          <>
            <BlockDetailsFields
              kind={formKind}
              value={details}
              onChange={setDetails}
              clients={clients}
              bookedRanges={takenRanges}
              minStartDate={minStartDate}
            />
            {!editTarget && (
              <p className="text-xs text-slate-500">
                The current period stays as it is. This one is added separately and the site becomes {label} on its Start Date.
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Close
          </button>
          {cancelId ? (
            <button
              onClick={cancelUpcoming}
              disabled={!cancelReason.trim() || saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Cancelling...' : 'Cancel Period'}
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!!error || saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editTarget ? `Update ${label}` : `Add ${label}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EditButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ml-2 rounded border px-2 py-0.5 text-[11px] font-medium ${
        active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
      }`}
    >
      {active ? 'Editing' : 'Edit'}
    </button>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';
