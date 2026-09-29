'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';
import api from '@/lib/api';

export function useSiteOwners() {
  const [owners, setOwners] = useState<string[]>([]);
  useEffect(() => {
    api.get('/sites/owners').then((res) => setOwners(res.data));
  }, []);
  return owners;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';

/**
 * Site Owner filter (Media Master, Inventory, Proposals) — searchable like the State filter.
 * Typing only narrows the list; the filter changes when an owner is picked (or cleared), so the
 * page doesn't refetch on every keystroke. '' means "All Site Owners".
 */
export function SiteOwnerSelect({
  value,
  onChange,
  className,
  containerClassName,
}: {
  value: string;
  onChange: (owner: string) => void;
  className?: string;
  containerClassName?: string;
}) {
  const owners = useSiteOwners();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Typed text that wasn't picked goes back to the applied filter.
        setSearchTerm(value || '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Showing the applied owner in the box shouldn't hide the rest of the list when reopened.
  const query = searchTerm.trim() && searchTerm !== value ? searchTerm.trim().toLowerCase() : '';
  const filteredOwners = useMemo(
    () => (query ? owners.filter((o) => o.toLowerCase().includes(query)) : owners),
    [owners, query]
  );

  function select(owner: string) {
    setSearchTerm(owner);
    onChange(owner);
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    select('');
  }

  const containerCls =
    containerClassName ||
    (className ? className.match(/\b(w-\S+|min-w-\S+|max-w-\S+|flex-\S+)\b/g)?.join(' ') || 'w-full' : 'w-full');
  const styleCls = className ? className.replace(/\b(w-\S+|min-w-\S+|max-w-\S+|flex-\S+)\b/g, '').trim() : '';
  const inputStyleCls = styleCls ? `${styleCls} w-full focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100` : inputCls;

  return (
    <div ref={containerRef} className={`relative ${containerCls}`}>
      <div className="relative flex items-center w-full">
        <input
          type="text"
          autoComplete="off"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredOwners.length === 1) select(filteredOwners[0]);
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
              setSearchTerm(value || '');
            }
          }}
          placeholder="All Site Owners"
          className={`${inputStyleCls} pr-8`}
        />
        <div className="absolute right-2.5 flex items-center gap-1 text-slate-400">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-100 hover:text-slate-600"
              title="Clear site owner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
            onClick={() => setIsOpen((prev) => !prev)}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 min-w-[200px] w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-sm">
          {!query && (
            <button
              type="button"
              onClick={() => select('')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center justify-between ${
                value === '' ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-500'
              }`}
            >
              <span>All Site Owners</span>
              {value === '' && <Check className="h-4 w-4 text-red-600" />}
            </button>
          )}
          {filteredOwners.map((owner) => (
            <button
              type="button"
              key={owner}
              onClick={() => select(owner)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center justify-between ${
                value === owner ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-700'
              }`}
            >
              <span>{owner}</span>
              {value === owner && <Check className="h-4 w-4 text-red-600" />}
            </button>
          ))}
          {filteredOwners.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No matching site owners found</div>}
        </div>
      )}
    </div>
  );
}

// Same popup as "Add New City" (StateCitySelect), for a site owner not in the list yet.
function AddSiteOwnerModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (owner: string) => void }) {
  const [ownerName, setOwnerName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setOwnerName('');
      setError('');
    }
  }, [open]);

  function handleSave() {
    const trimmed = ownerName.trim();
    if (!trimmed) {
      setError('Site owner name is required');
      return;
    }
    onAdd(trimmed);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-800">Add New Site Owner</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Site Owner Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={ownerName}
            onChange={(e) => {
              setOwnerName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="e.g. Adinn"
            className={inputCls}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Add & Select
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Site Owner field for the site form — same look and behaviour as the City select: pick an
 * existing owner (filtered as you type), add the typed text as a new owner, or use
 * "+ Add New Site Owner". Whatever ends up in the box is the value.
 */
export function SiteOwnerInput({
  value,
  onChange,
  id,
  placeholder = 'Type or select site owner',
  className,
}: {
  value: string;
  onChange: (owner: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const fetchedOwners = useSiteOwners();
  const [added, setAdded] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Owners added in this form show up in the list straight away.
  const owners = useMemo(() => Array.from(new Set([...fetchedOwners, ...added])), [fetchedOwners, added]);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOwners = useMemo(() => {
    if (!searchTerm.trim()) return owners;
    return owners.filter((o) => o.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [owners, searchTerm]);

  const isExactMatch = useMemo(() => {
    if (!searchTerm.trim()) return true;
    return owners.some((o) => o.toLowerCase() === searchTerm.trim().toLowerCase());
  }, [owners, searchTerm]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  }

  function handleSelectOwner(owner: string) {
    if (!owners.includes(owner)) setAdded((prev) => [...prev, owner]);
    setSearchTerm(owner);
    onChange(owner);
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSearchTerm('');
    onChange('');
    setIsOpen(true);
  }

  const inputStyleCls = className ? className.replace(/\b(w-\S+|min-w-\S+|max-w-\S+)\b/g, '').trim() + ' w-full' : inputCls;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center w-full">
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`${inputStyleCls} pr-8`}
        />
        <div className="absolute right-2.5 flex items-center gap-1 text-slate-400">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-100 hover:text-slate-600"
              title="Clear site owner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
            onClick={() => setIsOpen((prev) => !prev)}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 min-w-[200px] w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-sm">
          {searchTerm.trim() && !isExactMatch && (
            <button
              type="button"
              onClick={() => handleSelectOwner(searchTerm.trim())}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 border-b border-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add &quot;{searchTerm.trim()}&quot; as new site owner</span>
            </button>
          )}

          {filteredOwners.map((owner) => (
            <button
              type="button"
              key={owner}
              onClick={() => handleSelectOwner(owner)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center justify-between ${
                value === owner ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-700'
              }`}
            >
              <span>{owner}</span>
              {value === owner && <Check className="h-4 w-4 text-red-600" />}
            </button>
          ))}

          {filteredOwners.length === 0 && isExactMatch && (
            <div className="px-3 py-2 text-xs text-slate-400">No matching site owners found</div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setAddModalOpen(true);
            }}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/50 sticky bottom-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add New Site Owner</span>
          </button>
        </div>
      )}

      <AddSiteOwnerModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleSelectOwner} />
    </div>
  );
}
