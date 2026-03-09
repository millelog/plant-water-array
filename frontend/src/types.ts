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

export interface Sensor {
  id: number;
  sensor_id: number;
  device_id: string;
  name: string | null;
  zone_id: number | null;
  threshold: Threshold | null;
  calibration_dry: number | null;
  calibration_wet: number | null;
  notes: string | null;
  auto_log_watering: boolean;
  device: Device;
}

export interface SensorUpdate {
  name?: string;
  zone_id?: number | null;
  notes?: string;
  auto_log_watering?: boolean;
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
  days_since_watered: number | null;
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

export interface SystemConfig {
  id: number;
  reading_interval: number;
  device_timeout: number;
  ota_check_interval: number;
  moisture_jump_threshold: number;
  ntfy_enabled: boolean;
  ntfy_server_url: string;
  ntfy_topic: string | null;
  weather_latitude: number | null;
  weather_longitude: number | null;
  retention_days: number;
}

export interface SystemConfigUpdate {
  reading_interval?: number;
  device_timeout?: number;
  ota_check_interval?: number;
  moisture_jump_threshold?: number;
  ntfy_enabled?: boolean;
  ntfy_server_url?: string;
  ntfy_topic?: string | null;
  weather_latitude?: number | null;
  weather_longitude?: number | null;
  retention_days?: number;
}

export interface DatabaseStats {
  total_readings: number;
  database_size_bytes: number;
  database_size_human: string;
  oldest_reading: string | null;
  readings_per_day_avg: number;
  total_watering_logs: number;
  total_alerts: number;
}

export interface WateringLog {
  id: number;
  sensor_id: number;
  timestamp: string;
  notes: string | null;
  method: string;
}

export interface WateringLogCreate {
  sensor_id: number;
  notes?: string;
  method?: string;
}

export interface AggregatedReadingPoint {
  period_start: string;
  avg_moisture: number;
  min_moisture: number;
  max_moisture: number;
  reading_count: number;
}

export interface AggregatedReadingsResponse {
  sensor_id: number;
  period: string;
  data: AggregatedReadingPoint[];
}

export interface HeartbeatLogEntry {
  id: number;
  device_id: string;
  timestamp: string;
  ip_address: string | null;
  firmware_version: string | null;
}

export interface SensorHealthIndicator {
  sensor_db_id: number;
  reading_frequency_ok: boolean;
  last_reading_age_seconds: number | null;
  expected_interval_seconds: number;
  stuck_at_zero: boolean;
  stuck_at_max: boolean;
  flatline: boolean;
  variance: number | null;
  total_readings_checked: number;
}

export interface DryingRateResponse {
  sensor_id: number;
  rate_per_hour: number | null;
  rate_per_day: number | null;
  estimated_days_until_dry: number | null;
  dry_threshold: number;
  current_moisture: number | null;
  data_points_used: number;
  period_days: number;
}
