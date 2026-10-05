// Printing / Mounting cost rates per Media Type — used by the site form to fill Printing Cost and
// Mounting Cost automatically (both are read-only in the form). Source: the media cost rate sheet.
//
//   printing  — rate per Sq.Ft: one rate for every illumination, or a Back Lit rate and a rate
//               for everything else (Front Lit / Non Lit)
//   mounting  — perSqFt: rate per Sq.Ft · fixed: flat amount · perQuantity: amount × Quantity
//
// Sq.Ft = Width × Height × Quantity.

type PrintingRate = number | { backLit: number; other: number };
type MountingRate = { perSqFt: number } | { fixed: number } | { perQuantity: number };

const LIT_PRINTING = { backLit: 25, other: 13 };

const RATES: Record<string, { printing: PrintingRate; mounting: MountingRate }> = {
  'ROB': { printing: LIT_PRINTING, mounting: { fixed: 10000 } },
  'Pole Kiosk': { printing: LIT_PRINTING, mounting: { perQuantity: 300 } },
  'Bus Shelter': { printing: LIT_PRINTING, mounting: { fixed: 2000 } },
  'Signal Post': { printing: LIT_PRINTING, mounting: { perSqFt: 20 } },
  'Branding Board': { printing: LIT_PRINTING, mounting: { perSqFt: 5 } },
  'Gantry': { printing: LIT_PRINTING, mounting: { fixed: 4000 } },
  'Police booth': { printing: LIT_PRINTING, mounting: { perSqFt: 15 } },
  'Lamp Post': { printing: LIT_PRINTING, mounting: { perQuantity: 300 } },
  'Center Median': { printing: LIT_PRINTING, mounting: { perQuantity: 300 } },
  'Top panels': { printing: LIT_PRINTING, mounting: { perSqFt: 5 } },
  'Police Umbrella': { printing: LIT_PRINTING, mounting: { perSqFt: 15 } },
  'Transformer': { printing: LIT_PRINTING, mounting: { perSqFt: 20 } },
  // Same printing cost for Front Lit and Non Lit.
  'Hoarding': { printing: 13, mounting: { perSqFt: 5 } },
  'Unipole': { printing: 13, mounting: { perSqFt: 7 } },
  'Wall Graphics': { printing: 13, mounting: { perSqFt: 5 } },
  'Wall Frame': { printing: 13, mounting: { perSqFt: 5 } },
  'LED Hoarding': { printing: 0, mounting: { perSqFt: 0 } },
  'LED': { printing: 0, mounting: { perSqFt: 0 } },
  'Wall Hoarding': { printing: 13, mounting: { perSqFt: 5 } },
  'Wall Wrap': { printing: 13, mounting: { perSqFt: 5 } },
};

const byKey = new Map(Object.entries(RATES).map(([name, rate]) => [name.trim().toLowerCase(), rate]));

/**
 * Printing and Mounting cost for a site, or null when its Media Type has no rate (e.g. Digital
 * Hoarding) or the size isn't filled in yet — the form then leaves both fields as they are.
 */
export function calcMediaCosts({
  mediaType,
  illumination,
  width,
  height,
  quantity,
}: {
  mediaType: string;
  illumination: string;
  width: string;
  height: string;
  quantity: string;
}): { printingCost: number; mountingCost: number } | null {
  const rate = byKey.get((mediaType || '').trim().toLowerCase());
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const qty = Number(quantity) || 1;
  if (!rate || w <= 0 || h <= 0) return null;
  const sqFt = w * h * qty;

  const backLit = /back\s*-?\s*lit/i.test(illumination || '');
  const printingPerSqFt = typeof rate.printing === 'number' ? rate.printing : backLit ? rate.printing.backLit : rate.printing.other;

  const m = rate.mounting;
  const mountingCost = 'fixed' in m ? m.fixed : 'perQuantity' in m ? m.perQuantity * qty : m.perSqFt * sqFt;

  return { printingCost: Math.round(printingPerSqFt * sqFt), mountingCost: Math.round(mountingCost) };
}
