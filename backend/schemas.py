# schemas.py

from pydantic import BaseModel
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

    class Config:
        from_attributes = True


class ThresholdBase(BaseModel):
    min_moisture: Optional[float] = None
    max_moisture: Optional[float] = None


class ThresholdCreate(ThresholdBase):
    pass


class Threshold(ThresholdBase):
    id: int
    sensor_id: int

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


class Sensor(SensorBase):
    id: int
    device_id: str
    threshold: Optional[Threshold] = None
    calibration_dry: Optional[float] = None
    calibration_wet: Optional[float] = None

    class Config:
        from_attributes = True


class CalibrationData(BaseModel):
    calibration_dry: Optional[float] = None
    calibration_wet: Optional[float] = None


class DeviceCreate(BaseModel):
    name: str
    device_id: str


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

    class Config:
        from_attributes = True


class AlertBase(BaseModel):
    message: str


class AlertCreate(AlertBase):
    sensor_id: int


class Alert(AlertBase):
    id: int
    sensor_id: int
    timestamp: datetime
    read: bool

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True
