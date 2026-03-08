import React, { useEffect, useState, useCallback } from 'react';
import { getDevices, deleteDevice } from '../api/api';
import DataTable from '../components/DataTable';
import DeviceSetupInstructions from '../components/DeviceSetupInstructions';
import { Device } from '../types';

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const Devices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);

  const fetchDevices = useCallback(async () => {
    const devicesData = await getDevices();
    setDevices(devicesData);
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  async function handleDeleteDevice(deviceId: string, deviceName: string) {
    if (!window.confirm(`Delete device "${deviceName}" (${deviceId})? This will remove all its sensors, readings, and alerts.`)) {
      return;
    }
    await deleteDevice(deviceId);
    fetchDevices();
  }

  function getStatus(lastSeen?: string): { label: string; colorClass: string } {
    if (!lastSeen) {
      return { label: 'Provisioning', colorClass: 'bg-amber-400' };
    }
    const now = new Date();
    const seen = new Date(lastSeen);
    const online = (now.getTime() - seen.getTime()) < 5 * 60 * 1000;
    if (online) {
      return { label: 'Online', colorClass: 'bg-green-500' };
    }
    return { label: 'Offline', colorClass: 'bg-gray-400' };
  }

  const deviceColumns = [
    { Header: 'Device ID', accessor: 'device_id' },
    { Header: 'Name', accessor: 'name' },
    {
      Header: 'Status',
      accessor: 'last_seen',
      Cell: ({ value }: { value: string | undefined }) => {
        const status = getStatus(value);
        return (
          <span className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.colorClass}`} />
            {status.label}
          </span>
        );
      },
    },
    {
      Header: 'Firmware',
      accessor: 'firmware_version',
      Cell: ({ value }: { value: string | undefined }) => value || '-',
    },
    {
      Header: 'IP Address',
      accessor: 'ip_address',
      Cell: ({ value }: { value: string | undefined }) => value ? <span className="font-mono text-sm">{value}</span> : '-',
    },
    {
      Header: 'Last Seen',
      accessor: 'last_seen_time',
      Cell: (_: { value: unknown }, row: Device) => row.last_seen ? timeAgo(row.last_seen) : 'Never',
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (_: { value: unknown }, row: Device) => (
        <div className="flex gap-2">
          <button className="text-blue-600 hover:underline">View Sensors</button>
          <button
            className="text-red-600 hover:underline"
            onClick={() => handleDeleteDevice(row.device_id, row.name)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Devices</h1>

      {devices.length === 0 ? (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center mb-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">No Devices Yet</h2>
            <p className="text-blue-700 mb-4">Follow the setup instructions below to provision your first ESP32 plant sensor.</p>
          </div>
          <DeviceSetupInstructions />
        </div>
      ) : (
        <>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
          >
            {showInstructions ? 'Hide' : 'Show'} Setup Instructions
          </button>
          {showInstructions && <DeviceSetupInstructions />}
          <DataTable columns={deviceColumns} data={devices} />
        </>
      )}
    </div>
  );
};

export default Devices;
