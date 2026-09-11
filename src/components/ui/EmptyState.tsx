import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No records found', subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
