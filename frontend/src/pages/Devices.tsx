import React, { useEffect, useState } from 'react';
import { getDevices, createDevice } from '../api/api';
import DataTable from '../components/DataTable';
import DeviceSetupInstructions from '../components/DeviceSetupInstructions';
import { Device, DeviceCreate } from '../types';

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

  const deviceColumns = [
    { Header: 'Device ID', accessor: 'device_id' },
    { Header: 'Name', accessor: 'name' },
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