import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullPage?: boolean;
  // Covers the whole screen (fixed, centred on the viewport) instead of sitting inside the
  // list/table it was rendered in — used for page and filter loads.
  overlay?: boolean;
}

export default function Loader({ size = 'md', text, className = '', fullPage = false, overlay = false }: LoaderProps) {
  const sizeClass = size === 'sm' ? 'loader-sm' : size === 'lg' ? 'loader-lg' : '';
  const heightClass = fullPage ? 'min-h-[70vh]' : 'min-h-[220px]';

  const content = (
    <>
      <div className={`loader-wrapper ${sizeClass}`}>
        <div className="loader">
          <div className="insides"></div>
        </div>
      </div>
      {text && <p className="text-xs font-semibold text-slate-700 tracking-wide mt-4 text-center">{text}</p>}
    </>
  );

  if (overlay) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`w-full ${heightClass} flex flex-col items-center justify-center my-auto mx-auto p-4 ${className}`}>
      {content}
    </div>
  );
}
