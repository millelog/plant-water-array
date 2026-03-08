import React, { useEffect, useState } from 'react';
import { getDevices, createDevice } from '../api/api';
import DataTable from '../components/DataTable';
import DeviceSetupInstructions from '../components/DeviceSetupInstructions';
import { Device, DeviceCreate } from '../types';

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
  const [newDevice, setNewDevice] = useState<DeviceCreate>({
    name: '',
    device_id: '',
  });
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    const devicesData = await getDevices();
    setDevices(devicesData);
  }

  async function handleCreateDevice(e: React.FormEvent) {
    e.preventDefault();
    console.log('Submitting new device:', newDevice);
    await createDevice(newDevice);
    setNewDevice({ name: '', device_id: '' });
    fetchDevices();
  }

  function isOnline(lastSeen?: string): boolean {
    if (!lastSeen) return false;
    const now = new Date();
    const seen = new Date(lastSeen);
    return (now.getTime() - seen.getTime()) < 5 * 60 * 1000; // 5 minutes
  }

  const deviceColumns = [
    { Header: 'Device ID', accessor: 'device_id' },
    { Header: 'Name', accessor: 'name' },
    {
      Header: 'Status',
      accessor: 'last_seen',
      Cell: ({ value }: { value: string | undefined }) => {
        const online = isOnline(value);
        return (
          <span className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
            {online ? 'Online' : 'Offline'}
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
      Cell: () => (
        <button className="text-blue-600 hover:underline">View Sensors</button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Devices</h1>
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        {showInstructions ? 'Hide' : 'Show'} Setup Instructions
      </button>
      {showInstructions && <DeviceSetupInstructions />}
      <form className="mb-4" onSubmit={handleCreateDevice}>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Device ID"
            value={newDevice.device_id}
            onChange={(e) =>
              setNewDevice({ ...newDevice, device_id: e.target.value })
            }
            className="border p-2 flex-1"
            required
          />
          <input
            type="text"
            placeholder="Name"
            value={newDevice.name}
            onChange={(e) =>
              setNewDevice({ ...newDevice, name: e.target.value })
            }
            className="border p-2 flex-1"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add Device
          </button>
        </div>
      </form>
      <DataTable columns={deviceColumns} data={devices} />
    </div>
  );
};

export default Devices;
