import React, { useEffect, useState } from 'react';
import { getDevices, getAlerts } from '../api/api';
import DataTable from '../components/DataTable';
import AlertCard from '../components/AlertCard';
import { Device, Alert } from '../types';

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    async function fetchData() {
      const devicesData = await getDevices();
      setDevices(devicesData);
      const alertsData = await getAlerts({ limit: 5 });
      setAlerts(alertsData);
    }
    fetchData();
  }, []);

  const deviceColumns = [
    { Header: 'Device ID', accessor: 'device_id' },
    { Header: 'Name', accessor: 'name' },
    {
      Header: 'Sensors',
      accessor: 'sensors',
      Cell: (row: Device) => row.sensors.length,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <h2 className="text-xl font-semibold mb-2">Recent Alerts</h2>
      {alerts.length > 0 ? (
        alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onMarkAsRead={() => {}} />
        ))
      ) : (
        <p>No recent alerts.</p>
      )}

      <h2 className="text-xl font-semibold mt-6 mb-2">Devices</h2>
      <DataTable columns={deviceColumns} data={devices} />
    </div>
  );
};

export default Dashboard;
