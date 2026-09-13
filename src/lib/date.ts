const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Backend timestamps are pre-shifted by +5:30 (IST) before being stored, so we must
// render their raw UTC components (not convert to the viewer's local timezone) to
// avoid double-applying the IST offset.
// Canonical app-wide format: "13/Sep/2026, 11:20 am"
export function formatIST(value?: string | Date) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
}

// For a genuinely "right now" client-side moment (not a backend-shifted value) — same
// day/mon/year style, using the browser's own local date components.
export function formatLocalDate(date: Date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatISTDate(value?: string | Date) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
