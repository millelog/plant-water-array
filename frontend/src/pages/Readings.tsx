import React, { useEffect, useState, useCallback } from 'react';
import { getReadings, getDevices, getSensors } from '../api/api';
import DataTable from '../components/DataTable';
import SensorReadingsGraph from '../components/SensorReadingsGraph';
import { Reading, Device, Sensor } from '../types';

const Readings: React.FC = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);

  const fetchDevices = useCallback(async () => {
    const devicesData = await getDevices();
    setDevices(devicesData);
  }, []);

  const fetchSensors = useCallback(async (deviceId: string) => {
    const sensorsData = await getSensors(deviceId);
    setSensors(sensorsData);
    setSelectedSensorId(null);
  }, []);

  const fetchReadings = useCallback(async () => {
    if (selectedDeviceId && selectedSensorId !== null) {
      const readingsData = await getReadings(selectedDeviceId, selectedSensorId);
      setReadings(readingsData);
    }
  }, [selectedDeviceId, selectedSensorId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (selectedDeviceId) {
      fetchSensors(selectedDeviceId);
    }
  }, [selectedDeviceId, fetchSensors]);

  useEffect(() => {
    if (selectedDeviceId && selectedSensorId !== null) {
      fetchReadings();
    }
  }, [selectedDeviceId, selectedSensorId, fetchReadings]);

  const readingsColumns = [
    { Header: 'Sensor ID', accessor: 'sensor_id' },
    { Header: 'Moisture', accessor: 'moisture' },
    {
      Header: 'Timestamp',
      accessor: 'timestamp',
      Cell: ({ value }: { value: string }) => new Date(value).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Readings</h1>
      <div className="flex space-x-4 mb-4">
        <select
          className="form-select"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
        >
          <option value="">Select a device</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={selectedSensorId || ''}
          onChange={(e) => setSelectedSensorId(Number(e.target.value))}
          disabled={!selectedDeviceId}
        >
          <option value="">Select a sensor</option>
          {sensors.map((sensor) => (
            <option key={sensor.id} value={sensor.id}>
              Sensor {sensor.id}
            </option>
          ))}
        </select>
      </div>
      {selectedDeviceId && selectedSensorId !== null && readings.length > 0 && (
        <>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Sensor Readings Graph</h2>
            <SensorReadingsGraph readings={readings} />
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Readings Table</h2>
            <DataTable columns={readingsColumns} data={readings} />
          </div>
        </>
      )}
    </div>
  );
};

export default Readings;
