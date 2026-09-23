'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import api from '@/lib/api';

// Searchable client dropdown — reuses the same `/clients?search=` call the proposal wizard's own
// Customer Details step already makes, just packaged as a small reusable combobox instead of a
// full-page search list.
export default function ClientSelect({
  value,
  valueLabel,
  onChange,
  className,
}: {
  value: string;
  valueLabel?: string;
  onChange: (id: string, label: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    api.get('/clients', { params: { limit: 100, search: query || undefined } }).then((res) => setClients(res.data.items));
  }, [open, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          className ||
          'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white'
        }
      >
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value ? valueLabel : 'All Clients'}</span>
        <span className="flex items-center gap-1 shrink-0">
          {value && (
            <X
              className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange('', '');
              }}
            />
          )}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client..."
            className="w-full border-b border-slate-100 px-3 py-2 text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onChange('', '');
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
          >
            All Clients
          </button>
          {clients.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => {
                onChange(c._id, c.name);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {c.name}
            </button>
          ))}
          {clients.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No clients found</p>}
        </div>
      )}
    </div>
  );
}
