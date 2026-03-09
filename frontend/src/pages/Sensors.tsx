import React, { useEffect, useState, useCallback } from 'react';
import { getSensors, createSensor, getDevices } from '../api/api';
import DataTable from '../components/DataTable';
import CalibrationWizard from '../components/CalibrationWizard';
import { Sensor, SensorCreate, Device } from '../types';
import { useSearchParams } from 'react-router-dom';

const Sensors: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [newSensor, setNewSensor] = useState<SensorCreate>({
    device_id: '',
    sensor_id: 0,
    name: '',
  });
  const [calibratingSensor, setCalibratingSensor] = useState<Sensor | null>(null);
  const [searchParams] = useSearchParams();

  const fetchData = useCallback(async () => {
    const deviceId = searchParams.get('deviceId');
    const [sensorsData, devicesData] = await Promise.all([
      getSensors(deviceId || undefined),
      getDevices()
    ]);
    setSensors(sensorsData);
    setDevices(devicesData);
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateSensor(e: React.FormEvent) {
    e.preventDefault();
    if (newSensor.name) {
      await createSensor({
        device_id: newSensor.device_id,
        sensor_id: newSensor.sensor_id,
        name: newSensor.name
      });
      setNewSensor({ device_id: '', sensor_id: 0, name: '' });
      fetchData();
    } else {
      console.error('Sensor name is required');
    }
  }

  const sensorColumns = [
    {
      Header: 'Sensor',
      accessor: 'name',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cell: ({ value }: { value: string | null }, row: any) => (
        <div>
          <div className="text-text font-medium">{value || `Sensor ${row.sensor_id}`}</div>
          <div className="text-xs text-text-muted font-mono">ID: {row.sensor_id}</div>
        </div>
      ),
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
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            onClick={() => setCalibratingSensor(row as Sensor)}
          >
            Calibrate
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add sensor form */}
      <div className="card p-5">
        <div className="section-title mb-4">Add Sensor</div>
        <form onSubmit={handleCreateSensor}>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={newSensor.device_id || ''}
              onChange={(e) => setNewSensor({ ...newSensor, device_id: e.target.value })}
              className="input sm:flex-1"
              required
            >
              <option value="">Select Device</option>
              {devices.map((device) => (
                <option key={device.id} value={device.device_id}>
                  {device.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Sensor ID"
              value={newSensor.sensor_id || ''}
              onChange={(e) => setNewSensor({ ...newSensor, sensor_id: Number(e.target.value) })}
              className="input sm:flex-1"
              required
            />
            <input
              type="text"
              placeholder="Sensor Name"
              value={newSensor.name || ''}
              onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
              className="input sm:flex-1"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Add Sensor
            </button>
          </div>
        </form>
      </div>

      <DataTable columns={sensorColumns} data={sensors} />

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
