import React from 'react';
import { Link } from 'react-router-dom';
import { Device, Reading } from '../types';

interface DeviceCardProps {
  device: Device;
  latestReadings: { [key: number]: Reading };
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, latestReadings }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">{device.name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {device.sensors.map((sensor) => (
          <div key={sensor.id} className="bg-gray-100 p-4 rounded-md">
            <h3 className="text-lg font-semibold mb-2">{sensor.name || `Sensor ${sensor.sensor_id}`}</h3>
            {latestReadings[sensor.id] ? (
              <p className="text-xl">
                Moisture: {latestReadings[sensor.id].moisture.toFixed(2)}%
              </p>
            ) : (
              <p className="text-gray-500">No recent readings</p>
            )}
            <Link
              to={`/readings/${device.device_id}/${sensor.sensor_id}`}
              className="mt-2 inline-block text-blue-600 hover:text-blue-800"
            >
              View History
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceCard;