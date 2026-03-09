import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sensor, Zone, CompareReadingsResponse } from '../types';
import { getSensors, getZones, getCompareReadings } from '../api/api';

const COLORS = [
  '#34d399', '#3b82f6', '#d97706', '#f87171', '#a78bfa',
  '#fb923c', '#22d3ee', '#f472b6', '#facc15', '#6ee7b7',
];

type TimeRange = 24 | 168 | 720;

const Compare: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [hours, setHours] = useState<TimeRange>(168);
  const [compareData, setCompareData] = useState<CompareReadingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, z] = await Promise.all([getSensors(), getZones()]);
        setSensors(s);
        setZones(z);
      } catch (err) {
        console.error('Failed to load sensors/zones:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fetchCompare = useCallback(async () => {
    if (selectedIds.length === 0) {
      setCompareData(null);
      return;
    }
    setChartLoading(true);
    try {
      const data = await getCompareReadings(selectedIds, hours);
      setCompareData(data);
    } catch (err) {
      console.error('Failed to fetch compare data:', err);
    } finally {
      setChartLoading(false);
    }
  }, [selectedIds, hours]);

  useEffect(() => {
    fetchCompare();
  }, [fetchCompare]);

  const toggleSensor = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length >= 10 ? prev : [...prev, id]
    );
  };

  // Group sensors by zone
  const sensorsByZone = new Map<number | null, Sensor[]>();
  for (const sensor of sensors) {
    const key = sensor.zone_id;
    if (!sensorsByZone.has(key)) sensorsByZone.set(key, []);
    sensorsByZone.get(key)!.push(sensor);
  }
  const zoneOrder = zones.map(z => z.id);
  const ungroupedSensors = sensorsByZone.get(null) || [];

  // Build merged chart data
  const chartData: Record<string, unknown>[] = [];
  if (compareData) {
    const timestampMap = new Map<string, Record<string, unknown>>();
    for (const sensorData of compareData.sensors) {
      for (const point of sensorData.readings) {
        if (!timestampMap.has(point.timestamp)) {
          timestampMap.set(point.timestamp, { timestamp: point.timestamp });
        }
        timestampMap.get(point.timestamp)![`sensor_${sensorData.sensor_id}`] = point.moisture;
      }
    }
    const sorted = [...timestampMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, entry] of sorted) {
      chartData.push(entry);
    }
  }

  // Build sensor label map
  const sensorLabels = new Map<number, string>();
  const sensorColorMap = new Map<number, string>();
  if (compareData) {
    compareData.sensors.forEach((s, i) => {
      const name = s.sensor_name || `Sensor ${s.sensor_id}`;
      const device = s.device_name ? ` (${s.device_name})` : '';
      sensorLabels.set(s.sensor_id, `${name}${device}`);
      sensorColorMap.set(s.sensor_id, COLORS[i % COLORS.length]);
    });
  }

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
      active
        ? 'bg-accent-glow text-accent border border-accent/20'
        : 'text-text-muted hover:text-text hover:bg-canvas-200 border border-surface-border'
    }`;

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts.includes('T') ? ts : ts + ':00');
      if (hours <= 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return ts;
    }
  };

  const renderSensorCheckbox = (sensor: Sensor) => {
    const checked = selectedIds.includes(sensor.id);
    const colorIdx = selectedIds.indexOf(sensor.id);
    const color = colorIdx >= 0 ? COLORS[colorIdx % COLORS.length] : undefined;
    return (
      <label
        key={sensor.id}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
          checked ? 'bg-canvas-200' : 'hover:bg-canvas-200/50'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleSensor(sensor.id)}
          className="sr-only"
        />
        <div
          className="w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center"
          style={{
            borderColor: checked && color ? color : 'rgba(148, 163, 184, 0.3)',
            backgroundColor: checked && color ? color : 'transparent',
          }}
        >
          {checked && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="#0c1117" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-text truncate">{sensor.name || `Sensor ${sensor.sensor_id}`}</span>
        {sensor.device && (
          <span className="text-text-muted text-[11px] font-mono truncate">{sensor.device.name || sensor.device_id}</span>
        )}
      </label>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card p-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
          <div className="text-sm text-text-muted">Loading sensors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Compare Plants</h1>

      {/* Sensor selector */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Select Sensors</h2>
          <span className="text-[11px] font-mono text-text-muted">
            {selectedIds.length}/10 selected
          </span>
        </div>

        <div className="space-y-4 max-h-64 overflow-y-auto">
          {zoneOrder.map(zoneId => {
            const zone = zones.find(z => z.id === zoneId);
            const zoneSensors = sensorsByZone.get(zoneId);
            if (!zone || !zoneSensors || zoneSensors.length === 0) return null;
            return (
              <div key={zoneId}>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1 px-1">
                  {zone.name}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5">
                  {zoneSensors.map(renderSensorCheckbox)}
                </div>
              </div>
            );
          })}

          {ungroupedSensors.length > 0 && (
            <div>
              <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1 px-1">
                {zones.length > 0 ? 'Ungrouped' : 'All Sensors'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5">
                {ungroupedSensors.map(renderSensorCheckbox)}
              </div>
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={() => setSelectedIds([])}
            className="btn-ghost text-xs mt-3"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Time range pills */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-text-muted font-mono mr-1">Range</span>
        <button onClick={() => setHours(24)} className={pillClass(hours === 24)}>24h</button>
        <button onClick={() => setHours(168)} className={pillClass(hours === 168)}>7d</button>
        <button onClick={() => setHours(720)} className={pillClass(hours === 720)}>30d</button>
      </div>

      {/* Chart */}
      <div className="card p-5">
        {selectedIds.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            Select sensors above to compare moisture readings
          </div>
        ) : chartLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No readings found for the selected sensors and time range
          </div>
        ) : (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#5c6f7e', fontSize: 11, fontFamily: 'Space Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
                  tickFormatter={formatTimestamp}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: '#5c6f7e', fontSize: 11, fontFamily: 'Space Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
                  tickFormatter={(v) => `${v}%`}
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
                  labelFormatter={formatTimestamp}
                  formatter={(value: number, name: string) => {
                    const sensorId = parseInt(name.replace('sensor_', ''));
                    const label = sensorLabels.get(sensorId) || name;
                    return [`${value.toFixed(1)}%`, label];
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    const sensorId = parseInt(value.replace('sensor_', ''));
                    return sensorLabels.get(sensorId) || value;
                  }}
                  wrapperStyle={{ fontSize: 11, fontFamily: 'Space Mono' }}
                />
                {compareData?.sensors.map((s, i) => (
                  <Line
                    key={s.sensor_id}
                    type="monotone"
                    dataKey={`sensor_${s.sensor_id}`}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#0c1117' }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {compareData?.aggregated && selectedIds.length > 0 && chartData.length > 0 && (
          <div className="text-[11px] font-mono text-text-muted mt-2 text-right">
            Showing hourly averages
          </div>
        )}
      </div>
    </div>
  );
};

export default Compare;
