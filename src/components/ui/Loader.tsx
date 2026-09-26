import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullPage?: boolean;
}

export default function Loader({ size = 'md', text, className = '', fullPage = false }: LoaderProps) {
  const sizeClass = size === 'sm' ? 'loader-sm' : size === 'lg' ? 'loader-lg' : '';
  const heightClass = fullPage ? 'min-h-[70vh]' : 'min-h-[220px]';

  return (
    <div className={`w-full ${heightClass} flex flex-col items-center justify-center my-auto mx-auto p-4 ${className}`}>
      <div className={`loader-wrapper ${sizeClass}`}>
        <div className="loader">
          <div className="insides"></div>
        </div>
      </div>
      {text && <p className="text-xs font-semibold text-slate-700 tracking-wide mt-4 text-center">{text}</p>}
    </div>
  );
}