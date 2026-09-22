'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { fileBaseURL } from '@/lib/api';

function resolveImageUrl(image?: string) {
  if (!image) return '';
  return /^(https?:|data:|blob:)/.test(image) ? image : `${fileBaseURL}${image}`;
}

export default function MediaPreviewModal({
  open,
  onClose,
  image,
  mediaCode,
  mediaType,
  location,
  area,
  city,
  state,
  size,
}: {
  open: boolean;
  onClose: () => void;
  image?: string;
  mediaCode?: string;
  mediaType?: string;
  location?: string;
  // Optional — when a caller passes these, they're shown as their own separate fields instead
  // of relying on `location` being pre-combined into one string. Existing callers that only pass
  // `location` are unaffected.
  area?: string;
  city?: string;
  state?: string;
  size?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(image);

  return (
    <Modal open={open} onClose={onClose} title={`Media Preview — ${mediaCode || ''}`} size="lg">
      <div className="space-y-3">
        {src && !failed ? (
          <img
            src={src}
            alt={mediaCode || 'Media preview'}
            className="w-full max-h-[60vh] object-contain rounded-lg border border-slate-200 bg-slate-50"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="w-full h-64 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
            <ImageOff className="h-8 w-8" />
            <span className="text-sm">No image available</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">MediaCode</p>
            <p className="font-semibold text-slate-800">{mediaCode || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Media Type</p>
            <p className="font-semibold text-slate-800">{mediaType || '-'}</p>
          </div>
          {location && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Location</p>
              <p className="font-semibold text-slate-800">{location}</p>
            </div>
          )}
          {size && (
            <div>
              <p className="text-xs text-slate-400">Size</p>
              <p className="font-semibold text-slate-800">{size}</p>
            </div>
          )}
          {area && (
            <div>
              <p className="text-xs text-slate-400">Area</p>
              <p className="font-semibold text-slate-800">{area}</p>
            </div>
          )}
          {city && (
            <div>
              <p className="text-xs text-slate-400">City</p>
              <p className="font-semibold text-slate-800">{city}</p>
            </div>
          )}
          {state && (
            <div>
              <p className="text-xs text-slate-400">State</p>
              <p className="font-semibold text-slate-800">{state}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
