import axios from 'axios';
import { Device, Sensor, Reading, Alert, Threshold, SensorUpdate, CalibrationData, LatestRawReading, Zone, DashboardSummary, SystemConfig, SystemConfigUpdate, WateringLog, WateringLogCreate, AggregatedReadingsResponse, DryingRateResponse, DatabaseStats, HeartbeatLogEntry, SensorHealthIndicator, CompareReadingsResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getDevices = async (): Promise<Device[]> => {
  const response = await axios.get(`${API_URL}/devices/`);
  return response.data;
};

export const updateDevice = async (deviceId: string, data: { name?: string }): Promise<Device> => {
  const response = await axios.patch(`${API_URL}/devices/${deviceId}`, data);
  return response.data;
};

export const deleteDevice = async (deviceId: string): Promise<void> => {
  await axios.delete(`${API_URL}/devices/${deviceId}`);
};

export const getSensors = async (deviceId?: string): Promise<Sensor[]> => {
  const response = await axios.get(`${API_URL}/sensors/`, {
    params: deviceId ? { device_id: deviceId } : {}
  });
  return response.data;
};

export const getReadings = async (deviceId: string, sensorId: number, limit?: number): Promise<Reading[]> => {
  const response = await axios.get(`${API_URL}/devices/${deviceId}/sensors/${sensorId}/readings`, {
    params: { limit }
  });
  return response.data;
};

export const createReading = async (deviceId: string, sensorId: number, moisture: number): Promise<Reading> => {
  const response = await axios.post(`${API_URL}/readings`, { device_id: deviceId, sensor_id: sensorId, moisture });
  return response.data;
};

export const getAlerts = async (params?: { sensor_id?: number; unread_only?: boolean }): Promise<Alert[]> => {
  const response = await axios.get(`${API_URL}/alerts/`, { params });
  return response.data;
};

export const markAlertAsRead = async (alertId: number): Promise<void> => {
  await axios.put(`${API_URL}/alerts/${alertId}`);
};

export const getUnreadAlertCount = async (): Promise<number> => {
  const response = await axios.get(`${API_URL}/alerts/unread-count`);
  return response.data.count;
};

export const markAllAlertsRead = async (): Promise<void> => {
  await axios.put(`${API_URL}/alerts/mark-all-read`);
};

export const getThreshold = async (sensorId: number): Promise<Threshold> => {
  const response = await axios.get(`${API_URL}/sensors/${sensorId}/threshold`);
  return response.data;
};

export const setThreshold = async (sensorId: number, threshold: Threshold): Promise<Threshold> => {
  const response = await axios.post(`${API_URL}/sensors/${sensorId}/threshold`, threshold);
  return response.data;
};

export const updateSensor = async (sensorId: number, sensorData: SensorUpdate): Promise<Sensor> => {
  const response = await axios.put(`${API_URL}/sensors/${sensorId}`, sensorData);
  return response.data;
};

export const getSensorDetail = async (sensorId: number): Promise<Sensor> => {
  const response = await axios.get(`${API_URL}/sensors/${sensorId}/detail`);
  return response.data;
};

// Calibration API functions

export const calibrateSensor = async (sensorId: number, data: CalibrationData): Promise<Sensor> => {
  const response = await axios.post(`${API_URL}/sensors/${sensorId}/calibrate`, data);
  return response.data;
};

export const getLatestRawReading = async (sensorId: number): Promise<LatestRawReading> => {
  const response = await axios.get(`${API_URL}/sensors/${sensorId}/latest-raw`);
  return response.data;
};

// Zone API functions

export const getZones = async (): Promise<Zone[]> => {
  const response = await axios.get(`${API_URL}/zones/`);
  return response.data;
};

export const createZone = async (data: { name: string; sort_order?: number }): Promise<Zone> => {
  const response = await axios.post(`${API_URL}/zones/`, data);
  return response.data;
};

export const updateZone = async (zoneId: number, data: { name?: string; sort_order?: number }): Promise<Zone> => {
  const response = await axios.put(`${API_URL}/zones/${zoneId}`, data);
  return response.data;
};

export const deleteZone = async (zoneId: number): Promise<void> => {
  await axios.delete(`${API_URL}/zones/${zoneId}`);
};

// Dashboard API functions

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await axios.get(`${API_URL}/dashboard/summary`);
  return response.data;
};

