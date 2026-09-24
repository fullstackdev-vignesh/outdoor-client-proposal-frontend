'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { UploadCloud, Download, FileCheck2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { Panel } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { StateSelect } from '@/components/ui/StateCitySelect';

// Maps every accepted spreadsheet header (case/space-insensitive) to our canonical Site field.
// Supports both the current Add/Edit Site field names and the older template's legacy names.
const COLUMN_ALIASES: Record<string, string> = {
  mediacode: 'mediaId',
  mediaid: 'mediaId',
  medianame: 'mediaName',
  mediatype: 'mediaType',
  quantity: 'quantity',
  autosize: 'autoSize',
  state: 'state',
  city: 'city',
  location: 'location',
  areaname: 'areaName',
  locationdetails: 'locationDetails',
  latitude: 'latitude',
  longitude: 'longitude',
  illumination: 'illumination',
  width: 'width',
  height: 'height',
  sizeunit: 'sizeUnit',
  unit: 'sizeUnit',
  displaycostpermonth: 'monthlyAmount',
  monthlyamount: 'monthlyAmount',
  printingcost: 'printingCost',
  printingcos: 'printingCost',
  mountingcost: 'mountingCost',
  amount: 'amount',
  gstamount: 'gstAmount',
  mediaimage: 'mediaImage',
  medialimage: 'mediaImage',
  image: 'mediaImage',
  siteowner: 'siteOwner',
  mediastatus: 'mediaStatus',
};

// Columns we intentionally ignore: SrNo, Specification, Size, TotalCost (auto-calculated server-side).
const IGNORED_COLUMNS = new Set(['srno', 'specification', 'size', 'totalcost']);

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[\s_-]/g, '');
}

function mapRow(row: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const norm = normalizeKey(rawKey);
    if (IGNORED_COLUMNS.has(norm)) continue;
    const field = COLUMN_ALIASES[norm];
    if (field) mapped[field] = value;
  }
  return mapped;
}

