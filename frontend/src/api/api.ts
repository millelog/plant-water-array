import axios from 'axios';
import { Device, Sensor, Reading, Alert, Threshold, SensorUpdate, FirmwareInfo, CalibrationData, LatestRawReading, Zone, DashboardSummary, SystemConfig, SystemConfigUpdate } from '../types';

const API_URL = 'http://localhost:8000';

export const getDevices = async (): Promise<Device[]> => {
  const response = await axios.get(`${API_URL}/devices`);
  return response.data;
};

export const deleteDevice = async (deviceId: string): Promise<void> => {
  await axios.delete(`${API_URL}/devices/${deviceId}`);
};

export const getSensors = async (deviceId?: string): Promise<Sensor[]> => {
  const response = await axios.get(`${API_URL}/sensors`, {
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
  const response = await axios.get(`${API_URL}/alerts`, { params });
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

// Firmware API functions

export const getFirmwareList = async (): Promise<FirmwareInfo[]> => {
  const response = await axios.get(`${API_URL}/firmware/`);
  return response.data;
};

export const uploadFirmware = async (version: string, notes: string, files: File[]): Promise<FirmwareInfo> => {
  const formData = new FormData();
  formData.append('version', version);
  if (notes) {
    formData.append('notes', notes);
  }
  files.forEach((file) => {
    formData.append('files', file);
  });
  const response = await axios.post(`${API_URL}/firmware/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteFirmware = async (version: string): Promise<void> => {
  await axios.delete(`${API_URL}/firmware/${version}`);
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

// Readings cleanup

export const cleanupOldReadings = async (olderThanDays: number = 90): Promise<{ deleted: number }> => {
  const response = await axios.delete(`${API_URL}/readings/cleanup`, { params: { older_than_days: olderThanDays } });
  return response.data;
};
