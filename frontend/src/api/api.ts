import axios from 'axios';
import { Device, Sensor, Reading, Alert, Threshold, SensorUpdate } from '../types';

const API_URL = 'http://localhost:8000';

export const getDevices = async (): Promise<Device[]> => {
  const response = await axios.get(`${API_URL}/devices`);
  return response.data;
};

export const createDevice = async (deviceData: { name: string; device_id: string }): Promise<Device> => {
  const response = await axios.post(`${API_URL}/devices`, deviceData);
  return response.data;
};

export const getSensors = async (deviceId?: string): Promise<Sensor[]> => {
  const response = await axios.get(`${API_URL}/sensors`, {
    params: deviceId ? { device_id: deviceId } : {}
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.map((sensor: any) => ({
    ...sensor,
    original: sensor // Add this line
  }));
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

export const getAlerts = async (): Promise<Alert[]> => {
  const response = await axios.get(`${API_URL}/alerts`);
  return response.data;
};

export const markAlertAsRead = async (alertId: number): Promise<void> => {
  await axios.put(`${API_URL}/alerts/${alertId}/read`);
};

export const getThreshold = async (sensorId: number): Promise<Threshold> => {
  const response = await axios.get(`${API_URL}/sensors/${sensorId}/threshold`);
  return response.data;
};

export const setThreshold = async (sensorId: number, threshold: Threshold): Promise<Threshold> => {
  const response = await axios.post(`${API_URL}/sensors/${sensorId}/threshold`, threshold);
  return response.data;
};

export const createSensor = async (sensorData: { device_id: number; sensor_id: number; name: string }): Promise<Sensor> => {
  const response = await axios.post(`${API_URL}/sensors`, sensorData);
  return response.data;
};

export const updateSensor = async (sensorId: number, sensorData: SensorUpdate): Promise<Sensor> => {
  const response = await axios.put(`${API_URL}/sensors/${sensorId}`, sensorData);
  return response.data;
};
