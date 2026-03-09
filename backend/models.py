# models.py

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    firmware_version = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    mac_address = Column(String, nullable=True)
    last_seen = Column(DateTime, nullable=True)

    sensors = relationship("Sensor", back_populates="device")


class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer)  # Sensor ID unique within a device
    device_id = Column(String, ForeignKey("devices.device_id"))
    name = Column(String, nullable=True)
    calibration_dry = Column(Float, nullable=True)
    calibration_wet = Column(Float, nullable=True)

    device = relationship("Device", back_populates="sensors")
    readings = relationship("Reading", back_populates="sensor")
    threshold = relationship("Threshold", uselist=False, back_populates="sensor")


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.device_id"))
    sensor_id = Column(Integer, ForeignKey("sensors.id"))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    moisture = Column(Float)
    raw_adc = Column(Float, nullable=True)

    sensor = relationship("Sensor", back_populates="readings")
    device = relationship("Device")


class Threshold(Base):
    __tablename__ = "thresholds"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), unique=True)
    min_moisture = Column(Float, nullable=True)
    max_moisture = Column(Float, nullable=True)

    sensor = relationship("Sensor", back_populates="threshold")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    message = Column(String)
    read = Column(Boolean, default=False)

    sensor = relationship("Sensor")


class Firmware(Base):
    __tablename__ = "firmware"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, unique=True, index=True)
    filename = Column(String)
    upload_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    checksum = Column(String)  # SHA-256
    size_bytes = Column(Integer)
    notes = Column(String, nullable=True)
