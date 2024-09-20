from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    devices = relationship("Device", back_populates="owner")
    plants = relationship("Plant", back_populates="owner")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    mac_address = Column(String, unique=True, index=True)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="devices")
    sensors = relationship("Sensor", back_populates="device")

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    pin = Column(Integer)
    device_id = Column(Integer, ForeignKey("devices.id"))

    device = relationship("Device", back_populates="sensors")
    moisture_readings = relationship("MoistureReading", back_populates="sensor")
    plant = relationship("Plant", back_populates="sensor", uselist=False)

class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    species = Column(String)
    location = Column(String)
    moisture_threshold = Column(Float)
    owner_id = Column(Integer, ForeignKey("users.id"))
    sensor_id = Column(Integer, ForeignKey("sensors.id"), unique=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))

    owner = relationship("User", back_populates="plants")
    sensor = relationship("Sensor", back_populates="plant")
    zone = relationship("Zone", back_populates="plants")
    watering_events = relationship("WateringEvent", back_populates="plant")

class MoistureReading(Base):
    __tablename__ = "moisture_readings"

    id = Column(Integer, primary_key=True, index=True)
    value = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    sensor_id = Column(Integer, ForeignKey("sensors.id"))

    sensor = relationship("Sensor", back_populates="moisture_readings")

class WateringEvent(Base):
    __tablename__ = "watering_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    duration = Column(Float)  # Duration in seconds
    amount = Column(Float)  # Amount of water in milliliters
    is_automatic = Column(Boolean, default=False)
    plant_id = Column(Integer, ForeignKey("plants.id"))

    plant = relationship("Plant", back_populates="watering_events")

class WateringSchedule(Base):
    __tablename__ = "watering_schedules"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"))
    day_of_week = Column(Integer)  # 0-6, where 0 is Monday
    time = Column(String)  # Format: "HH:MM"
    duration = Column(Float)  # Duration in seconds
    amount = Column(Float)  # Amount of water in milliliters

    plant = relationship("Plant")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)

    plants = relationship("Plant", back_populates="zone")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)  # e.g., "low_moisture", "system_error"
    message = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    is_resolved = Column(Boolean, default=False)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)

    plant = relationship("Plant")
    device = relationship("Device")