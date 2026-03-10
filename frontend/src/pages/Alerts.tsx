import React, { useEffect, useState } from 'react';
import { getAlerts, markAlertAsRead } from '../api/api';
import AlertCard from '../components/AlertCard';
import { Alert } from '../types';
import { useAuth } from '../context/AuthContext';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { isDemo } = useAuth();

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    const alertsData = await getAlerts();
    setAlerts(alertsData);
  }

  async function handleMarkAsRead(alertId: number) {
    await markAlertAsRead(alertId);
    fetchAlerts();
  }

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {unreadCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="badge bg-danger-glow text-danger border border-danger/20">
            {unreadCount} unread
          </span>
        </div>
      )}

      {alerts.length > 0 ? (
        <div className="space-y-1">
          {alerts.map((alert, i) => (
            <div key={alert.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-slide-up">
              <AlertCard alert={alert} onMarkAsRead={isDemo ? undefined : handleMarkAsRead} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <div className="text-text-muted text-sm">No alerts. All systems nominal.</div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
