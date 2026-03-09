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

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (selectedDeviceId) {
      setSensors([]);
      fetchSensors(selectedDeviceId);
    } else {
      setSensors([]);
    }
  }, [selectedDeviceId, fetchSensors]);

  const fetchReadings = useCallback(async (deviceId: string, sensorId: number) => {
    try {
      const readingsData = await getReadings(deviceId, sensorId);
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
    { Header: 'Sensor ID', accessor: 'sensor_id',
      Cell: ({ value }: { value: number }) => <span className="data-value text-sm">{value}</span>,
    },
    { Header: 'Moisture', accessor: 'moisture',
      Cell: ({ value }: { value: number }) => <span className="data-value text-sm">{value.toFixed(2)}%</span>,
    },
    {
      Header: 'Raw ADC',
      accessor: 'raw_adc',
      Cell: ({ value }: { value: number | null | undefined }) =>
        value != null ? <span className="font-mono text-sm text-text-secondary">{value}</span> : <span className="text-text-muted">&mdash;</span>,
    },
    {
      Header: 'Timestamp',
      accessor: 'timestamp',
      Cell: ({ value }: { value: string }) => {
        if (!value) return <span className="text-text-muted">N/A</span>;
        try {
          const timestampWithoutMicroseconds = value.replace(/\.\d+/, '');
          return <span className="text-sm font-mono text-text-secondary">{new Date(timestampWithoutMicroseconds).toLocaleString()}</span>;
        } catch (error) {
          return <span className="text-text-muted">Invalid Date</span>;
        }
      },
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="card p-4 border-danger/20 bg-danger-glow">
          <span className="text-sm text-danger">{error}</span>
        </div>
      )}

      {/* Selectors */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:flex-1">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">Device</label>
            <select className="input" value={selectedDeviceId} onChange={handleDeviceChange}>
              <option value="">Select a device</option>
              {devices.map((device) => (
                <option key={device.device_id} value={device.device_id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:flex-1">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">Sensor</label>
            <select
              className="input"
              value={selectedSensorId || ''}
              onChange={handleSensorChange}
              disabled={!selectedDeviceId}
            >
              <option value="">Select a sensor</option>
              {sensors.map((sensor) => (
                <option key={sensor.id} value={sensor.sensor_id}>
                  {sensor.name || `Sensor ${sensor.sensor_id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedDeviceId && selectedSensorId !== null && readings.length > 0 && (
        <>
          <div className="card p-5">
            <div className="section-title mb-4">Moisture Over Time</div>
            <SensorReadingsGraph readings={readings} />
          </div>
          <DataTable
            columns={readingsColumns}
            data={readings}
            key={`${selectedDeviceId}-${selectedSensorId}`}
          />
        </>
      )}

      {selectedDeviceId && selectedSensorId !== null && readings.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-text-muted text-sm">No readings found for this sensor.</div>
        </div>
      )}
    </div>
  );
};

export default Readings;
