'use client';

import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="flex gap-3">
        <div
          className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${
            danger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-600 pt-2">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
