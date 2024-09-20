# schemas.py

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ReadingBase(BaseModel):
    moisture: float

class ReadingCreate(ReadingBase):
    device_id: str
    sensor_id: int

class Reading(ReadingBase):
    id: int
    sensor_id: int
    timestamp: datetime

    class Config:
        orm_mode = True

class ThresholdBase(BaseModel):
    min_moisture: Optional[float] = None
    max_moisture: Optional[float] = None

class ThresholdCreate(ThresholdBase):
    pass

class Threshold(ThresholdBase):
    id: int
    sensor_id: int

    class Config:
        orm_mode = True

class SensorBase(BaseModel):
    sensor_id: int
    name: Optional[str] = None

class SensorCreate(SensorBase):
    device_id: int

class Sensor(SensorBase):
    id: int
    device_id: int
    threshold: Optional[Threshold] = None

    class Config:
        orm_mode = True

class DeviceBase(BaseModel):
    device_id: str
    name: Optional[str] = None

class DeviceCreate(DeviceBase):
    pass

class Device(DeviceBase):
    id: int
    sensors: List[Sensor] = []

    class Config:
        orm_mode = True

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
        orm_mode = True
