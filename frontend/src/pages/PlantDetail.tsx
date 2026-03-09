import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sensor, Reading, Alert, Zone, Threshold } from '../types';
import {
  getSensorDetail,
  getReadings,
  getAlerts,
  markAlertAsRead,
  setThreshold,
  getThreshold,
  updateSensor,
  getZones,
} from '../api/api';
import InlineEdit from '../components/InlineEdit';
import SensorReadingsGraph from '../components/SensorReadingsGraph';
import AlertCard from '../components/AlertCard';

type TimeRange = '24h' | '7d' | '30d';

const PlantDetail: React.FC = () => {
  const { sensorDbId } = useParams<{ sensorDbId: string }>();
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [thresholdMin, setThresholdMin] = useState<string>('');
  const [thresholdMax, setThresholdMax] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const sensorId = Number(sensorDbId);

  const loadSensor = useCallback(async () => {
    if (!sensorDbId) return;
    try {
      const s = await getSensorDetail(sensorId);
      setSensor(s);

      // Load threshold
      try {
        const t = await getThreshold(sensorId);
        setThresholdMin(t.min_moisture !== null ? String(t.min_moisture) : '');
        setThresholdMax(t.max_moisture !== null ? String(t.max_moisture) : '');
      } catch {
        // No threshold set
      }
    } catch (error) {
      console.error('Error loading sensor:', error);
    }
  }, [sensorDbId, sensorId]);

  const loadReadings = useCallback(async () => {
    if (!sensor) return;
    const limitMap: Record<TimeRange, number> = { '24h': 288, '7d': 2016, '30d': 8640 };
    try {
      const r = await getReadings(sensor.device_id, sensor.sensor_id, limitMap[timeRange]);
      setReadings(r);
    } catch (error) {
      console.error('Error loading readings:', error);
    }
  }, [sensor, timeRange]);

  const loadAlerts = useCallback(async () => {
    if (!sensorDbId) return;
    try {
      const a = await getAlerts({ sensor_id: sensorId });
      setAlerts(a.slice(0, 10));
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }, [sensorDbId, sensorId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadSensor();
      const z = await getZones();
      setZones(z);
      setLoading(false);
    };
    init();
  }, [loadSensor]);

  useEffect(() => {
    if (sensor) {
      loadReadings();
      loadAlerts();
    }
  }, [sensor, loadReadings, loadAlerts]);

  const handleRename = async (newName: string) => {
    await updateSensor(sensorId, { name: newName });
    await loadSensor();
  };

  const handleZoneChange = async (zoneId: number | null) => {
    await updateSensor(sensorId, { zone_id: zoneId });
    await loadSensor();
  };

  const handleSaveThreshold = async () => {
    const min = thresholdMin !== '' ? parseFloat(thresholdMin) : null;
    const max = thresholdMax !== '' ? parseFloat(thresholdMax) : null;
    await setThreshold(sensorId, { min_moisture: min, max_moisture: max } as Threshold);
  };

  const handleDismissAlert = async (alertId: number) => {
    await markAlertAsRead(alertId);
    await loadAlerts();
  };

  if (loading) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <div className="inline-block w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
        <div className="text-sm text-text-muted">Loading plant details...</div>
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <div className="text-text font-medium mb-1">Sensor not found</div>
        <Link to="/" className="text-sm text-accent">Back to dashboard</Link>
      </div>
    );
  }

  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;
  const moisture = latestReading?.moisture;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-xs text-text-muted hover:text-accent transition-colors mb-2 inline-block">&larr; Dashboard</Link>
          <h1 className="page-title">
            <InlineEdit
              value={sensor.name || `Sensor ${sensor.sensor_id}`}
              onSave={handleRename}
            />
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-text-secondary">on {(sensor as any).device?.name || sensor.device_id}</span>
            <select
              value={sensor.zone_id ?? ''}
              onChange={(e) => handleZoneChange(e.target.value ? Number(e.target.value) : null)}
              className="input !w-auto !py-1 !px-2 text-xs"
            >
              <option value="">No zone</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Current Reading */}
      <div className="card p-6">
        <div className="section-title mb-4">Current Reading</div>
        {moisture !== undefined && moisture !== null ? (
          <div className="flex items-center gap-6">
            <div className={`text-5xl font-mono font-bold ${getMoistureColor(moisture)}`}>
              {moisture.toFixed(1)}%
            </div>
            <div className="flex-1">
              <div className="moisture-bar h-3">
                <div
                  className="moisture-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, moisture))}%` }}
                />
              </div>
              {latestReading && (
                <div className="text-xs text-text-muted font-mono mt-2">
                  Last updated {formatTimeAgo(latestReading.timestamp)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-muted italic">No readings yet</div>
        )}
      </div>

      {/* Threshold Settings */}
      <div className="card p-6">
        <div className="section-title mb-4">Threshold Settings</div>
        <div className="flex items-end gap-4">
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">Min Moisture %</label>
            <input
              type="number"
              value={thresholdMin}
              onChange={(e) => setThresholdMin(e.target.value)}
              className="input !w-28"
              placeholder="e.g. 20"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted font-mono block mb-1">Max Moisture %</label>
            <input
              type="number"
              value={thresholdMax}
              onChange={(e) => setThresholdMax(e.target.value)}
              className="input !w-28"
              placeholder="e.g. 80"
              min="0"
              max="100"
            />
          </div>
          <button onClick={handleSaveThreshold} className="btn-primary">Save</button>
        </div>
      </div>

      {/* History Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title">History</div>
          <div className="flex gap-1">
            {(['24h', '7d', '30d'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  timeRange === range
                    ? 'bg-accent-glow text-accent border border-accent/20'
                    : 'text-text-muted hover:text-text hover:bg-canvas-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        {readings.length > 0 ? (
          <SensorReadingsGraph readings={readings} />
        ) : (
          <div className="text-sm text-text-muted italic py-8 text-center">No readings for this period</div>
        )}
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div>
          <div className="section-title mb-3">Recent Alerts</div>
          <div className="space-y-1">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onMarkAsRead={handleDismissAlert} />
            ))}
          </div>
        </div>
      )}

      {/* Sensor Info (collapsible) */}
      <div className="card p-5">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="section-title">Sensor Info</span>
          <span className="text-xs text-text-muted">{showInfo ? '(hide)' : '(show)'}</span>
        </button>
        {showInfo && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-surface-border">
              <span className="text-text-muted">Device</span>
              <span className="data-value">{sensor.device_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-border">
              <span className="text-text-muted">Sensor ID (pin)</span>
              <span className="data-value">{sensor.sensor_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-border">
              <span className="text-text-muted">DB ID</span>
              <span className="data-value">{sensor.id}</span>
            </div>
            {sensor.calibration_dry !== null && (
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-text-muted">Calibration (dry)</span>
                <span className="data-value">{sensor.calibration_dry}</span>
              </div>
            )}
            {sensor.calibration_wet !== null && (
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-text-muted">Calibration (wet)</span>
                <span className="data-value">{sensor.calibration_wet}</span>
              </div>
            )}
            <div className="pt-2">
              <Link to="/sensors" className="text-xs text-accent hover:text-accent-dim">
                Calibration Wizard &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getMoistureColor(value: number): string {
  if (value < 20) return 'text-danger';
  if (value < 40) return 'text-soil';
  return 'text-accent';
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default PlantDetail;