// System config

export const getSystemConfig = async (): Promise<SystemConfig> => {
  const response = await axios.get(`${API_URL}/config/`);
  return response.data;
};

export const updateSystemConfig = async (data: SystemConfigUpdate): Promise<SystemConfig> => {
  const response = await axios.put(`${API_URL}/config/`, data);
  return response.data;
};

// Watering logs

export const createWateringLog = async (data: WateringLogCreate): Promise<WateringLog> => {
  const response = await axios.post(`${API_URL}/watering-logs/`, data);
  return response.data;
};

export const getWateringLogs = async (sensorId: number, params?: { start_time?: string; end_time?: string }): Promise<WateringLog[]> => {
  const response = await axios.get(`${API_URL}/watering-logs/`, { params: { sensor_id: sensorId, ...params } });
  return response.data;
};

export const deleteWateringLog = async (logId: number): Promise<void> => {
  await axios.delete(`${API_URL}/watering-logs/${logId}`);
};

// Notifications

export const testNotification = async (): Promise<{ detail: string }> => {
  const response = await axios.post(`${API_URL}/config/test-notification`);
  return response.data;
};

// Aggregated readings & drying rate

export const getAggregatedReadings = async (sensorId: number, period: string, startTime?: string, endTime?: string): Promise<AggregatedReadingsResponse> => {
  const response = await axios.get(`${API_URL}/readings/sensor/${sensorId}/aggregated`, {
    params: { period, start_time: startTime, end_time: endTime },
  });
  return response.data;
};

export const getDryingRate = async (sensorId: number): Promise<DryingRateResponse> => {
  const response = await axios.get(`${API_URL}/readings/sensor/${sensorId}/drying-rate`);
  return response.data;
};

export const exportReadingsCsv = async (sensorId: number, startTime?: string, endTime?: string): Promise<void> => {
  const response = await axios.get(`${API_URL}/readings/export`, {
    params: { sensor_id: sensorId, start: startTime, end: endTime },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sensor_${sensorId}_readings.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Device detail & heartbeat history

export const getDevice = async (deviceId: string): Promise<Device> => {
  const response = await axios.get(`${API_URL}/devices/${deviceId}`);
  return response.data;
};

export const getHeartbeatHistory = async (deviceId: string, limit: number = 50): Promise<HeartbeatLogEntry[]> => {
  const response = await axios.get(`${API_URL}/devices/${deviceId}/heartbeats`, { params: { limit } });
  return response.data;
};

// Sensor health

export const getSensorHealth = async (sensorId: number): Promise<SensorHealthIndicator> => {
  const response = await axios.get(`${API_URL}/sensors/${sensorId}/health`);
  return response.data;
};

export const getSensorsHealthBatch = async (): Promise<SensorHealthIndicator[]> => {
  const response = await axios.get(`${API_URL}/sensors/health/batch`);
  return response.data;
};

// Readings cleanup

export const cleanupOldReadings = async (olderThanDays: number = 90): Promise<{ deleted: number }> => {
  const response = await axios.delete(`${API_URL}/readings/cleanup`, { params: { older_than_days: olderThanDays } });
  return response.data;
};

// Database admin

export const getDatabaseStats = async (): Promise<DatabaseStats> => {
  const response = await axios.get(`${API_URL}/admin/stats`);
  return response.data;
};

export const getCompareReadings = async (sensorIds: number[], hours: number): Promise<CompareReadingsResponse> => {
  const response = await axios.get(`${API_URL}/readings/compare`, {
    params: { sensor_ids: sensorIds.join(','), hours },
  });
  return response.data;
};

export const downloadBackup = async (): Promise<void> => {
  const response = await axios.get(`${API_URL}/admin/backup`, {
    responseType: 'blob',
  });
  const disposition = response.headers['content-disposition'];
  const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
  const filename = filenameMatch?.[1] || 'plant_water_array_backup.db';
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
