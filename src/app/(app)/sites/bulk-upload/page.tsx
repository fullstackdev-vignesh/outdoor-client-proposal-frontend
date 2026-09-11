'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { UploadCloud, Download, FileCheck2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { Panel } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

const REQUIRED_FIELDS = ['mediaId', 'mediaName', 'mediaType', 'state', 'city'];
const SAMPLE_HEADERS = [
  'mediaId', 'mediaName', 'mediaType', 'state', 'city', 'location',
  'latitude', 'longitude', 'width', 'height', 'amount', 'gstAmount', 'monthlyAmount', 'mediaStatus',
];

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  function downloadSample() {
    const ws = XLSX.utils.json_to_sheet([
      {
        mediaId: 'MEDIA-1001', mediaName: 'Sample Hoarding', mediaType: 'Hoarding', state: 'Maharashtra',
        city: 'Mumbai', location: 'Highway Junction', latitude: 19.07, longitude: 72.87, width: 20, height: 10,
        amount: 50000, gstAmount: 9000, monthlyAmount: 50000, mediaStatus: 'available',
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
      validate(rows);
    };
    reader.readAsBinaryString(file);
  }

  function validate(rows: any[]) {
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
      if (row.latitude && isNaN(Number(row.latitude))) errs.push({ row: rowNum, field: 'latitude', error: 'Invalid' });
      if (row.longitude && isNaN(Number(row.longitude))) errs.push({ row: rowNum, field: 'longitude', error: 'Invalid' });
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

  const invalidRows = new Set(errors.map((e) => e.row));
  const validCount = rawRows.length - invalidRows.size;

  async function importValid() {
    setImporting(true);
    try {
      const validRecords = rawRows
        .filter((_, idx) => !invalidRows.has(idx + 2))
        .map((r) => ({
          mediaId: r.mediaId,
          mediaName: r.mediaName,
          mediaType: r.mediaType,
          state: r.state,
          city: r.city,
          location: r.location,
          latitude: r.latitude ? Number(r.latitude) : undefined,
          longitude: r.longitude ? Number(r.longitude) : undefined,
          width: r.width ? Number(r.width) : undefined,
          height: r.height ? Number(r.height) : undefined,
          amount: r.amount ? Number(r.amount) : undefined,
          gstAmount: r.gstAmount ? Number(r.gstAmount) : undefined,
          monthlyAmount: r.monthlyAmount ? Number(r.monthlyAmount) : undefined,
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
          <p className="text-xs text-slate-400">Columns: {SAMPLE_HEADERS.join(', ')}</p>
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
            <Panel title="Validation Errors">
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
                        <td className="py-1.5 text-red-600">{e.error}</td>
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
