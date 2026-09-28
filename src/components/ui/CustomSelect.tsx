'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  disabled = false,
  className = '',
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOpt = normalizedOptions.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-left transition focus:outline-none focus:ring-2 ${
          disabled
            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200'
            : 'bg-white cursor-pointer border-slate-300 hover:border-red-400 focus:border-red-500 focus:ring-red-100'
        } ${className}`}
      >
        <span className={`truncate ${selectedOpt?.value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-sm">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition cursor-pointer ${
                value === '' ? 'bg-red-50 text-red-700 font-semibold' : 'text-slate-500 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <span>{placeholder}</span>
              {value === '' && <Check className="h-4 w-4 text-red-600 shrink-0" />}
            </button>
          )}
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition cursor-pointer ${
                  isSelected ? 'bg-red-50 text-red-700 font-semibold' : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 text-red-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
