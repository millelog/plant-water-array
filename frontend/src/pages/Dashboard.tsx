import React, { useState, useEffect } from 'react';
import { Device, Reading } from '../types';
import DeviceCard from '../components/DeviceCard';
import { getDevices, getReadings } from '../api/api';

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [latestReadings, setLatestReadings] = useState<{ [key: number]: Reading }>({});

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
      }
    };

    loadDevices();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} latestReadings={latestReadings} />
      ))}
    </div>
  );
};

export default Dashboard;
