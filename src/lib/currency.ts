// Indian Rupee display formatting (lakhs/crores grouping), e.g. 1250000 -> "₹12,50,000".
// The DB/API always store/accept plain numbers — this is display-only.
export function formatINR(value: number | string | null | undefined) {
  const n = Number(value);
  if (!isFinite(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// Indian comma-grouping applied to a raw digit string as the user types (no currency symbol,
// no rounding/reformatting of decimals) so the field never fights the cursor with a forced ₹
// or forced ".00" while still in focus. Non-numeric input is returned unchanged.
export function formatIndianGroups(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = intPart.replace('-', '').replace(/\D/g, '');
  if (!digits) return raw;
  const lastThree = digits.length > 3 ? digits.slice(-3) : digits;
  const other = digits.length > 3 ? digits.slice(0, -3) : '';
  const grouped = other ? `${other.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree;
  return `${sign}${grouped}${decPart !== undefined ? '.' + decPart : ''}`;
}

// Strips ₹/commas/whitespace from a display string back down to a plain numeric string,
// suitable for parsing with Number(...) before sending to the API.
// Also converts shorthand multipliers like 'k'/'K' (thousands), 'l'/'L'/'lakh' (lakhs),
// and 'cr'/'CR'/'crore' (crores) so expressions like "52k", "2k", "3k" expand correctly.
export function parseINRInput(value: string): string {
  if (!value) return '';
  const cleaned = value.replace(/[₹,\s]/g, '').trim();
  if (cleaned === '') return '';

  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([kKlL]|lakhs?|crores?|cr)?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    if (isNaN(num)) return '';
    const unit = (match[2] || '').toLowerCase();
    let multiplier = 1;
    if (unit === 'k') {
      multiplier = 1000;
    } else if (unit === 'l' || unit.startsWith('lakh')) {
      multiplier = 100000;
    } else if (unit === 'cr' || unit.startsWith('crore')) {
      multiplier = 10000000;
    }
    const result = Math.round((num * multiplier + Number.EPSILON) * 100) / 100;
    return String(result);
  }

  return isNaN(Number(cleaned)) ? '' : cleaned;
}
