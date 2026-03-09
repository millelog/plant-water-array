import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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
  const padding = (maxMoisture - minMoisture) * 0.1 || 5;

  return (
    <div className="w-full h-72 relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
        >
          <defs>
            <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.06)" strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: '#5c6f7e', fontSize: 11, fontFamily: 'Space Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
          />
          <YAxis
            domain={[minMoisture - padding, maxMoisture + padding]}
            tick={{ fill: '#5c6f7e', fontSize: 11, fontFamily: 'Space Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#182028',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
              padding: '10px 14px',
            }}
            labelStyle={{ color: '#8899a6', fontSize: 11, fontFamily: 'Space Mono', marginBottom: 4 }}
            itemStyle={{ color: '#34d399', fontSize: 13, fontFamily: 'Space Mono', fontWeight: 700 }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Moisture']}
          />
          <Area
            type="monotone"
            dataKey="moisture"
            stroke="#34d399"
            strokeWidth={2}
            fill="url(#moistureGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: '#34d399',
              stroke: '#0c1117',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {/* Min/Max labels */}
      <div className="absolute top-2 right-3 flex gap-4">
        <span className="text-[11px] font-mono text-text-muted">
          max <span className="text-accent">{maxMoisture.toFixed(1)}%</span>
        </span>
        <span className="text-[11px] font-mono text-text-muted">
          min <span className="text-soil">{minMoisture.toFixed(1)}%</span>
        </span>
      </div>
    </div>
  );
};

export default SensorReadingsGraph;
