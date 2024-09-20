import React, { useEffect, useState } from 'react';
import { getSensors, createSensor, getDevices } from '../api/api';
import DataTable from '../components/DataTable';
import { Sensor, SensorCreate, Device } from '../types';

const Sensors: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [newSensor, setNewSensor] = useState<Omit<SensorCreate, 'sensor_id'>>({
    device_id: 0,
    name: '',
  });

  useEffect(() => {
    fetchSensors();
    fetchDevices();
  }, []);

  async function fetchSensors() {
    const sensorsData = await getSensors();
    setSensors(sensorsData);
  }

  async function fetchDevices() {
    const devicesData = await getDevices();
    setDevices(devicesData);
  }

  async function handleCreateSensor(e: React.FormEvent) {
    e.preventDefault();
    await createSensor(newSensor);
    setNewSensor({ device_id: 0, name: '' });
    fetchSensors();
  }

  const sensorColumns = [
    { Header: 'Sensor ID', accessor: 'sensor_id' },
    { Header: 'Name', accessor: 'name' },
    { Header: 'Device ID', accessor: 'device.device_id' },
    {
      Header: 'Threshold',
      accessor: 'threshold',
      Cell: (row: Sensor) =>
        row.threshold
          ? `${row.threshold.min_moisture} - ${row.threshold.max_moisture}`
          : 'Not Set',
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: () => (
        <button className="text-blue-600 hover:underline">Set Threshold</button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Sensors</h1>
      <form className="mb-4" onSubmit={handleCreateSensor}>
        <div className="flex space-x-2">
          <select
            value={newSensor.device_id}
            onChange={(e) =>
              setNewSensor({ ...newSensor, device_id: Number(e.target.value) })
            }
            className="border p-2 flex-1"
            required
          >
            <option value="">Select Device</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Name"
            value={newSensor.name}
            onChange={(e) =>
              setNewSensor({ ...newSensor, name: e.target.value })
            }
            className="border p-2 flex-1"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add Sensor
          </button>
        </div>
      </form>
      <DataTable columns={sensorColumns} data={sensors} />
    </div>
  );
};

export default Sensors;
