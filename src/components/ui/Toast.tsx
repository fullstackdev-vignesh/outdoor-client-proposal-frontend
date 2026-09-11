'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-lg text-sm min-w-[260px] max-w-sm bg-white ${
              t.type === 'success' ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            )}
            <span className="flex-1 text-slate-700">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
