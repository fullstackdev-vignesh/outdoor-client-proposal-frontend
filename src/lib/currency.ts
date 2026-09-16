// Indian Rupee display formatting (lakhs/crores grouping), e.g. 1250000 -> "₹12,50,000".
// The DB/API always store/accept plain numbers — this is display-only.
export function formatINR(value: number | string | null | undefined) {
  const n = Number(value);
  if (!isFinite(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

// Strips ₹/commas/whitespace from a display string back down to a plain numeric string,
// suitable for parsing with Number(...) before sending to the API. Returns '' for empty
// or non-numeric input so callers can treat it the same as an untouched field.
export function parseINRInput(value: string): string {
  const cleaned = value.replace(/[₹,\s]/g, '');
  if (cleaned === '') return '';
  return isNaN(Number(cleaned)) ? '' : cleaned;
}
