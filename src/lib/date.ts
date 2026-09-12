// Backend timestamps are pre-shifted by +5:30 (IST) before being stored, so we must
// render their raw UTC components (not convert to the viewer's local timezone) to
// avoid double-applying the IST offset.
export function formatIST(value?: string | Date, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

export function formatISTDate(value?: string | Date) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
}
