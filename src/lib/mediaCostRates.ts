// Printing / Mounting cost calculation — used by the site form to fill Printing Cost and Mounting
// Cost automatically (both stay editable). The rates come from the Rate Master (GET /media-rates).
//
//   printing  — rate per Sq.Ft: printingBackLit for Back Lit sites, printingOther for Front Lit / Non Lit
//   mounting  — perSqFt: rate × Sq.Ft · fixed: flat amount · perQuantity: amount per unit
//
// Sq.Ft = Width × Height. Every cost is for ONE unit and is multiplied by Quantity — Printing
// (rate × Sq.Ft × Qty) and Mounting (rate × Sq.Ft × Qty, fixed × Qty, or amount × Qty).

export type MountingType = 'perSqFt' | 'fixed' | 'perQuantity';

export interface MediaRate {
  _id: string;
  mediaType: string;
  printingBackLit: number;
  printingOther: number;
  mountingType: MountingType;
  mountingAmount: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: { name?: string } | string | null;
}

export const MOUNTING_TYPE_LABELS: Record<MountingType, string> = {
  perSqFt: 'Per Sq.Ft',
  fixed: 'Fixed',
  perQuantity: 'Per Quantity',
};

/**
 * Printing and Mounting cost for a site, or null when its Media Type has no rate in the Rate Master
 * or the size isn't filled in yet — the form then leaves both fields as they are.
 */
export function calcMediaCosts(
  {
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
  },
  rates: MediaRate[]
): { printingCost: number; mountingCost: number } | null {
  const key = (mediaType || '').trim().toLowerCase();
  const rate = key ? rates.find((r) => r.mediaType.trim().toLowerCase() === key) : undefined;
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const qty = Number(quantity) || 1;
  if (!rate || w <= 0 || h <= 0) return null;
  const sqFt = w * h;

  const backLit = /back\s*-?\s*lit/i.test(illumination || '');
  const printingPerSqFt = (backLit ? rate.printingBackLit : rate.printingOther) || 0;

  const amount = rate.mountingAmount || 0;
  const mountingPerUnit = rate.mountingType === 'perSqFt' ? amount * sqFt : amount;

  return { printingCost: Math.round(printingPerSqFt * sqFt * qty), mountingCost: Math.round(mountingPerUnit * qty) };
}
