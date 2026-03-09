// src/types.ts

export interface Device {
  id: number;
  device_id: string;
  name: string;
  firmware_version?: string;
  ip_address?: string;
  mac_address?: string;
  last_seen?: string;
  sensors: Sensor[];
}

export interface DeviceCreate {
  name: string;
  device_id: string;
}

export interface Sensor {
  id: number;
  sensor_id: number;
  device_id: string;
  name: string | null;
  threshold: Threshold | null;
  calibration_dry: number | null;
  calibration_wet: number | null;
  device: Device;
}

export interface SensorCreate {
  device_id: string;
  sensor_id: number;
  name?: string;
}

export interface SensorUpdate {
  name?: string;
}

export interface Threshold {
  id: number;
  sensor_id: number;
  min_moisture: number | null;
  max_moisture: number | null;
}

export interface Reading {
  id: number;
  sensor_id: number;
  moisture: number;
  timestamp: string;
  raw_adc?: number | null;
}

export interface Alert {
  id: number;
  sensor_id: number;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface CalibrationData {
  calibration_dry: number | null;
  calibration_wet: number | null;
}

export interface LatestRawReading {
  raw_adc: number;
  timestamp: string;
}

export interface FirmwareInfo {
  id: number;
  version: string;
  filename: string;
  upload_timestamp: string;
  checksum: string;
  size_bytes: number;
  notes?: string;
}
