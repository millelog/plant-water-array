import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Device, HeartbeatLogEntry, SensorHealthIndicator } from '../types';
import {
  getDevice,
  getHeartbeatHistory,
  getSensors,
  getSensorsHealthBatch,
  getDashboardSummary,
  updateDevice,
} from '../api/api';
import DataTable from '../components/DataTable';
import InlineEdit from '../components/InlineEdit';
import { Sensor } from '../types';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(ts: string): string {
  try {
    const clean = ts.replace(/\.\d+/, '');
    const utc = clean.endsWith('Z') ? clean : clean + 'Z';
    return new Date(utc).toLocaleString();
  } catch {
    return ts;
  }
}

function getStatus(lastSeen?: string): { label: string; dotClass: string } {
  if (!lastSeen) return { label: 'Provisioning', dotClass: 'status-dot--provisioning' };
  const online = (Date.now() - new Date(lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z').getTime()) < 5 * 60 * 1000;
  return online
    ? { label: 'Online', dotClass: 'status-dot--online' }
    : { label: 'Offline', dotClass: 'status-dot--offline' };
}

function computeUptime(heartbeats: HeartbeatLogEntry[]): string {
  if (heartbeats.length < 2) return 'N/A';
  const sorted = [...heartbeats].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let totalGapMs = 0;
  let gapCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime();
    if (gap > 10 * 60 * 1000) {
      totalGapMs += gap;
      gapCount++;
    }
  }
  const spanMs = new Date(sorted[sorted.length - 1].timestamp).getTime() - new Date(sorted[0].timestamp).getTime();
  if (spanMs <= 0) return 'N/A';
  const uptimePct = Math.max(0, Math.min(100, ((spanMs - totalGapMs) / spanMs) * 100));
  return `${uptimePct.toFixed(1)}% (${gapCount} gap${gapCount !== 1 ? 's' : ''})`;
}

const DeviceDetail: React.FC = () => {
  const { isDemo } = useAuth();
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [heartbeats, setHeartbeats] = useState<HeartbeatLogEntry[]>([]);
  const [healthMap, setHealthMap] = useState<Record<number, SensorHealthIndicator>>({});
  const [moistureMap, setMoistureMap] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!deviceId) return;
    try {
      const [dev, sensorList, hbs, healthBatch, summary] = await Promise.all([
        getDevice(deviceId),
        getSensors(deviceId),
        getHeartbeatHistory(deviceId),
        getSensorsHealthBatch(),
        getDashboardSummary(),
      ]);
      setDevice(dev);
      setSensors(sensorList);
      setHeartbeats(hbs);

      const hm: Record<number, SensorHealthIndicator> = {};
      for (const h of healthBatch) hm[h.sensor_db_id] = h;
      setHealthMap(hm);

      const mm: Record<number, number | null> = {};
      for (const s of summary.sensors) mm[s.id] = s.current_moisture;
      setMoistureMap(mm);
    } catch (error) {
      console.error('Error loading device detail:', error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <div className="inline-block w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
        <div className="text-sm text-text-muted">Loading device details...</div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <div className="text-text font-medium mb-1">Device not found</div>
        <Link to="/devices" className="text-sm text-accent">Back to devices</Link>
      </div>
    );
  }

  const status = getStatus(device.last_seen);

  function getHealthBadge(sensorDbId: number) {
    const h = healthMap[sensorDbId];
    if (!h) return <span className="text-text-muted text-xs">--</span>;
    if (h.total_readings_checked === 0) return <span className="text-text-muted text-xs">No data</span>;
    const issues: { label: string; color: string }[] = [];
    if (!h.reading_frequency_ok) issues.push({ label: 'Stale', color: 'bg-soil-glow text-soil border-soil/15' });
    if (h.stuck_at_zero) issues.push({ label: 'ADC=0', color: 'bg-danger/10 text-danger border-danger/15' });
    if (h.stuck_at_max) issues.push({ label: 'ADC=4095', color: 'bg-danger/10 text-danger border-danger/15' });
    if (h.flatline) issues.push({ label: 'Flatline', color: 'bg-soil-glow text-soil border-soil/15' });
    if (issues.length === 0) return <span className="badge bg-accent-glow text-accent border border-accent/15">OK</span>;
    return (
      <div className="flex gap-1 flex-wrap">
        {issues.map((issue, i) => (
          <span key={i} className={`badge border ${issue.color}`}>{issue.label}</span>
        ))}
      </div>
    );
  }

  const sensorColumns = [
    {
      Header: 'Sensor',
      accessor: 'name',
      Cell: ({ value }: { value: string | null }, row: Sensor) => (
        <div>
          <div className="text-text font-medium">{value || `Sensor ${row.sensor_id}`}</div>
          <div className="text-xs text-text-muted font-mono">ID: {row.sensor_id}</div>
        </div>
      ),
    },
    {
      Header: 'Moisture',
      accessor: 'id',
      Cell: ({ value }: { value: number }) => {
        const m = moistureMap[value];
        if (m === null || m === undefined) return <span className="text-text-muted text-sm">No data</span>;
        const color = m < 20 ? 'text-danger' : m < 40 ? 'text-soil' : 'text-accent';
        return (
          <div className="flex items-center gap-2">
            <span className={`data-value text-sm font-bold ${color}`}>{m.toFixed(1)}%</span>
            <div className="moisture-bar h-2 w-16">
              <div className="moisture-bar-fill" style={{ width: `${Math.min(100, Math.max(0, m))}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      Header: 'Health',
      accessor: 'health',
      Cell: (_: { value: unknown }, row: Sensor) => getHealthBadge(row.id),
    },
    {
      Header: '',
      accessor: 'actions',
      Cell: (_: { value: unknown }, row: Sensor) => (
        <Link to={`/plant/${row.id}`} className="btn-secondary text-xs py-1.5 px-3">
          Details
        </Link>
      ),
    },
  ];

  const heartbeatColumns = [
    {
      Header: 'Timestamp',
      accessor: 'timestamp',
      Cell: ({ value }: { value: string }) => (
        <span className="text-sm font-mono text-text-secondary">{formatTimestamp(value)}</span>
      ),
    },
    {
      Header: 'IP Address',
      accessor: 'ip_address',
      Cell: ({ value }: { value: string | null }) =>
        value ? <span className="data-value text-sm">{value}</span> : <span className="text-text-muted">--</span>,
    },
    {
      Header: 'Version',
      accessor: 'firmware_version',
      Cell: ({ value }: { value: string | null }) =>
        value ? <span className="badge bg-canvas-200 text-text-muted border border-surface-border font-mono">{value}</span> : <span className="text-text-muted">--</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <Link to="/devices" className="text-xs text-text-muted hover:text-accent transition-colors mb-2 inline-block">&larr; Devices</Link>
        <h1 className="page-title">
          {isDemo ? device.name : (
            <InlineEdit
              value={device.name}
              onSave={async (newName) => {
                await updateDevice(device.device_id, { name: newName });
                loadData();
              }}
            />
          )}
        </h1>
      </div>

      {/* Device Info Card */}
      <div className="card p-6">
        <div className="section-title mb-4">Device Info</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-text-muted text-xs mb-1">Status</div>
            <span className="flex items-center gap-2">
              <span className={`status-dot ${status.dotClass}`} />
              <span>{status.label}</span>
            </span>
          </div>
          <div>
            <div className="text-text-muted text-xs mb-1">Device ID</div>
            <span className="data-value font-mono text-xs">{device.device_id}</span>
          </div>
          <div>
            <div className="text-text-muted text-xs mb-1">IP Address</div>
            <span className="data-value">{device.ip_address || '--'}</span>
          </div>
          <div>
            <div className="text-text-muted text-xs mb-1">MAC Address</div>
            <span className="data-value font-mono text-xs">{device.mac_address || '--'}</span>
          </div>
          <div>
            <div className="text-text-muted text-xs mb-1">Deploy Version</div>
            {device.firmware_version
              ? <span className="badge bg-canvas-200 text-text-muted border border-surface-border font-mono">{device.firmware_version}</span>
              : <span className="text-text-muted">--</span>
            }
          </div>
          <div>
            <div className="text-text-muted text-xs mb-1">Last Seen</div>
            <span className="text-text-secondary font-mono text-xs">
              {device.last_seen ? timeAgo(device.last_seen) : 'Never'}
            </span>
          </div>
          <div>
            <div className="text-text-muted text-xs mb-1">Uptime (from heartbeats)</div>
            <span className="data-value text-xs">{computeUptime(heartbeats)}</span>
          </div>
        </div>
      </div>

      {/* Sensors */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title">Sensors ({sensors.length})</div>
        </div>
        {sensors.length > 0 ? (
          <DataTable columns={sensorColumns} data={sensors} />
        ) : (
          <div className="text-sm text-text-muted italic">No sensors registered on this device</div>
        )}
      </div>

      {/* Heartbeat History */}
      <div className="card p-6">
        <div className="section-title mb-4">Heartbeat History (last 50)</div>
        {heartbeats.length > 0 ? (
          <DataTable columns={heartbeatColumns} data={heartbeats} />
        ) : (
          <div className="text-sm text-text-muted italic">No heartbeats recorded yet</div>
        )}
      </div>
    </div>
  );
};

export default DeviceDetail;
