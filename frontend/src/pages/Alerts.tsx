import React, { useEffect, useState } from 'react';
import { getAlerts, markAlertAsRead } from '../api/api';
import AlertCard from '../components/AlertCard';
import { Alert } from '../types';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Alerts</h1>
      {alerts.length > 0 ? (
        alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onMarkAsRead={handleMarkAsRead}
          />
        ))
      ) : (
        <p>No alerts.</p>
      )}
    </div>
  );
};

export default Alerts;
