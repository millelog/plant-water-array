import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDevices, deleteDevice, updateDevice } from '../api/api';
import DataTable from '../components/DataTable';
import DeviceSetupInstructions from '../components/DeviceSetupInstructions';
import InlineEdit from '../components/InlineEdit';
import { Device } from '../types';

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

const Devices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);

  const fetchDevices = useCallback(async () => {
    const devicesData = await getDevices();
    setDevices(devicesData);
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  async function handleDeleteDevice(deviceId: string, deviceName: string) {
    if (!window.confirm(`Delete device "${deviceName}" (${deviceId})? This will remove all its sensors, readings, and alerts.`)) {
      return;
    }
    await deleteDevice(deviceId);
    fetchDevices();
  }

  function getStatus(lastSeen?: string): { label: string; dotClass: string } {
    if (!lastSeen) {
      return { label: 'Provisioning', dotClass: 'status-dot--provisioning' };
    }
    const now = new Date();
    const seen = new Date(lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z');
    const online = (now.getTime() - seen.getTime()) < 5 * 60 * 1000;
    if (online) {
      return { label: 'Online', dotClass: 'status-dot--online' };
    }
    return { label: 'Offline', dotClass: 'status-dot--offline' };
  }

  const deviceColumns = [
    {
      Header: 'Device',
      accessor: 'name',
      Cell: ({ value }: { value: string }, row: Device) => (
        <div>
          <InlineEdit
            value={value}
            onSave={async (newName) => {
              await updateDevice(row.device_id, { name: newName });
              fetchDevices();
            }}
            className="text-text font-medium"
          />
          <div className="text-xs text-text-muted font-mono">{row.device_id}</div>
        </div>
      ),
    },
    {
      Header: 'Status',
      accessor: 'last_seen',
      Cell: ({ value }: { value: string | undefined }) => {
        const status = getStatus(value);
        return (
          <span className="flex items-center gap-2">
            <span className={`status-dot ${status.dotClass}`} />
            <span className="text-sm">{status.label}</span>
          </span>
        );
      },
    },
    {
      Header: 'Firmware',
      accessor: 'firmware_version',
      Cell: ({ value }: { value: string | undefined }) =>
        value ? <span className="badge bg-canvas-200 text-text-muted border border-surface-border">v{value}</span> : <span className="text-text-muted">&mdash;</span>,
    },
    {
      Header: 'IP Address',
      accessor: 'ip_address',
      Cell: ({ value }: { value: string | undefined }) =>
        value ? <span className="data-value text-sm">{value}</span> : <span className="text-text-muted">&mdash;</span>,
    },
    {
      Header: 'Last Seen',
      accessor: 'last_seen_time',
      Cell: (_: { value: unknown }, row: Device) =>
        row.last_seen
          ? <span className="text-sm font-mono text-text-secondary">{timeAgo(row.last_seen)}</span>
          : <span className="text-text-muted">Never</span>,
    },
    {
      Header: '',
      accessor: 'actions',
      Cell: (_: { value: unknown }, row: Device) => (
        <div className="flex gap-2 justify-end">
          <Link
            to={`/devices/${encodeURIComponent(row.device_id)}`}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Details
          </Link>
          <Link
            to={`/sensors?deviceId=${encodeURIComponent(row.device_id)}`}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Sensors ({row.sensors.length})
          </Link>
          <button
            className="btn-danger text-xs py-1.5 px-3"
            onClick={() => handleDeleteDevice(row.device_id, row.name)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {devices.length === 0 ? (
        <div className="space-y-6">
          <div className="card p-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent-glow border border-accent/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
                <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div className="text-text font-medium mb-1">No Devices Yet</div>
            <div className="text-sm text-text-muted mb-4">Follow the setup instructions below to provision your first ESP32 sensor.</div>
          </div>
          <DeviceSetupInstructions />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              <span className="data-value">{devices.length}</span> device{devices.length !== 1 ? 's' : ''} registered
            </div>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="btn-secondary text-xs"
            >
              {showInstructions ? 'Hide' : 'Show'} Setup Guide
            </button>
          </div>
          {showInstructions && <DeviceSetupInstructions />}
          <DataTable columns={deviceColumns} data={devices} />
        </>
      )}
    </div>
  );
};

export default Devices;
