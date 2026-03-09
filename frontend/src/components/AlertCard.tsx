import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { Alert } from '../types';

interface AlertCardProps {
  alert: Alert;
  onMarkAsRead: (alertId: number) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onMarkAsRead }) => {
  return (
    <div
      className={`card p-4 mb-3 transition-all duration-200 ${
        alert.read
          ? 'opacity-60'
          : 'border-danger/20 bg-danger-glow shadow-[0_0_16px_rgba(248,113,113,0.06)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          alert.read ? 'bg-canvas-200' : 'bg-danger/10'
        }`}>
          <ExclamationTriangleIcon className={`w-4 h-4 ${
            alert.read ? 'text-text-muted' : 'text-danger'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${alert.read ? 'text-text-secondary' : 'text-text'}`}>
            {alert.message}
          </div>
          <div className="text-xs text-text-muted font-mono mt-1">
            {new Date(alert.timestamp).toLocaleString()}
          </div>
        </div>
        {!alert.read && (
          <button
            onClick={() => onMarkAsRead(alert.id)}
            className="btn-ghost text-xs flex-shrink-0"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
