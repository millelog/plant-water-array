from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

# Device schemas
class DeviceBase(BaseModel):
    name: str
    mac_address: str

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    mac_address: Optional[str] = None

class Device(DeviceBase):
    id: int
    last_seen: datetime
    owner_id: int

    class Config:
        from_attributes = True

# Sensor schemas
class SensorBase(BaseModel):
    name: str
    pin: int
    device_id: int

class SensorCreate(SensorBase):
    pass

class SensorUpdate(BaseModel):
    name: Optional[str] = None
    pin: Optional[int] = None

class Sensor(SensorBase):
    id: int

    class Config:
        from_attributes = True

# Plant schemas
class PlantBase(BaseModel):
    name: str
    species: Optional[str] = None
    location: Optional[str] = None
    moisture_threshold: float = Field(..., ge=0, le=100)

class PlantCreate(PlantBase):
    sensor_id: int
    zone_id: Optional[int] = None

class PlantUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    location: Optional[str] = None
    moisture_threshold: Optional[float] = Field(None, ge=0, le=100)
    sensor_id: Optional[int] = None
    zone_id: Optional[int] = None

class Plant(PlantBase):
    id: int
    owner_id: int
    sensor_id: int
    zone_id: Optional[int] = None

    class Config:
        from_attributes = True

# MoistureReading schemas
class MoistureReadingBase(BaseModel):
    value: float = Field(..., ge=0, le=100)

class MoistureReadingCreate(MoistureReadingBase):
    pass

class MoistureReading(MoistureReadingBase):
    id: int
    timestamp: datetime
    sensor_id: int

    class Config:
        from_attributes = True

# WateringEvent schemas
class WateringEventBase(BaseModel):
    plant_id: int
    duration: float
    amount: float
    is_automatic: bool = False

class WateringEventCreate(WateringEventBase):
    pass

class WateringEvent(WateringEventBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# WateringSchedule schemas
class WateringScheduleBase(BaseModel):
    plant_id: int
    day_of_week: int = Field(..., ge=0, le=6)
    time: str
    duration: float
    amount: float

class WateringScheduleCreate(WateringScheduleBase):
    pass

class WateringScheduleUpdate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    time: Optional[str] = None
    duration: Optional[float] = None
    amount: Optional[float] = None

class WateringSchedule(WateringScheduleBase):
    id: int

    class Config:
        from_attributes = True

# Zone schemas
class ZoneBase(BaseModel):
    name: str
    description: Optional[str] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Zone(ZoneBase):
    id: int

    class Config:
        from_attributes = True

# Alert schemas
class AlertBase(BaseModel):
    type: str
    message: str
    plant_id: Optional[int] = None
    device_id: Optional[int] = None

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    type: Optional[str] = None
    message: Optional[str] = None
    is_resolved: Optional[bool] = None

class Alert(AlertBase):
    id: int
    timestamp: datetime
    is_resolved: bool

    class Config:
        from_attributes = True