// src/components/orders/StatusTabs.js
'use client';

import { ORDER_STATUS, STATUS_TABS } from '@/lib/constants/orderStatus';

export default function StatusTabs({ currentStatus, onStatusChange, counts = {} }) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_TABS.map((tab) => {
        const isActive = currentStatus === tab.key;
        const count = counts[tab.key] || 0;
        const statusConfig = ORDER_STATUS[tab.key];
        
        return (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all border
              ${isActive 
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }
            `}
          >
            {statusConfig?.icon && (
              <statusConfig.icon className={`w-4 h-4 ${isActive ? 'text-white' : statusConfig.badgeText}`} />
            )}
            <span>{tab.label}</span>
            {count > 0 && (
              <span className={`
                px-1.5 py-0.5 rounded-full text-xs font-semibold
                ${isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}