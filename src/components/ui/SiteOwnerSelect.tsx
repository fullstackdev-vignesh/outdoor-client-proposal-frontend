'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import CustomSelect from './CustomSelect';

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
    <CustomSelect
      value={value}
      onChange={onChange}
      options={owners}
      placeholder="All Site Owners"
      className={className}
    />
  );
}
