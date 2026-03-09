import React, { useState, useEffect } from 'react';
import { Device, Reading } from '../types';
import DeviceCard from '../components/DeviceCard';
import { getDevices, getReadings } from '../api/api';

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [latestReadings, setLatestReadings] = useState<{ [key: number]: Reading }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const fetchedDevices = await getDevices();
        setDevices(fetchedDevices);

        const readings: { [key: number]: Reading } = {};
        for (const device of fetchedDevices) {
          for (const sensor of device.sensors) {
            const sensorReadings = await getReadings(device.device_id, sensor.sensor_id, 1);
            if (sensorReadings.length > 0) {
              readings[sensor.id] = sensorReadings[0];
            }
          }
        }
        setLatestReadings(readings);
      } catch (error) {
        console.error('Error fetching devices and readings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, []);

  const onlineCount = devices.filter(d => {
    if (!d.last_seen) return false;
    return (Date.now() - new Date(d.last_seen).getTime()) < 5 * 60 * 1000;
  }).length;

  const totalSensors = devices.reduce((acc, d) => acc + d.sensors.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Devices</div>
          <div className="text-3xl font-mono font-bold text-text">{devices.length}</div>
          <div className="text-xs text-text-muted mt-1">
            <span className="text-accent">{onlineCount}</span> online
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Sensors</div>
          <div className="text-3xl font-mono font-bold text-text">{totalSensors}</div>
          <div className="text-xs text-text-muted mt-1">across all devices</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Readings</div>
          <div className="text-3xl font-mono font-bold text-text">{Object.keys(latestReadings).length}</div>
          <div className="text-xs text-text-muted mt-1">sensors reporting</div>
        </div>
      </div>

      {/* Device cards */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
          <div className="text-sm text-text-muted">Loading devices...</div>
        </div>
      ) : devices.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent-glow border border-accent/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M12 22c0-8-6-10-6-16a6 6 0 1 1 12 0c0 6-6 8-6 16z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div className="text-text font-medium mb-1">No devices yet</div>
          <div className="text-sm text-text-muted">Set up your first ESP32 sensor to get started.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device, i) => (
            <div key={device.id} style={{ animationDelay: `${i * 80}ms` }} className="animate-slide-up">
              <DeviceCard device={device} latestReadings={latestReadings} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
