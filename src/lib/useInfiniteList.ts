'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

// Lazy loading ("infinite scroll") for list endpoints that answer ?page=&limit= with
// { items, total, page, pages } — the same pattern as Media Master. Loads page 1, then the next
// page each time `sentinelRef` (a div placed under the table) scrolls into view. Changing
// `params` (e.g. a search) reloads from page 1; `reload()` does the same after add/edit/delete.
export function useInfiniteList<T extends { _id: string }>(
  url: string,
  params: Record<string, string | number | undefined>,
  pageSize = 20
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const fetchingRef = useRef(false);
  // Bumped on every fresh (page 1) load, so a slower response for older params is ignored.
  const requestIdRef = useRef(0);
  const paramsKey = JSON.stringify(params);

  const fetchPage = useCallback(
    (pageNum: number, append: boolean) => {
      // Scroll-triggered loads wait for the current one; a fresh load always goes.
      if (append && fetchingRef.current) return;
      fetchingRef.current = true;
      const requestId = append ? requestIdRef.current : ++requestIdRef.current;
      if (!append) setLoadingMore(false);
      const setter = append ? setLoadingMore : setLoading;
      setter(true);
      api
        .get(url, { params: { ...JSON.parse(paramsKey), page: pageNum, limit: pageSize } })
        .then((res) => {
          if (requestId !== requestIdRef.current) return;
          setTotal(res.data.total);
          nextPageRef.current = pageNum + 1;
          setItems((prev) => {
            if (!append) return res.data.items;
            const existingIds = new Set(prev.map((i) => i._id));
            return [...prev, ...res.data.items.filter((i: T) => !existingIds.has(i._id))];
          });
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return;
          setter(false);
          fetchingRef.current = false;
        });
    },
    [url, paramsKey, pageSize]
  );

  const reload = useCallback(() => fetchPage(1, false), [fetchPage]);

  useEffect(() => {
    // Fetching on mount / params change is the point of this effect; the state it sets comes
    // from the API response (plus the loading flag).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current && items.length < total) {
          fetchPage(nextPageRef.current, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, total, fetchPage]);

  return { items, total, loading, loadingMore, reload, sentinelRef };
}

// Debounced copy of a value — used so a search box doesn't hit the API on every keystroke.
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
