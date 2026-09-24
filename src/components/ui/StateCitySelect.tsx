'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import api from '@/lib/api';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export const STATIC_STATES = ['Tamil Nadu', 'Kerala', 'Karnataka'];

export function useStates() {
  const [states, setStates] = useState<string[]>(STATIC_STATES);
  useEffect(() => {
    api
      .get('/locations/states')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setStates(res.data);
        } else {
          setStates(STATIC_STATES);
        }
      })
      .catch(() => setStates(STATIC_STATES));
  }, []);
  return states;
}

export function useCities(state: string) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state) {
      setCities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/locations/states/${encodeURIComponent(state)}/cities`)
      .then((res) => {
        setCities(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setCities([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [state]);

  return { cities, loading };
}

export function StateSelect({
  value,
  onChange,
  required,
  className,
}: {
  value: string;
  onChange: (state: string) => void;
  required?: boolean;
  className?: string;
}) {
  const states = useStates();
  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || inputCls}
    >
      <option value="">Select State</option>
      {states.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

function AddCityModal({
  open,
  state,
  onClose,
  onAdd,
}: {
  open: boolean;
  state: string;
  onClose: () => void;
  onAdd: (newCity: string) => void;
}) {
  const [cityName, setCityName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCityName('');
      setError('');
    }
  }, [open]);

  function handleSave() {
    const trimmed = cityName.trim();
    if (!trimmed) {
      setError('City name is required');
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
          <h3 className="text-base font-semibold text-slate-800">Add New City</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Adding a new city for state: <span className="font-semibold text-slate-700">{state}</span>
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            City Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={cityName}
            onChange={(e) => {
              setCityName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="e.g. Salem"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Add & Select
          </button>
        </div>
      </div>
    </div>
  );
}

export function CitySelect({
  state,
  value,
  onChange,
  required,
  className,
  containerClassName,
  placeholder,
  allowAdd = false,
}: {
  state: string;
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
  className?: string;
  containerClassName?: string;
  placeholder?: string;
  allowAdd?: boolean;
}) {
  const { cities, loading } = useCities(state);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef(state);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Only reset city when state explicitly changes from one valid state to a DIFFERENT state
  useEffect(() => {
    if (prevStateRef.current && prevStateRef.current !== state) {
      onChange('');
      setSearchTerm('');
    }
    prevStateRef.current = state;
  }, [state, onChange]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) return cities;
    return cities.filter((c) => c.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [cities, searchTerm]);

  // Check if current search term exact match exists in cities list
  const isExactMatch = useMemo(() => {
    if (!searchTerm.trim()) return true;
    return cities.some((c) => c.toLowerCase() === searchTerm.trim().toLowerCase());
  }, [cities, searchTerm]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = e.target.value;
    setSearchTerm(newVal);
    onChange(newVal);
    if (state) setIsOpen(true);
  }

  function handleSelectCity(city: string) {
    setSearchTerm(city);
    onChange(city);
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSearchTerm('');
    onChange('');
    if (state) setIsOpen(true);
  }

  // Extract layout/width classes (w-*, min-w-*, max-w-*, flex-*) for outer container div
  const containerCls =
    containerClassName ||
    (className
      ? className.match(/\b(w-\S+|min-w-\S+|max-w-\S+|flex-\S+)\b/g)?.join(' ') || 'w-full'
      : 'w-full');

  // Input className: remove width classes from input styling since width is handled by container,
  // but retain all border, rounded, background, text, and focus styles
  const inputStyleCls = className
    ? className.replace(/\b(w-\S+|min-w-\S+|max-w-\S+)\b/g, '').trim() + ' w-full'
    : inputCls;

  return (
    <div ref={containerRef} className={`relative ${containerCls}`}>
      <div className="relative flex items-center w-full">
        <input
          type="text"
          required={required}
          disabled={!state}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (state) setIsOpen(true);
          }}
          placeholder={
            !state
              ? 'Select state first'
              : loading
              ? 'Loading cities...'
              : placeholder || 'Type or select city'
          }
          className={`${inputStyleCls} pr-8 ${!state ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
        />
        <div className="absolute right-2.5 flex items-center gap-1 text-slate-400">
          {searchTerm && state && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-100 hover:text-slate-600"
              title="Clear city"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
            onClick={() => {
              if (state) setIsOpen((prev) => !prev);
            }}
          />
        </div>
      </div>

      {isOpen && state && (
        <div className="absolute left-0 z-50 mt-1 min-w-[200px] w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-sm">
          {loading ? (
            <div className="px-3 py-2 text-xs text-slate-400">Loading cities...</div>
          ) : (
            <>
              {/* Option to add typed custom city if not exact match (ONLY when allowAdd is true) */}
              {allowAdd && searchTerm.trim() && !isExactMatch && (
                <button
                  type="button"
                  onClick={() => handleSelectCity(searchTerm.trim())}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 border-b border-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add &quot;{searchTerm.trim()}&quot; as new city</span>
                </button>
              )}

              {/* List of matching cities */}
              {filteredCities.map((city) => (
                <button
                  type="button"
                  key={city}
                  onClick={() => handleSelectCity(city)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                    value === city ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  <span>{city}</span>
                  {value === city && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))}

              {filteredCities.length === 0 && (!allowAdd || isExactMatch) && (
                <div className="px-3 py-2 text-xs text-slate-400">No matching cities found</div>
              )}

              {/* Sticky bottom option: + Add New City (ONLY when allowAdd is true) */}
              {allowAdd && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setAddModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/50 sticky bottom-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add New City for {state}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {allowAdd && (
        <AddCityModal
          open={addModalOpen}
          state={state}
          onClose={() => setAddModalOpen(false)}
          onAdd={(newCity) => handleSelectCity(newCity)}
        />
      )}
    </div>
  );
}
