import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { SparklinePoint } from '../types';

interface SparklineChartProps {
  data: SparklinePoint[];
  height?: number;
}

const SparklineChart: React.FC<SparklineChartProps> = ({ data, height = 40 }) => {
  if (data.length < 2) return null;

  const values = data.map(d => d.moisture);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 2;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line
            type="monotone"
            dataKey="moisture"
            stroke="#34d399"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
