import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
      <span className="text-slate-500">
        Page {page} of {pages} &middot; {total} records
      </span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
