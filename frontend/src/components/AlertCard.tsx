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
      className={`border p-4 rounded mb-2 ${
        alert.read ? 'bg-gray-100' : 'bg-red-100'
      }`}
    >
      <div className="flex items-center">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2" />
        <div className="flex-1">
          <div className="font-bold">{alert.message}</div>
          <div className="text-sm text-gray-600">
            {new Date(alert.timestamp).toLocaleString()}
          </div>
        </div>
        {!alert.read && (
          <button
            onClick={() => onMarkAsRead(alert.id)}
            className="text-blue-600 hover:underline"
          >
            Mark as Read
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
