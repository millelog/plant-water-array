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
  zone_id: number | null;
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
  zone_id?: number | null;
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

export interface Zone {
  id: number;
  name: string;
  sort_order: number;
}

export interface SparklinePoint {
  hour: string;
  moisture: number;
}

export interface SensorSummary {
  id: number;
  sensor_id: number;
  name: string | null;
  device_id: string;
  device_name: string;
  zone_id: number | null;
  zone_name: string | null;
  current_moisture: number | null;
  last_reading_time: string | null;
  sparkline: SparklinePoint[];
  trend: 'rising' | 'falling' | 'stable';
  threshold_min: number | null;
  threshold_max: number | null;
  status: 'healthy' | 'dry' | 'wet' | 'no-data';
}

export interface DashboardStats {
  total_devices: number;
  online_devices: number;
  total_sensors: number;
  sensors_needing_water: number;
  unread_alert_count: number;
}

export interface DashboardSummary {
  stats: DashboardStats;
  sensors: SensorSummary[];
}