// Latitude/Longitude are optional — an empty cell or a placeholder like "-", "NA", "N/A" means
// "not given". Besides plain decimals, common spreadsheet formats are understood: a comma
// decimal ("13,0536"), a direction letter ("13.0536 N", "80.25E", S/W make it negative) and
// degrees-minutes-seconds ("13°03'13.0\"N"). Returns undefined for "not given", NaN for a value
// that was given but can't be read, otherwise the parsed number.
const EMPTY_COORD_VALUES = new Set(['', '-', '--', 'na', 'n/a', 'nil', 'null', 'none', 'nan', '0']);
function parseCoord(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value === 0 ? undefined : value;
  let text = String(value).trim();
  if (EMPTY_COORD_VALUES.has(text.toLowerCase())) return undefined;

  let sign = 1;
  const dir = text.match(/[NSEW]$/i) || text.match(/^[NSEW]/i);
  if (dir) {
    if (/[SW]/i.test(dir[0])) sign = -1;
    text = text.replace(/^[NSEW]\s*|\s*[NSEW]$/gi, '');
  }

  // Degrees-minutes-seconds: 13°03'13.0"  /  13 03 13.0  /  13°03.22'
  const dms = text.match(/^(-?\d+(?:[.,]\d+)?)\s*[°º\s]\s*(\d+(?:[.,]\d+)?)?\s*['′]?\s*(\d+(?:[.,]\d+)?)?\s*["″]?$/);
  if (dms && (dms[2] || dms[3])) {
    const [deg, min, sec] = [dms[1], dms[2] || '0', dms[3] || '0'].map((p) => Number(p.replace(',', '.')));
    const abs = Math.abs(deg) + min / 60 + sec / 3600;
    return sign * (deg < 0 ? -abs : abs);
  }

  text = text.replace(/[°º]/g, '').replace(',', '.').trim();
  return text === '' ? undefined : sign * Number(text);
}
// A coordinate that can't be used never blocks the row — the site just imports without it.
function coordWarning(value: unknown, limit: number): string | null {
  const n = parseCoord(value);
  if (n === undefined) return null;
  if (isNaN(n)) return `"${value}" is not a valid coordinate — will import without it`;
  if (n < -limit || n > limit) return `"${value}" is outside -${limit}…${limit} — will import without it`;
  return null;
}
function usableCoord(value: unknown, limit: number): number | undefined {
  return coordWarning(value, limit) ? undefined : parseCoord(value);
}

const REQUIRED_FIELDS = ['mediaId', 'mediaType', 'city'];
const SAMPLE_HEADERS = [
  'MediaCode', 'MediaType', 'City', 'AreaName', 'Location', 'Quantity',
  'Width', 'Height', 'Illumination', 'DisplayCostPerMonth', 'PrintingCost', 'MountingCost',
  'Latitude', 'Longitude', 'SiteOwner', 'MediaImage',
];

interface ValidationError {
  row: number;
  field: string;
  error: string;
  // Warnings are shown but don't make the row invalid.
  warning?: boolean;
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [defaultState, setDefaultState] = useState('');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  function downloadSample() {
    const ws = XLSX.utils.json_to_sheet([
      {
        SrNo:1,Mediacode: 'ADINCHN0001', mediaType: 'Unipole',state: 'Tamil Nadu', city: 'Chennai', areaName: 'Gemini Flyover',
        location: 'Gemini flyover twds Cathedral rd / Marina Beach (Top)', sizeUnit: 1, width: 40, height: 25,autoSize:'40x20',
        illumination: 'Front Lit',Size:1000, monthlyAmount: 600000, printingCos: 13000, mountingCost: 5000,totalCost: 618000,
        latitude: 13.0536, longitude: 80.2502, SiteOwner: 'Adinn', MediaImage: '',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sites');
    XLSX.writeFile(wb, 'outdoor-sites-sample.xlsx');
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'binary' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      validate(rows.map(mapRow));
    };
    reader.readAsBinaryString(file);
  }

  function validate(rows: Record<string, any>[]) {
    const errs: ValidationError[] = [];
    const seenIds = new Set<string>();
    const dupes: string[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // account for header row
      REQUIRED_FIELDS.forEach((field) => {
        if (!row[field] || String(row[field]).trim() === '') {
          errs.push({ row: rowNum, field, error: 'Required' });
        }
      });
      if (!row.state && !defaultState) {
        errs.push({ row: rowNum, field: 'state', error: 'Required (select a default State above, or add a State column)' });
      }
      const latWarning = coordWarning(row.latitude, 90);
      const lngWarning = coordWarning(row.longitude, 180);
      if (latWarning) errs.push({ row: rowNum, field: 'latitude', error: latWarning, warning: true });
      if (lngWarning) errs.push({ row: rowNum, field: 'longitude', error: lngWarning, warning: true });
      if (row.width !== undefined && row.width !== '' && Number(row.width) <= 0) errs.push({ row: rowNum, field: 'width', error: 'Must be > 0' });
      if (row.height !== undefined && row.height !== '' && Number(row.height) <= 0) errs.push({ row: rowNum, field: 'height', error: 'Must be > 0' });
      if (row.mediaId) {
        if (seenIds.has(row.mediaId)) {
          errs.push({ row: rowNum, field: 'mediaId', error: 'Duplicate' });
          dupes.push(row.mediaId);
        }
        seenIds.add(row.mediaId);
      }
    });

    setRawRows(rows);
    setErrors(errs);
    setDuplicates(dupes);
    setImported(null);
  }

  useEffect(() => {
    if (rawRows.length > 0) validate(rawRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultState]);

  const invalidRows = new Set(errors.filter((e) => !e.warning).map((e) => e.row));
  const validCount = rawRows.length - invalidRows.size;

  async function importValid() {
    setImporting(true);
    try {
      const validRecords = rawRows
        .filter((_, idx) => !invalidRows.has(idx + 2))
        .map((r) => ({
          mediaId: r.mediaId,
          mediaType: r.mediaType,
          quantity: r.quantity ? Number(r.quantity) : undefined,
          state: r.state || defaultState,
          city: r.city,
          location: r.location,
          areaName: r.areaName,
          locationDetails: r.locationDetails,
          latitude: usableCoord(r.latitude, 90),
          longitude: usableCoord(r.longitude, 180),
          illumination: r.illumination,
          width: r.width ? Number(r.width) : undefined,
          height: r.height ? Number(r.height) : undefined,
          amount: r.amount ? Number(r.amount) : undefined,
          gstAmount: r.gstAmount ? Number(r.gstAmount) : undefined,
          monthlyAmount: r.monthlyAmount ? Number(r.monthlyAmount) : undefined,
          printingCost: r.printingCost ? Number(r.printingCost) : undefined,
          mountingCost: r.mountingCost ? Number(r.mountingCost) : undefined,
          siteOwner: r.siteOwner || undefined,
          mediaImage: r.mediaImage || undefined,
          mediaStatus: r.mediaStatus || 'available',
        }));
      const { data } = await api.post('/sites/bulk-import', { records: validRecords });
      setImported(data.imported);
      showToast(`${data.imported} sites imported successfully`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Bulk import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bulk Site Upload</h1>
        <p className="text-sm text-slate-500">Onboard 5,000+ sites at once via Excel</p>
      </div>

      {/* <Panel title="Default State">
        <p className="text-xs text-slate-500 mb-2">
          Used for every row unless the sheet itself has a State column.
        </p>
        <StateSelect value={defaultState} onChange={setDefaultState} className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </Panel> */}

      <Panel>
        <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl py-10 text-center hover:border-blue-400 transition">
          <UploadCloud className="h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-600">Drag & Drop Excel File Here</p>
          <div className="flex gap-2">
            <label className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-blue-700">
              Choose File
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            <button
              onClick={downloadSample}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Download Sample Excel
            </button>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">Accepted columns: {SAMPLE_HEADERS.join(', ')}</p>
        </div>
      </Panel>

      {rawRows.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatBox label="Total Records" value={rawRows.length} />
            <StatBox label="Valid Records" value={validCount} accent="emerald" />
            <StatBox label="Invalid Records" value={invalidRows.size} accent="red" />
            <StatBox label="Duplicate Records" value={new Set(duplicates).size} accent="amber" />
          </div>

          {errors.length > 0 && (
            <Panel title="Validation Errors & Warnings">
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="pb-2 pr-4">Row</th>
                      <th className="pb-2 pr-4">Field</th>
                      <th className="pb-2">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {errors.map((e, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-4">{e.row}</td>
                        <td className="py-1.5 pr-4">{e.field}</td>
                        <td className={`py-1.5 ${e.warning ? 'text-amber-600' : 'text-red-600'}`}>
                          {e.warning ? 'Warning: ' : ''}
                          {e.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {imported !== null ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              <FileCheck2 className="h-4 w-4" /> {imported} records imported successfully.
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRawRows([]);
                  setErrors([]);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={validCount === 0 || importing}
                onClick={importValid}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${validCount} Valid Records`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'red' | 'amber' }) {
  const colors = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
  } as const;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${accent ? colors[accent] : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
