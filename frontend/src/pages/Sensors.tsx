import React, { useEffect, useState, useCallback } from 'react';
import { getSensors, createSensor, getDevices } from '../api/api';
import DataTable from '../components/DataTable';
import { Sensor, SensorCreate, Device } from '../types';
import { useSearchParams } from 'react-router-dom';

const Sensors: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [newSensor, setNewSensor] = useState<SensorCreate>({
    device_id: 0,
    sensor_id: 0,
    name: '',
  });
  const [searchParams] = useSearchParams();

  const fetchData = useCallback(async () => {
    const deviceId = searchParams.get('deviceId');
    const [sensorsData, devicesData] = await Promise.all([
      getSensors(deviceId || undefined),
      getDevices()
    ]);
    setSensors(sensorsData);
    setDevices(devicesData);
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateSensor(e: React.FormEvent) {
    e.preventDefault();
    if (newSensor.name) {
      await createSensor({
        device_id: newSensor.device_id,
        sensor_id: newSensor.sensor_id,
        name: newSensor.name
      });
      setNewSensor({ device_id: 0, sensor_id: 0, name: '' });
      fetchData();
    } else {
      console.error('Sensor name is required');
    }
  }

  const sensorColumns = [
    { Header: 'Sensor ID', accessor: 'sensor_id' },
    { Header: 'Device ID', accessor: 'device.device_id' },
    { Header: 'Device Name', accessor: 'device.name' },
    { Header: 'Sensor Name', accessor: 'name' }, // Changed this line
    {
      Header: 'Threshold',
      accessor: 'threshold',
      Cell: ({ value }: { value: Sensor['threshold'] }) =>
        value
          ? `${value.min_moisture ?? 'N/A'} - ${value.max_moisture ?? 'N/A'}`
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
            value={newSensor.device_id || ''}
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
            type="number"
            placeholder="Sensor ID"
            value={newSensor.sensor_id || ''}
            onChange={(e) =>
              setNewSensor({ ...newSensor, sensor_id: Number(e.target.value) })
            }
            className="border p-2 flex-1"
            required
          />
          <input
            type="text"
            placeholder="Name"
            value={newSensor.name || ''}
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