# schemas.py

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List


class ReadingBase(BaseModel):
    moisture: float


class ReadingCreate(BaseModel):
    device_id: str
    sensor_id: int
    moisture: float
    raw_adc: Optional[float] = None


class Reading(ReadingBase):
    id: int
    device_id: str
    sensor_id: int
    timestamp: datetime
    raw_adc: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ThresholdBase(BaseModel):
    min_moisture: Optional[float] = None
    max_moisture: Optional[float] = None


class ThresholdCreate(ThresholdBase):
    pass


class Threshold(ThresholdBase):
    id: int
    sensor_id: int

    model_config = ConfigDict(from_attributes=True)


class SensorBase(BaseModel):
    sensor_id: int
    name: Optional[str] = None


class SensorCreate(BaseModel):
    device_id: str
    sensor_id: int
    name: Optional[str] = None


class SensorUpdate(BaseModel):
    sensor_id: Optional[int] = None
    name: Optional[str] = None
    zone_id: Optional[int] = None
    notes: Optional[str] = None
    auto_log_watering: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class Sensor(SensorBase):
    id: int
    device_id: str
    zone_id: Optional[int] = None
    threshold: Optional[Threshold] = None
    calibration_dry: Optional[float] = None
    calibration_wet: Optional[float] = None
    notes: Optional[str] = None
    auto_log_watering: bool = False

    model_config = ConfigDict(from_attributes=True)


class CalibrationData(BaseModel):
    calibration_dry: Optional[float] = None
    calibration_wet: Optional[float] = None


class DeviceCreate(BaseModel):
    name: str
    device_id: str


class DeviceUpdate(BaseModel):
    name: Optional[str] = None


class DeviceRegister(BaseModel):
    name: str
    device_id: Optional[str] = None
    firmware_version: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None


class Device(BaseModel):
    id: int
    device_id: str
    name: str
    firmware_version: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    last_seen: Optional[datetime] = None
    sensors: List[Sensor] = []

    model_config = ConfigDict(from_attributes=True)


class AlertBase(BaseModel):
    message: str


class AlertCreate(AlertBase):
    sensor_id: int


class Alert(AlertBase):
    id: int
    sensor_id: int
    timestamp: datetime
    read: bool

    model_config = ConfigDict(from_attributes=True)


class DeviceHeartbeat(BaseModel):
    firmware_version: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None


class FirmwareCheckResponse(BaseModel):
    update_available: bool
    version: Optional[str] = None
    download_url: Optional[str] = None
    checksum: Optional[str] = None


class FirmwareInfo(BaseModel):
    id: int
    version: str
    filename: str
    upload_timestamp: datetime
    checksum: str
    size_bytes: int
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Zone schemas

class ZoneCreate(BaseModel):
    name: str
    sort_order: Optional[int] = 0


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None


class Zone(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


# Dashboard summary schemas

class SparklinePoint(BaseModel):
    hour: str
    moisture: float


class SensorSummary(BaseModel):
    id: int
    sensor_id: int
    name: Optional[str] = None
    device_id: str
    device_name: str
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    current_moisture: Optional[float] = None
    last_reading_time: Optional[datetime] = None
    sparkline: List[SparklinePoint] = []
    trend: str = "stable"  # rising, falling, stable
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    status: str = "no-data"  # healthy, dry, wet, no-data
    days_since_watered: Optional[int] = None


class DashboardStats(BaseModel):
    total_devices: int
    online_devices: int
    total_sensors: int
    sensors_needing_water: int
    unread_alert_count: int


class DashboardSummary(BaseModel):
    stats: DashboardStats
    sensors: List[SensorSummary]


# System config schemas

class SystemConfigBase(BaseModel):
    reading_interval: int = 10
    device_timeout: int = 5
    ota_check_interval: int = 300
    moisture_jump_threshold: float = 15.0
    ntfy_enabled: bool = False
    ntfy_server_url: str = "https://ntfy.sh"
    ntfy_topic: Optional[str] = None
    weather_latitude: Optional[float] = None
    weather_longitude: Optional[float] = None


class SystemConfigUpdate(BaseModel):
    reading_interval: Optional[int] = None
    device_timeout: Optional[int] = None
    ota_check_interval: Optional[int] = None
    moisture_jump_threshold: Optional[float] = None
    ntfy_enabled: Optional[bool] = None
    ntfy_server_url: Optional[str] = None
    ntfy_topic: Optional[str] = None
    weather_latitude: Optional[float] = None
    weather_longitude: Optional[float] = None


class SystemConfig(SystemConfigBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# Watering log schemas

class WateringLogCreate(BaseModel):
    sensor_id: int
    notes: Optional[str] = None
    method: str = "manual"


class WateringLog(BaseModel):
    id: int
    sensor_id: int
    timestamp: datetime
    notes: Optional[str] = None
    method: str

    model_config = ConfigDict(from_attributes=True)


# Heartbeat response schemas

class HeartbeatSensorConfig(BaseModel):
    sensor_id: int
    name: Optional[str] = None
    calibration_dry: Optional[float] = None
    calibration_wet: Optional[float] = None
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None


class HeartbeatResponse(BaseModel):
    id: int
    device_id: str
    name: str
    firmware_version: Optional[str] = None
    reading_interval: int
    ota_check_interval: int
    sensors: List[HeartbeatSensorConfig] = []


# Aggregated readings schemas

class AggregatedReadingPoint(BaseModel):
    period_start: str
    avg_moisture: float
    min_moisture: float
    max_moisture: float
    reading_count: int


class AggregatedReadingsResponse(BaseModel):
    sensor_id: int
    period: str
    data: list[AggregatedReadingPoint]


# Drying rate schema

class DryingRateResponse(BaseModel):
    sensor_id: int
    rate_per_hour: Optional[float] = None
    rate_per_day: Optional[float] = None
    estimated_days_until_dry: Optional[float] = None
    dry_threshold: float
    current_moisture: Optional[float] = None
    data_points_used: int
    period_days: int
