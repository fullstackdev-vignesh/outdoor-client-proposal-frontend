'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export function useSiteOwners() {
  const [owners, setOwners] = useState<string[]>([]);
  useEffect(() => {
    api.get('/sites/owners').then((res) => setOwners(res.data));
  }, []);
  return owners;
}

export function SiteOwnerSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (owner: string) => void;
  className?: string;
}) {
  const owners = useSiteOwners();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className || inputCls}>
      <option value="">All Site Owners</option>
      {owners.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
