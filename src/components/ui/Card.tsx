import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
}: {
  label: string;
  value: string | number;
  icon: any;
  accent?: 'blue' | 'emerald' | 'red' | 'amber' | 'slate';
}) {
  const accents: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accents[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {title && (
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
