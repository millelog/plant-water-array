import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SensorSummary } from '../types';
import { getCompareReadings } from '../api/api';
import PlantCard from './PlantCard';

interface ZoneSectionProps {
  title: string;
  sensors: SensorSummary[];
  sensorDbIds?: number[];
  defaultOpen?: boolean;
  onRefresh?: () => void;
}

const ZoneSection: React.FC<ZoneSectionProps> = ({ title, sensors, sensorDbIds, defaultOpen = true, onRefresh }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<{ timestamp: string; avg: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (!showChart || !sensorDbIds || sensorDbIds.length === 0) return;
    let cancelled = false;
    const load = async () => {
      setChartLoading(true);
      try {
        const data = await getCompareReadings(sensorDbIds, 24);
        if (cancelled) return;
        // Compute per-timestamp average across all sensors
        const timestampMap = new Map<string, number[]>();
        for (const sensor of data.sensors) {
          for (const point of sensor.readings) {
            if (!timestampMap.has(point.timestamp)) timestampMap.set(point.timestamp, []);
            timestampMap.get(point.timestamp)!.push(point.moisture);
          }
        }
        const merged = [...timestampMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([ts, vals]) => ({
            timestamp: ts,
            avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
          }));
        setChartData(merged);
      } catch (err) {
        console.error('Failed to load zone chart:', err);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [showChart, sensorDbIds]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts.includes('T') ? ts : ts + ':00');
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 w-full py-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-left group flex-1"
        >
          {open ? (
            <ChevronDownIcon className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-text-muted" />
          )}
          <span className="section-title">{title}</span>
          <span className="badge bg-canvas-200 text-text-muted border border-surface-border ml-2">
            {sensors.length}
          </span>
        </button>
        {sensorDbIds && sensorDbIds.length > 0 && (
          <button
            onClick={() => setShowChart(!showChart)}
            className={`p-1.5 rounded-lg transition-colors ${
              showChart
                ? 'text-accent bg-accent-glow border border-accent/20'
                : 'text-text-muted hover:text-text hover:bg-canvas-200 border border-transparent'
            }`}
            title="Toggle zone moisture chart"
          >
            <ChartBarIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && showChart && sensorDbIds && sensorDbIds.length > 0 && (
        <div className="mb-4 rounded-xl border border-surface-border bg-canvas-50/50 p-3">
          {chartLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center text-text-muted text-xs py-8">No data for last 24h</div>
          ) : (
            <div className="w-full" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`zoneGrad-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.06)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fill: '#5c6f7e', fontSize: 10, fontFamily: 'Space Mono' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
                    tickFormatter={formatTime}
                    minTickGap={40}
                  />
                  <YAxis
                    tick={{ fill: '#5c6f7e', fontSize: 10, fontFamily: 'Space Mono' }}
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
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: '#8899a6', fontSize: 10, fontFamily: 'Space Mono', marginBottom: 2 }}
                    labelFormatter={formatTime}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Avg Moisture']}
                  />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill={`url(#zoneGrad-${title})`}
                    dot={false}
                    activeDot={{ r: 4, fill: '#34d399', stroke: '#0c1117', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="text-[10px] font-mono text-text-muted text-right mt-1">
            Zone avg &middot; last 24h
          </div>
        </div>
      )}

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
          {sensors.length === 0 ? (
            <div className="col-span-full text-sm text-text-muted py-4 text-center border border-dashed border-surface-border rounded-xl">
              No sensors in this zone
            </div>
          ) : (
            sensors.map((sensor, i) => (
              <div key={sensor.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-slide-up">
                <PlantCard sensor={sensor} onNameChange={onRefresh} onRefresh={onRefresh} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ZoneSection;
