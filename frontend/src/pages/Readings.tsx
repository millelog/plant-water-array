import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReadings, getDevices, getSensors } from '../api/api';
import DataTable from '../components/DataTable';
import SensorReadingsGraph from '../components/SensorReadingsGraph';
import { Reading, Device, Sensor } from '../types';

const Readings: React.FC = () => {
  const { deviceId: urlDeviceId, sensorId: urlSensorId } = useParams<{ deviceId?: string; sensorId?: string }>();
  const navigate = useNavigate();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(urlDeviceId || '');
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(urlSensorId ? parseInt(urlSensorId) : null);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const devicesData = await getDevices();
      setDevices(devicesData);
    } catch (err) {
      setError('Failed to fetch devices');
    }
  }, []);

  const fetchSensors = useCallback(async (deviceId: string) => {
    try {
      const sensorsData = await getSensors(deviceId);
      setSensors(sensorsData);
      if (!urlSensorId) {
        setSelectedSensorId(null);
      }
    } catch (err) {
      setError('Failed to fetch sensors');
    }
  }, [urlSensorId]);



  const fetchReadings = useCallback(async (deviceId: string, sensorId: number) => {
    try {
      const readingsData = await getReadings(deviceId, sensorId);
      console.log('Fetched readings:', readingsData);
      // Ensure timestamps are strings
      const formattedReadings = readingsData.map(reading => ({
        ...reading,
        timestamp: reading.timestamp.toString()
      }));
      setReadings(formattedReadings);
    } catch (err) {
      setError('Failed to fetch readings');
    }
  }, []);

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
      fetchReadings(selectedDeviceId, selectedSensorId);
      navigate(`/readings/${selectedDeviceId}/${selectedSensorId}`, { replace: true });
    }
  }, [selectedDeviceId, selectedSensorId, fetchReadings, navigate]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    setSelectedSensorId(null);
    navigate(`/readings/${newDeviceId}`, { replace: true });
  };

  const handleSensorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSensorId = Number(e.target.value);
    setSelectedSensorId(newSensorId);
    if (selectedDeviceId) {
      navigate(`/readings/${selectedDeviceId}/${newSensorId}`, { replace: true });
    }
  };

  const readingsColumns = useMemo(() => [
    { Header: 'Sensor ID', accessor: 'sensor_id' },
    { Header: 'Moisture', accessor: 'moisture' },
    {
      Header: 'Timestamp',
      accessor: 'timestamp',
      Cell: ({ value }: { value: string }) => {
        if (!value) return 'N/A';
        try {
          // Remove microseconds from the timestamp
          const timestampWithoutMicroseconds = value.replace(/\.\d+/, '');
          return new Date(timestampWithoutMicroseconds).toLocaleString() || 'Invalid Date';
        } catch (error) {
          console.error('Error parsing date:', error);
          return 'Invalid Date';
        }
      },
    },
  ], []);

  console.log('Readings data passed to DataTable:', readings);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Readings</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="flex space-x-4 mb-4">
        <select
          className="form-select"
          value={selectedDeviceId}
          onChange={handleDeviceChange}
        >
          <option value="">Select a device</option>
          {devices.map((device) => (
            <option key={device.device_id} value={device.device_id}>
              {device.name}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={selectedSensorId || ''}
          onChange={handleSensorChange}
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
            <DataTable 
              columns={readingsColumns} 
              data={readings} 
              key={`${selectedDeviceId}-${selectedSensorId}`} 
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Readings;
