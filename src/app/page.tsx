'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Deferred to the next tick: this effect can run on the very first commit, before the App
    // Router has initialized ("Router action dispatched before initialization").
    const id = setTimeout(() => router.replace(user ? '/dashboard' : '/login'), 0);
    return () => clearTimeout(id);
  }, [user, loading, router]);

  return null;
}
