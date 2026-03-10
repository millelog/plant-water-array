import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getSensors, getDevices, getZones, getDashboardSummary, updateSensor, getSensorsHealthBatch } from '../api/api';
import DataTable from '../components/DataTable';
import CalibrationWizard from '../components/CalibrationWizard';
import InlineEdit from '../components/InlineEdit';
import { Sensor, Device, Zone, SensorHealthIndicator } from '../types';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sensors: React.FC = () => {
  const { isDemo } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [moistureMap, setMoistureMap] = useState<Record<number, { moisture: number | null; status: string }>>({});
  const [healthMap, setHealthMap] = useState<Record<number, SensorHealthIndicator>>({});
  const [calibratingSensor, setCalibratingSensor] = useState<Sensor | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const activeDeviceId = searchParams.get('deviceId') || '';
  const activeZoneId = searchParams.get('zoneId') || '';

  const fetchData = useCallback(async () => {
    const [sensorsData, devicesData, zonesData, summary, healthBatch] = await Promise.all([
      getSensors(activeDeviceId || undefined),
      getDevices(),
      getZones(),
      getDashboardSummary(),
      getSensorsHealthBatch(),
    ]);
    setSensors(sensorsData);
    setDevices(devicesData);
    setZones(zonesData);
    const map: Record<number, { moisture: number | null; status: string }> = {};
    for (const s of summary.sensors) {
      map[s.id] = { moisture: s.current_moisture, status: s.status };
    }
    setMoistureMap(map);
    const hm: Record<number, SensorHealthIndicator> = {};
    for (const h of healthBatch) hm[h.sensor_db_id] = h;
    setHealthMap(hm);
  }, [activeDeviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilter = (key: string, value: string) => {
    const params: Record<string, string> = {};
    if (key === 'deviceId') {
      if (value) params.deviceId = value;
      if (activeZoneId) params.zoneId = activeZoneId;
    } else {
      if (activeDeviceId) params.deviceId = activeDeviceId;
      if (value) params.zoneId = value;
    }
    setSearchParams(params);
  };

  const filteredSensors = useMemo(() => {
    if (!activeZoneId) return sensors;
    if (activeZoneId === 'ungrouped') return sensors.filter(s => !s.zone_id);
    const zoneIdNum = Number(activeZoneId);
    return sensors.filter(s => s.zone_id === zoneIdNum);
  }, [sensors, activeZoneId]);

  const activeDevice = devices.find(d => d.device_id === activeDeviceId);
  const activeZone = activeZoneId === 'ungrouped'
    ? { name: 'Ungrouped' }
    : zones.find(z => z.id === Number(activeZoneId));

  const sensorColumns = [
    {
      Header: 'Sensor',
      accessor: 'name',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cell: ({ value }: { value: string | null }, row: any) => (
        <div>
          {isDemo ? (
            <div className="text-text font-medium">{value || `Sensor ${row.sensor_id}`}</div>
          ) : (
            <InlineEdit
              value={value || `Sensor ${row.sensor_id}`}
              onSave={async (newName) => {
                await updateSensor(row.id, { name: newName });
                fetchData();
              }}
              className="text-text font-medium"
            />
          )}
          <div className="text-xs text-text-muted font-mono">ID: {row.sensor_id}</div>
        </div>
      ),
    },
    {
      Header: 'Moisture',
      accessor: 'id',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cell: ({ value }: { value: number }) => {
        const data = moistureMap[value];
        if (!data || data.moisture === null) {
          return <span className="text-text-muted text-sm">No data</span>;
        }
        const m = data.moisture;
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
      Header: 'Device',
      accessor: 'device.name',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cell: ({ value }: { value: string }, row: any) => (
        <div>
          <div className="text-text-secondary text-sm">{value}</div>
          <div className="text-xs text-text-muted font-mono">{row.device?.device_id || row.device_id}</div>
        </div>
      ),
    },
    {
      Header: 'Zone',
      accessor: 'zone_id',
      Cell: ({ value }: { value: number | null }) => {
        const zone = zones.find(z => z.id === value);
        return zone
          ? <span className="badge bg-accent-glow text-accent border border-accent/15">{zone.name}</span>
          : <span className="text-text-muted text-sm">—</span>;
      },
    },
    {
      Header: 'Threshold',
      accessor: 'threshold',
      Cell: ({ value }: { value: Sensor['threshold'] }) =>
        value ? (
          <span className="data-value text-sm">
            {value.min_moisture ?? '—'} – {value.max_moisture ?? '—'}%
          </span>
        ) : (
          <span className="text-text-muted text-sm">Not set</span>
        ),
    },
    {
      Header: 'Health',
      accessor: 'health',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cell: (_props: any, row: any) => {
        const h = healthMap[row.id];
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
      },
    },
    {
      Header: 'Calibration',
      accessor: 'calibration_dry',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cell: (_props: any, row: any) => {
        const calibrated = row.calibration_dry !== null && row.calibration_wet !== null;
        return calibrated ? (
          <span className="badge bg-accent-glow text-accent border border-accent/15">Calibrated</span>
        ) : (
          <span className="badge bg-soil-glow text-soil border border-soil/15">Uncalibrated</span>
        );
      },
    },
    {
      Header: '',
      accessor: 'actions',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cell: (_props: any, row: any) => (
        <div className="flex gap-2 justify-end">
          <Link
            to={`/plant/${row.id}`}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Details
          </Link>
          {!isDemo && (
            <button
              className="btn-secondary text-xs py-1.5 px-3"
              onClick={() => setCalibratingSensor(row as Sensor)}
            >
              Calibrate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={activeDeviceId}
          onChange={(e) => setFilter('deviceId', e.target.value)}
          className="input !w-auto"
        >
          <option value="">All Devices</option>
          {devices.map((device) => (
            <option key={device.id} value={device.device_id}>
              {device.name}
            </option>
          ))}
        </select>
        <select
          value={activeZoneId}
          onChange={(e) => setFilter('zoneId', e.target.value)}
          className="input !w-auto"
        >
          <option value="">All Zones</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
          <option value="ungrouped">Ungrouped</option>
        </select>
        {(activeDevice || activeZone) && (
          <span className="text-sm text-text-muted">
            {activeDevice && <>Device: <span className="text-text font-medium">{activeDevice.name}</span></>}
            {activeDevice && activeZone && <> · </>}
            {activeZone && <>Zone: <span className="text-text font-medium">{activeZone.name}</span></>}
          </span>
        )}
        <span className="ml-auto text-sm text-text-muted">
          <span className="data-value">{filteredSensors.length}</span> sensor{filteredSensors.length !== 1 ? 's' : ''}
        </span>
      </div>

      <DataTable columns={sensorColumns} data={filteredSensors} />

      {calibratingSensor && (
        <CalibrationWizard
          sensor={calibratingSensor}
          open={true}
          onClose={() => setCalibratingSensor(null)}
          onCalibrated={fetchData}
        />
      )}
    </div>
  );
};

export default Sensors;
