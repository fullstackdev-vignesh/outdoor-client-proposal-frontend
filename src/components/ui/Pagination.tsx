import { ChevronLeft, ChevronRight } from 'lucide-react';
import Loader from './Loader';

export default function Pagination({
  page,
  pages,
  total,
  loading = false,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  loading?: boolean;
  onChange: (page: number) => void;
}) {
  if (pages <= 1 && !loading) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-slate-500">
          Page {page} of {pages} &middot; {total} records
        </span>
        {loading && <Loader size="sm" className="py-0 my-0 scale-75" />}
      </div>
      <div className="flex gap-1">
        <button
          disabled={page <= 1 || loading}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          disabled={page >= pages || loading}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
