# models.py

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    sensors = relationship("Sensor", back_populates="device")

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer)  # Sensor ID unique within a device
    device_id = Column(Integer, ForeignKey("devices.id"))
    name = Column(String, nullable=True)

    device = relationship("Device", back_populates="sensors")
    readings = relationship("Reading", back_populates="sensor")
    threshold = relationship("Threshold", uselist=False, back_populates="sensor")

class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    moisture = Column(Float)

    sensor = relationship("Sensor", back_populates="readings")

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
    timestamp = Column(DateTime, default=datetime.utcnow)
    message = Column(String)
    read = Column(Boolean, default=False)

    sensor = relationship("Sensor")
