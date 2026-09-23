'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

// The internal/API value is always plain 'YYYY-MM-DD' — parsed/built from components only,
// never via `new Date(str)`/`toISOString()`, so there is no timezone shift.
function parseISO(value?: string): YMD | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toISO({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplay(value?: string): string {
  const p = parseISO(value);
  if (!p) return '';
  return `${String(p.d).padStart(2, '0')}-${MONTHS_SHORT[p.m - 1]}-${p.y}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

// 0 = Monday ... 6 = Sunday
function firstWeekdayMon0(y: number, m: number) {
  const jsDay = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

function compareYMD(a: YMD, b: YMD) {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

export default function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  minYear,
  maxYear,
  placeholder = 'DD-MMM-YYYY',
  className,
  error,
  disabled,
}: {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

  const today = new Date();
  const todayYMD: YMD = { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };
  const selected = parseISO(value);
  const minYMD = parseISO(min);
  const maxYMD = parseISO(max);

  const [viewY, setViewY] = useState(selected?.y ?? todayYMD.y);
  const [viewM, setViewM] = useState(selected?.m ?? todayYMD.m);

  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
      setMonthMenuOpen(false);
      setYearMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (yearMenuOpen && yearListRef.current) {
      const active = yearListRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
      active?.scrollIntoView({ block: 'center' });
    }
  }, [yearMenuOpen]);

  function openCalendar() {
    if (disabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      // Prefer opening upward (easier to reach without extra scrolling); fall back to
      // downward only when there truly isn't enough room above the field.
      const POPUP_HEIGHT = 340;
      const openUp = rect.top >= POPUP_HEIGHT;
      setPos({ top: openUp ? rect.top : rect.bottom, left: rect.left, width: rect.width, openUp });
    }
    // Open on the selected value's month if there is one; otherwise default to minDate's
    // month (e.g. an End Date picker with no value yet should open on the Start Date's
    // month, not today's) and only fall back to today when there's no min either.
    const p = parseISO(value) ?? minYMD;
    setViewY(p?.y ?? todayYMD.y);
    setViewM(p?.m ?? todayYMD.m);
    setOpen(true);
  }

  function toggleCalendar() {
    if (open) {
      setOpen(false);
      setMonthMenuOpen(false);
      setYearMenuOpen(false);
    } else {
      openCalendar();
    }
  }

  const lowMinYear = minYear ?? (minYMD ? minYMD.y : todayYMD.y - 5);
  const highMaxYear = maxYear ?? (maxYMD ? maxYMD.y : todayYMD.y + 10);
  const yearOptions: number[] = [];
  for (let y = lowMinYear; y <= highMaxYear; y++) yearOptions.push(y);

  function isDisabled(ymd: YMD) {
    if (minYMD && compareYMD(ymd, minYMD) < 0) return true;
    if (maxYMD && compareYMD(ymd, maxYMD) > 0) return true;
    return false;
  }

  // The previous month is entirely before minDate once the CURRENT view is already at (or
  // before) minDate's own month/year — there is never a valid day to navigate back to.
  const prevMonthFullyBeforeMin = !!minYMD && compareYMD({ y: viewY, m: viewM, d: 1 }, { y: minYMD.y, m: minYMD.m, d: 1 }) <= 0;

  function isMonthDisabled(monthIdx1: number) {
    if (minYMD && viewY === minYMD.y && monthIdx1 < minYMD.m) return true;
    if (maxYMD && viewY === maxYMD.y && monthIdx1 > maxYMD.m) return true;
    return false;
  }

  function selectDay(y: number, m: number, d: number) {
    const ymd = { y, m, d };
    if (isDisabled(ymd)) return;
    onChange?.(toISO(ymd));
    setOpen(false);
    setMonthMenuOpen(false);
    setYearMenuOpen(false);
  }

  function changeMonth(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewY(y);
    setViewM(m);
  }

  const totalDays = daysInMonth(viewY, viewM);
  const leadIn = firstWeekdayMon0(viewY, viewM);
  const prevMonthDays = daysInMonth(viewM === 1 ? viewY - 1 : viewY, viewM === 1 ? 12 : viewM - 1);

  const cells: { y: number; m: number; d: number; outside: boolean }[] = [];
  for (let i = leadIn - 1; i >= 0; i--) {
    const m = viewM === 1 ? 12 : viewM - 1;
    const y = viewM === 1 ? viewY - 1 : viewY;
    cells.push({ y, m, d: prevMonthDays - i, outside: true });
  }
  for (let d = 1; d <= totalDays; d++) cells.push({ y: viewY, m: viewM, d, outside: false });
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    let y = last.y;
    let m = last.m;
    let d = last.d + 1;
    // Only roll over to the next month once the day count actually exceeds that month's length —
    // recomputing month/year from the previous cell on every iteration (the old logic) advanced
    // the month by one on every single trailing day, corrupting far-past-month-end dates.
    if (d > daysInMonth(y, m)) {
      d = 1;
      m = m === 12 ? 1 : m + 1;
      y = last.m === 12 ? last.y + 1 : last.y;
    }
    cells.push({ y, m, d, outside: true });
    if (cells.length >= 42) break;
  }

  return (
    <div className="relative" ref={containerRef}>
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={toggleCalendar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCalendar();
          }
        }}
        className={`flex items-center justify-between w-full rounded-lg border px-3 py-2 text-sm ${
          disabled
            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200'
            : `bg-white cursor-pointer focus:outline-none focus:ring-2 ${
                error ? 'border-red-400 hover:border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-100'
              }`
        } ${className || ''}`}
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
      </div>

      {open && pos && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: pos.openUp ? undefined : pos.top + 4,
            bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
            left: pos.left,
            minWidth: Math.max(pos.width, 260),
            zIndex: 9999,
          }}
          className="rounded-xl border border-slate-200 bg-white shadow-xl p-3"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <button
              type="button"
              disabled={prevMonthFullyBeforeMin}
              onClick={() => changeMonth(-1)}
              className={`rounded-lg p-1.5 ${
                prevMonthFullyBeforeMin ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => {
                  setMonthMenuOpen((v) => !v);
                  setYearMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {MONTHS_FULL[viewM - 1]} <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {monthMenuOpen && (
                <div className="absolute left-0 top-full mt-1 max-h-56 w-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-10">
                  {MONTHS_FULL.map((label, idx) => {
                    const dis = isMonthDisabled(idx + 1);
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={dis}
                        onClick={() => {
                          setViewM(idx + 1);
                          setMonthMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-1.5 text-left text-sm ${
                          dis
                            ? 'text-slate-300 cursor-not-allowed'
                            : `hover:bg-blue-50 ${idx + 1 === viewM ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => {
                  setYearMenuOpen((v) => !v);
                  setMonthMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {viewY} <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {yearMenuOpen && (
                <div
                  ref={yearListRef}
                  className="absolute right-0 top-full mt-1 max-h-56 w-28 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-10"
                >
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      data-active={y === viewY}
                      onClick={() => {
                        setViewY(y);
                        setYearMenuOpen(false);
                      }}
                      className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 ${
                        y === viewY ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-slate-400 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.slice(0, 42).map((c, i) => {
              const ymd = { y: c.y, m: c.m, d: c.d };
              const isSelected = !!selected && compareYMD(ymd, selected) === 0;
              const isToday = compareYMD(ymd, todayYMD) === 0;
              const dis = isDisabled(ymd);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => selectDay(c.y, c.m, c.d)}
                  className={`h-8 w-8 rounded-lg text-sm mx-auto flex items-center justify-center transition ${
                    dis
                      ? 'text-slate-300 cursor-not-allowed'
                      : c.outside
                      ? 'text-slate-300 hover:bg-slate-100'
                      : 'text-slate-700 hover:bg-blue-50'
                  } ${isSelected ? '!bg-blue-600 !text-white font-semibold' : ''} ${
                    isToday && !isSelected ? 'ring-1 ring-blue-400' : ''
                  }`}
                >
                  {c.d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
