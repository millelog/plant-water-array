import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Reading } from '../types';

interface SensorReadingsGraphProps {
  readings: Reading[];
}

const SensorReadingsGraph: React.FC<SensorReadingsGraphProps> = ({ readings }) => {
  const data = readings.map(reading => {
    let formattedTimestamp = 'Invalid Date';
    try {
      if (reading.timestamp) {
        const timestampWithoutMicroseconds = reading.timestamp.replace(/\.\d+/, '');
        formattedTimestamp = new Date(timestampWithoutMicroseconds).toLocaleString();
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    return {
      timestamp: formattedTimestamp,
      moisture: reading.moisture
    };
  });

  const validMoistureReadings = readings.filter(r => typeof r.moisture === 'number' && !isNaN(r.moisture));
  const maxMoisture = validMoistureReadings.length > 0 ? Math.max(...validMoistureReadings.map(r => r.moisture)) : 0;
  const minMoisture = validMoistureReadings.length > 0 ? Math.min(...validMoistureReadings.map(r => r.moisture)) : 0;

  return (
    <div className="w-full h-64 bg-gray-100 relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis domain={[minMoisture, maxMoisture]} />
          <Tooltip />
          <Line type="monotone" dataKey="moisture" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute top-0 left-0 p-2">
        <span className="text-sm">{maxMoisture.toFixed(2)}%</span>
      </div>
      <div className="absolute bottom-0 left-0 p-2">
        <span className="text-sm">{minMoisture.toFixed(2)}%</span>
      </div>
    </div>
  );
};

export default SensorReadingsGraph;