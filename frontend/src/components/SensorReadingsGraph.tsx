import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Line, ReferenceLine, ComposedChart } from 'recharts';
import { Reading, AggregatedReadingPoint } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SensorReadingsGraphProps {
  readings?: Reading[];
  aggregatedData?: AggregatedReadingPoint[];
  debugMode?: boolean;
  calibrationDry?: number;
  calibrationWet?: number;
}

const SensorReadingsGraph: React.FC<SensorReadingsGraphProps> = ({ readings, aggregatedData, debugMode, calibrationDry, calibrationWet }) => {
  const { chartColors } = useTheme();

  // Aggregated mode
  if (aggregatedData && aggregatedData.length > 0) {
    const data = aggregatedData.map(point => ({
      period: point.period_start,
      avg: point.avg_moisture,
      min: point.min_moisture,
      max: point.max_moisture,
    }));

    const allValues = aggregatedData.flatMap(p => [p.min_moisture, p.max_moisture]);
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const padding = (maxVal - minVal) * 0.1 || 5;

    return (
      <div className="w-full h-72 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.accent} stopOpacity={chartColors.areaOpacity} />
                <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.accent} stopOpacity={chartColors.bandOpacityTop} />
                <stop offset="100%" stopColor={chartColors.accent} stopOpacity={chartColors.bandOpacityBottom} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartColors.gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tick={{ fill: chartColors.textMuted, fontSize: 11, fontFamily: 'Space Mono' }}
              tickLine={false}
              axisLine={{ stroke: chartColors.axisStroke }}
            />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              tick={{ fill: chartColors.textMuted, fontSize: 11, fontFamily: 'Space Mono' }}
              tickLine={false}
              axisLine={{ stroke: chartColors.axisStroke }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: '12px',
                boxShadow: chartColors.tooltipShadow,
                padding: '10px 14px',
              }}
              labelStyle={{ color: chartColors.textSecondary, fontSize: 11, fontFamily: 'Space Mono', marginBottom: 4 }}
              itemStyle={{ fontSize: 12, fontFamily: 'Space Mono' }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = { avg: 'Avg', min: 'Min', max: 'Max' };
                return [`${value.toFixed(1)}%`, labels[name] || name];
              }}
            />
            <Area
              type="monotone"
              dataKey="max"
              stroke="none"
              fill="url(#bandGradient)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="min"
              stroke="none"
              fill={chartColors.canvas}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="avg"
              stroke={chartColors.accent}
              strokeWidth={2}
              fill="url(#avgGradient)"
              dot={false}
              activeDot={{ r: 5, fill: chartColors.accent, stroke: chartColors.canvas, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="absolute top-2 right-3 flex gap-4">
          <span className="text-[11px] font-mono text-text-muted">
            max <span className="text-accent">{maxVal.toFixed(1)}%</span>
          </span>
          <span className="text-[11px] font-mono text-text-muted">
            min <span className="text-soil">{minVal.toFixed(1)}%</span>
          </span>
        </div>
      </div>
    );
  }

  // Raw readings mode
  const rawReadings = readings || [];

  const validMoistureReadings = rawReadings.filter(r => typeof r.moisture === 'number' && !isNaN(r.moisture));
  const maxMoisture = validMoistureReadings.length > 0 ? Math.max(...validMoistureReadings.map(r => r.moisture)) : 0;
  const minMoisture = validMoistureReadings.length > 0 ? Math.min(...validMoistureReadings.map(r => r.moisture)) : 0;
  const padding = (maxMoisture - minMoisture) * 0.1 || 5;

  // Debug mode with dual Y-axis
  if (debugMode) {
    const hasAdcData = rawReadings.some(r => r.raw_adc !== null && r.raw_adc !== undefined);

    const data = rawReadings.map(reading => {
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
        moisture: reading.moisture,
        raw_adc: reading.raw_adc ?? undefined,
      };
    });

    const adcValues = rawReadings.filter(r => r.raw_adc != null).map(r => r.raw_adc!);
    const maxAdc = adcValues.length > 0 ? Math.max(...adcValues) : 4095;
    const minAdc = adcValues.length > 0 ? Math.min(...adcValues) : 0;
    const adcPadding = (maxAdc - minAdc) * 0.1 || 100;

    return (
      <div className="w-full h-72 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 50, left: -10, bottom: 4 }}
          >
            <defs>
              <linearGradient id="moistureGradientDebug" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.accent} stopOpacity={chartColors.areaOpacity} />
                <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartColors.gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: chartColors.textMuted, fontSize: 11, fontFamily: 'Space Mono' }}
              tickLine={false}
              axisLine={{ stroke: chartColors.axisStroke }}
            />
            <YAxis
              yAxisId="moisture"
              domain={[minMoisture - padding, maxMoisture + padding]}
              tick={{ fill: chartColors.textMuted, fontSize: 11, fontFamily: 'Space Mono' }}
              tickLine={false}
              axisLine={{ stroke: chartColors.axisStroke }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            {hasAdcData && (
              <YAxis
                yAxisId="adc"
                orientation="right"
                domain={[minAdc - adcPadding, maxAdc + adcPadding]}
                tick={{ fill: chartColors.soil, fontSize: 11, fontFamily: 'Space Mono' }}
                tickLine={false}
                axisLine={{ stroke: chartColors.soilAxisStroke }}
                tickFormatter={(v) => `${Math.round(v)}`}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: '12px',
                boxShadow: chartColors.tooltipShadow,
                padding: '10px 14px',
              }}
              labelStyle={{ color: chartColors.textSecondary, fontSize: 11, fontFamily: 'Space Mono', marginBottom: 4 }}
              formatter={(value: number, name: string) => {
                if (name === 'moisture') return [`${value.toFixed(2)}%`, 'Moisture'];
                if (name === 'raw_adc') return [`${Math.round(value)}`, 'Raw ADC'];
                return [value, name];
              }}
            />
            {calibrationDry !== undefined && hasAdcData && (
              <ReferenceLine
                yAxisId="adc"
                y={calibrationDry}
                stroke={chartColors.soil}
                strokeDasharray="6 3"
                strokeOpacity={0.5}
                label={{ value: 'Dry', fill: chartColors.soil, fontSize: 10, position: 'right' }}
              />
            )}
            {calibrationWet !== undefined && hasAdcData && (
              <ReferenceLine
                yAxisId="adc"
                y={calibrationWet}
                stroke="#3b82f6"
                strokeDasharray="6 3"
                strokeOpacity={0.5}
                label={{ value: 'Wet', fill: '#3b82f6', fontSize: 10, position: 'right' }}
              />
            )}
            <Area
              yAxisId="moisture"
              type="monotone"
              dataKey="moisture"
              stroke={chartColors.accent}
              strokeWidth={2}
              fill="url(#moistureGradientDebug)"
              dot={false}
              activeDot={{ r: 5, fill: chartColors.accent, stroke: chartColors.canvas, strokeWidth: 2 }}
            />
            {hasAdcData && (
              <Line
                yAxisId="adc"
                type="monotone"
                dataKey="raw_adc"
                stroke={chartColors.soil}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 4, fill: chartColors.soil, stroke: chartColors.canvas, strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="absolute top-2 right-14 flex gap-4">
          <span className="text-[11px] font-mono text-accent">Moisture %</span>
          {hasAdcData && <span className="text-[11px] font-mono text-soil">Raw ADC</span>}
        </div>
      </div>
    );
  }

  // Standard raw readings mode
  const data = rawReadings.map(reading => {
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

  return (
    <div className="w-full h-72 relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
        >
          <defs>
            <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={chartColors.areaOpacity} />
              <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartColors.gridStroke} strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: chartColors.textMuted, fontSize: 11, fontFamily: 'Space Mono' }}
            tickLine={false}
            axisLine={{ stroke: chartColors.axisStroke }}
          />
          <YAxis
            domain={[minMoisture - padding, maxMoisture + padding]}
            tick={{ fill: chartColors.textMuted, fontSize: 11, fontFamily: 'Space Mono' }}
            tickLine={false}
            axisLine={{ stroke: chartColors.axisStroke }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chartColors.tooltipBg,
              border: `1px solid ${chartColors.tooltipBorder}`,
              borderRadius: '12px',
              boxShadow: chartColors.tooltipShadow,
              padding: '10px 14px',
            }}
            labelStyle={{ color: chartColors.textSecondary, fontSize: 11, fontFamily: 'Space Mono', marginBottom: 4 }}
            itemStyle={{ color: chartColors.accent, fontSize: 13, fontFamily: 'Space Mono', fontWeight: 700 }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Moisture']}
          />
          <Area
            type="monotone"
            dataKey="moisture"
            stroke={chartColors.accent}
            strokeWidth={2}
            fill="url(#moistureGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: chartColors.accent,
              stroke: chartColors.canvas,
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
