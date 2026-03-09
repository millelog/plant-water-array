import React from 'react';
import { Link } from 'react-router-dom';
import { Device, Reading } from '../types';

interface DeviceCardProps {
  device: Device;
  latestReadings: { [key: number]: Reading };
}

function isOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  const now = new Date();
  const seen = new Date(lastSeen);
  return (now.getTime() - seen.getTime()) < 5 * 60 * 1000;
}

function getMoistureColor(value: number): string {
  if (value < 20) return 'text-danger';
  if (value < 40) return 'text-soil';
  return 'text-accent';
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, latestReadings }) => {
  const online = isOnline(device.last_seen);

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            online ? 'bg-accent-glow border border-accent/20' : 'bg-canvas-200 border border-surface-border'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={online ? 'text-accent' : 'text-text-muted'}>
              <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
              <line x1="9" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h2 className="font-body font-semibold text-text">{device.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${online ? 'status-dot--online' : 'status-dot--offline'}`} />
              <span className="text-xs text-text-muted">{online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        {device.firmware_version && (
          <span className="badge bg-canvas-200 text-text-muted border border-surface-border">
            v{device.firmware_version}
          </span>
        )}
      </div>

      {device.sensors.length === 0 ? (
        <div className="text-sm text-text-muted py-4 text-center border border-dashed border-surface-border rounded-xl">
          No sensors registered
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {device.sensors.map((sensor) => {
            const reading = latestReadings[sensor.id];
            const moisture = reading?.moisture;

            return (
              <div
                key={sensor.id}
                className="bg-canvas-100 rounded-xl p-4 border border-surface-border
                           hover:border-surface-border-hover transition-colors duration-150"
              >
                <div className="text-xs text-text-muted font-mono mb-2 uppercase tracking-wider">
                  {sensor.name || `Sensor ${sensor.sensor_id}`}
                </div>
                {moisture !== undefined ? (
                  <>
                    <div className={`text-2xl font-mono font-bold ${getMoistureColor(moisture)} mb-2`}>
                      {moisture.toFixed(1)}%
                    </div>
                    <div className="moisture-bar">
                      <div
                        className="moisture-bar-fill"
                        style={{ width: `${Math.min(100, Math.max(0, moisture))}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-text-muted italic">No readings</div>
                )}
                <Link
                  to={`/readings/${device.device_id}/${sensor.sensor_id}`}
                  className="mt-3 inline-block text-xs text-accent hover:text-accent-dim font-medium transition-colors"
                >
                  View History &rarr;
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeviceCard;
