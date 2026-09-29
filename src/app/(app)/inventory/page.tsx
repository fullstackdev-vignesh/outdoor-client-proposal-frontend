'use client';

// import { useState } from 'react';
import InventoryLiveTab from './InventoryLiveTab';
// Inventory Timeline tab is hidden for now — uncomment this import, the tab state and the
// tab bar below to bring it back.
// import InventoryTimelineTab from './InventoryTimelineTab';

export default function InventoryPage() {
  // const [tab, setTab] = useState<'inventory' | 'timeline'>('inventory');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Inventory Management</h1>
        <p className="text-sm text-slate-500">
          Bulk manage media status across all sites
          {/* {tab === 'inventory' ? 'Bulk manage media status across all sites' : 'Read-only history of every status change and period'} */}
        </p>
      </div>

      {/* <div className="flex gap-2 border-b border-slate-200">
        {(['inventory', 'timeline'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === t ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'inventory' ? 'Inventory' : 'Inventory Timeline'}
          </button>
        ))}
      </div> */}

      <InventoryLiveTab />
      {/* {tab === 'inventory' ? <InventoryLiveTab /> : <InventoryTimelineTab />} */}
    </div>
  );
}
