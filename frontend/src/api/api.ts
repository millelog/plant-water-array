import axios from 'axios';
import { Device, DeviceCreate, Sensor, SensorCreate, Reading, Alert, Threshold } from '../types';

const API_BASE_URL = 'http://localhost:8000';

export async function getDevices(): Promise<Device[]> {
  const response = await axios.get(`${API_BASE_URL}/devices/`);
  return response.data;
}

export async function createDevice(device: DeviceCreate): Promise<Device> {
  const response = await axios.post(`${API_BASE_URL}/devices/`, device);
  return response.data;
}

export async function getSensors(): Promise<Sensor[]> {
  const response = await axios.get(`${API_BASE_URL}/sensors/`);
  return response.data;
}

export async function createSensor(sensor: SensorCreate): Promise<Sensor> {
  const response = await axios.post(`${API_BASE_URL}/sensors/`, sensor);
  return response.data;
}

export async function setSensorThreshold(
  sensorId: number,
  threshold: Threshold
): Promise<Threshold> {
  const response = await axios.post(
    `${API_BASE_URL}/sensors/${sensorId}/threshold`,
    threshold
  );
  return response.data;
}

export async function getReadings(): Promise<Reading[]> {
  const response = await axios.get(`${API_BASE_URL}/readings/`);
  return response.data;
}

export async function getAlerts(params = {}): Promise<Alert[]> {
  const response = await axios.get(`${API_BASE_URL}/alerts/`, { params });
  return response.data;
}

export async function markAlertAsRead(alertId: number): Promise<Alert> {
  const response = await axios.put(`${API_BASE_URL}/alerts/${alertId}`);
  return response.data;
}
