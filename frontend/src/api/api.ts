import axios from 'axios';
import { Device, Sensor, Reading, Alert, Threshold, SensorUpdate, CalibrationData, LatestRawReading, Zone, DashboardSummary, SystemConfig, SystemConfigUpdate, WateringLog, WateringLogCreate, AggregatedReadingsResponse, DryingRateResponse, DatabaseStats, HeartbeatLogEntry, SensorHealthIndicator, CompareReadingsResponse } from '../types';
import { refreshTokenApi } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_URL });

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { access_token } = await refreshTokenApi(refreshToken);
      localStorage.setItem('access_token', access_token);
      processQueue(null, access_token);
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const getDevices = async (): Promise<Device[]> => {
  const response = await api.get('/devices/');
  return response.data;
};

export const updateDevice = async (deviceId: string, data: { name?: string }): Promise<Device> => {
  const response = await api.patch(`/devices/${deviceId}`, data);
  return response.data;
};

export const deleteDevice = async (deviceId: string): Promise<void> => {
  await api.delete(`/devices/${deviceId}`);
};

export const getSensors = async (deviceId?: string): Promise<Sensor[]> => {
  const response = await api.get('/sensors/', {
    params: deviceId ? { device_id: deviceId } : {}
  });
  return response.data;
};

export const getReadings = async (deviceId: string, sensorId: number, limit?: number): Promise<Reading[]> => {
  const response = await api.get(`/devices/${deviceId}/sensors/${sensorId}/readings`, {
    params: { limit }
  });
  return response.data;
};

export const createReading = async (deviceId: string, sensorId: number, moisture: number): Promise<Reading> => {
  const response = await api.post('/readings', { device_id: deviceId, sensor_id: sensorId, moisture });
  return response.data;
};

export const getAlerts = async (params?: { sensor_id?: number; unread_only?: boolean }): Promise<Alert[]> => {
  const response = await api.get('/alerts/', { params });
  return response.data;
};

export const markAlertAsRead = async (alertId: number): Promise<void> => {
  await api.put(`/alerts/${alertId}`);
};

export const getUnreadAlertCount = async (): Promise<number> => {
  const response = await api.get('/alerts/unread-count');
  return response.data.count;
};

export const markAllAlertsRead = async (): Promise<void> => {
  await api.put('/alerts/mark-all-read');
};

export const getThreshold = async (sensorId: number): Promise<Threshold> => {
  const response = await api.get(`/sensors/${sensorId}/threshold`);
  return response.data;
};

export const setThreshold = async (sensorId: number, threshold: Threshold): Promise<Threshold> => {
  const response = await api.post(`/sensors/${sensorId}/threshold`, threshold);
  return response.data;
};

export const updateSensor = async (sensorId: number, sensorData: SensorUpdate): Promise<Sensor> => {
  const response = await api.put(`/sensors/${sensorId}`, sensorData);
  return response.data;
};

export const getSensorDetail = async (sensorId: number): Promise<Sensor> => {
  const response = await api.get(`/sensors/${sensorId}/detail`);
  return response.data;
};

// Calibration API functions

export const calibrateSensor = async (sensorId: number, data: CalibrationData): Promise<Sensor> => {
  const response = await api.post(`/sensors/${sensorId}/calibrate`, data);
  return response.data;
};

export const getLatestRawReading = async (sensorId: number): Promise<LatestRawReading> => {
  const response = await api.get(`/sensors/${sensorId}/latest-raw`);
  return response.data;
};

// Zone API functions

export const getZones = async (): Promise<Zone[]> => {
  const response = await api.get('/zones/');
  return response.data;
};

export const createZone = async (data: { name: string; sort_order?: number }): Promise<Zone> => {
  const response = await api.post('/zones/', data);
  return response.data;
};

export const updateZone = async (zoneId: number, data: { name?: string; sort_order?: number }): Promise<Zone> => {
  const response = await api.put(`/zones/${zoneId}`, data);
  return response.data;
};

export const deleteZone = async (zoneId: number): Promise<void> => {
  await api.delete(`/zones/${zoneId}`);
};

// Dashboard API functions

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

// System config

export const getSystemConfig = async (): Promise<SystemConfig> => {
  const response = await api.get('/config/');
  return response.data;
};

export const updateSystemConfig = async (data: SystemConfigUpdate): Promise<SystemConfig> => {
  const response = await api.put('/config/', data);
  return response.data;
};

// Watering logs

export const createWateringLog = async (data: WateringLogCreate): Promise<WateringLog> => {
  const response = await api.post('/watering-logs/', data);
  return response.data;
};

export const getWateringLogs = async (sensorId: number, params?: { start_time?: string; end_time?: string }): Promise<WateringLog[]> => {
  const response = await api.get('/watering-logs/', { params: { sensor_id: sensorId, ...params } });
  return response.data;
};

export const deleteWateringLog = async (logId: number): Promise<void> => {
  await api.delete(`/watering-logs/${logId}`);
};

// Notifications

export const testNotification = async (): Promise<{ detail: string }> => {
  const response = await api.post('/config/test-notification');
  return response.data;
};

// Aggregated readings & drying rate

export const getAggregatedReadings = async (sensorId: number, period: string, startTime?: string, endTime?: string): Promise<AggregatedReadingsResponse> => {
  const response = await api.get(`/readings/sensor/${sensorId}/aggregated`, {
    params: { period, start_time: startTime, end_time: endTime },
  });
  return response.data;
};

export const getDryingRate = async (sensorId: number): Promise<DryingRateResponse> => {
  const response = await api.get(`/readings/sensor/${sensorId}/drying-rate`);
  return response.data;
};

export const exportReadingsCsv = async (sensorId: number, startTime?: string, endTime?: string): Promise<void> => {
  const response = await api.get('/readings/export', {
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
  const response = await api.get(`/devices/${deviceId}`);
  return response.data;
};

export const getHeartbeatHistory = async (deviceId: string, limit: number = 50): Promise<HeartbeatLogEntry[]> => {
  const response = await api.get(`/devices/${deviceId}/heartbeats`, { params: { limit } });
  return response.data;
};

// Sensor health

export const getSensorHealth = async (sensorId: number): Promise<SensorHealthIndicator> => {
  const response = await api.get(`/sensors/${sensorId}/health`);
  return response.data;
};

export const getSensorsHealthBatch = async (): Promise<SensorHealthIndicator[]> => {
  const response = await api.get('/sensors/health/batch');
  return response.data;
};

// Readings cleanup

export const cleanupOldReadings = async (olderThanDays: number = 90): Promise<{ deleted: number }> => {
  const response = await api.delete('/readings/cleanup', { params: { older_than_days: olderThanDays } });
  return response.data;
};

// Database admin

export const getDatabaseStats = async (): Promise<DatabaseStats> => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getCompareReadings = async (sensorIds: number[], hours: number): Promise<CompareReadingsResponse> => {
  const response = await api.get('/readings/compare', {
    params: { sensor_ids: sensorIds.join(','), hours },
  });
  return response.data;
};

export const downloadBackup = async (): Promise<void> => {
  const response = await api.get('/admin/backup', {
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
