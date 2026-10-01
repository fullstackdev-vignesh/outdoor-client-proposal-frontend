'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Horizontal-scroll wrapper for list tables inside the app's scrolling <main>:
 * - the header row stays pinned to the top of <main> while the page scrolls
 * - a themed horizontal scrollbar stays pinned to the bottom of the viewport
 *
 * The parent card must not use `overflow-hidden` (use `overflow-clip`), or the sticky scrollbar can't stick.
 */
export default function ScrollTable({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const scroller = wrap.closest('main');

    const update = () => {
      setScrollWidth(wrap.scrollWidth > wrap.clientWidth ? wrap.scrollWidth : 0);
      // `position: sticky` can't escape the horizontal scroll wrapper, so the header is pinned by
      // translating its cells down by however far the table top has scrolled past <main>'s top.
      const head = wrap.querySelector('thead');
      if (!scroller || !head) return;
      const passed = scroller.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
      const max = Math.max(wrap.offsetHeight - head.offsetHeight, 0);
      wrap.style.setProperty('--head-offset', `${Math.min(Math.max(passed, 0), max)}px`);
    };

    update();
    scroller?.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    if (wrap.firstElementChild) ro.observe(wrap.firstElementChild);
    return () => {
      scroller?.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  function sync(from: HTMLDivElement | null, to: HTMLDivElement | null) {
    if (from && to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
  }

  return (
    <>
      <div
        ref={wrapRef}
        onScroll={() => sync(wrapRef.current, barRef.current)}
        className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [&_thead_th]:relative [&_thead_th]:z-20 [&_thead_th]:bg-slate-50 [&_thead_th]:shadow-[0_1px_0_#e2e8f0] [&_thead_th]:translate-y-[var(--head-offset,0px)]"
      >
        {children}
      </div>
      {scrollWidth > 0 && (
        // -bottom-6 cancels <main>'s p-6 so the bar sits flush with the viewport edge, not 24px above it.
        <div className="sticky -bottom-6 z-30 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-4px_8px_-4px_rgba(15,23,42,0.08)]">
          <div ref={barRef} onScroll={() => sync(barRef.current, wrapRef.current)} className="overflow-x-auto scrollbar-theme">
            {/* Inner width offsets the strip's px-3 so both scrollers share the same max scrollLeft */}
            <div style={{ width: scrollWidth - 24, height: 1 }} />
          </div>
        </div>
      )}
    </>
  );
}
