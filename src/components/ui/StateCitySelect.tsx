'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export function useStates() {
  const [states, setStates] = useState<string[]>([]);
  useEffect(() => {
    api.get('/locations/states').then((res) => setStates(res.data));
  }, []);
  return states;
}

export function useCities(state: string) {
  const [cities, setCities] = useState<string[]>([]);
  useEffect(() => {
    if (!state) {
      setCities([]);
      return;
    }
    api.get(`/locations/states/${encodeURIComponent(state)}/cities`).then((res) => setCities(res.data));
  }, [state]);
  return cities;
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
    <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className={className || inputCls}>
      <option value="">Select state</option>
      {states.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function CitySelect({
  state,
  value,
  onChange,
  required,
  className,
}: {
  state: string;
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
  className?: string;
}) {
  const cities = useCities(state);
  return (
    <select required={required} disabled={!state} value={value} onChange={(e) => onChange(e.target.value)} className={className || inputCls}>
      <option value="">{state ? 'Select city' : 'Select state first'}</option>
      {cities.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
