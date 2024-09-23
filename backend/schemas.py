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

class Reading(ReadingBase):
    id: int
    device_id: str
    sensor_id: int
    timestamp: datetime

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
    device_id: int
    sensor_id: int
    name: str

class SensorUpdate(BaseModel):
    sensor_id: Optional[int] = None
    name: Optional[str] = None

    class Config:
        from_attributes = True

class Sensor(SensorBase):
    id: int
    device_id: int
    threshold: Optional[Threshold] = None

    class Config:
        from_attributes = True



class DeviceCreate(BaseModel):
    name: str
    device_id: str

class Device(BaseModel):
    id: int
    device_id: str
    name: str
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
