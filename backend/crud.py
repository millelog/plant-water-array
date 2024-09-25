# crud.py

from sqlalchemy.orm import Session, joinedload
import models, schemas
from datetime import datetime
from sqlalchemy import func
import uuid
import logging

def get_device_by_device_id(db: Session, device_id: str):
    return db.query(models.Device).filter(models.Device.device_id == device_id).first()

def get_device_by_name(db: Session, name: str):
    return db.query(models.Device).filter(models.Device.name == name).first()

def create_device(db: Session, device: schemas.DeviceCreate):
    db_device = models.Device(device_id=device.device_id, name=device.name)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def get_sensors(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Sensor).options(joinedload(models.Sensor.device)).offset(skip).limit(limit).all()

def get_sensor_by_sensor_id(db: Session, device_id: int, sensor_id: int):
    return db.query(models.Sensor).filter(
        models.Sensor.device_id == device_id,
        models.Sensor.sensor_id == sensor_id
    ).first()
    
def get_sensors_by_device_id(db: Session, device_id: str):
    return db.query(models.Sensor).join(models.Device).filter(models.Device.device_id == device_id).all()

def update_sensor(db: Session, sensor_id: int, sensor_update: schemas.SensorUpdate):
    db_sensor = db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()
    if db_sensor:
        for key, value in sensor_update.dict(exclude_unset=True).items():
            setattr(db_sensor, key, value)
        db.commit()
        db.refresh(db_sensor)
    return db_sensor

def create_sensor(db: Session, sensor: schemas.SensorCreate):
    db_sensor = models.Sensor(
        device_id=sensor.device_id,
        sensor_id=sensor.sensor_id,
        name=sensor.name
    )
    db.add(db_sensor)
    db.commit()
    db.refresh(db_sensor)
    return db_sensor

def create_reading(db: Session, reading: schemas.ReadingCreate):
    db_device = get_device_by_device_id(db, device_id=reading.device_id)
    if not db_device:
        raise ValueError("Device not found")
    
    db_sensor = get_sensor_by_sensor_id(db, device_id=db_device.id, sensor_id=reading.sensor_id)
    if not db_sensor:
        db_sensor = create_sensor(db, schemas.SensorCreate(device_id=db_device.id, sensor_id=reading.sensor_id))

    db_reading = models.Reading(
        device_id=reading.device_id,
        sensor_id=db_sensor.id,
        moisture=reading.moisture,
        timestamp=datetime.utcnow()
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)

    # Check thresholds and create alerts
    db_sensor = db.query(models.Sensor).filter(models.Sensor.id == reading.sensor_id).first()
    if db_sensor and db_sensor.threshold:
        threshold = db_sensor.threshold
        if threshold.min_moisture is not None and reading.moisture < threshold.min_moisture:
            alert_message = f"Moisture level below minimum threshold: {reading.moisture}"
            create_alert(db, schemas.AlertCreate(sensor_id=reading.sensor_id, message=alert_message))
        if threshold.max_moisture is not None and reading.moisture > threshold.max_moisture:
            alert_message = f"Moisture level above maximum threshold: {reading.moisture}"
            create_alert(db, schemas.AlertCreate(sensor_id=reading.sensor_id, message=alert_message))

    return db_reading

def get_readings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Reading).offset(skip).limit(limit).all()

def get_readings_by_sensor(db: Session, device_id: str, sensor_id: int, start_time: datetime = None, end_time: datetime = None, skip: int = 0, limit: int = None):
    logging.info(f"Fetching readings for device_id: {device_id}, sensor_id: {sensor_id}, limit: {limit}")
    query = db.query(models.Reading).filter(models.Reading.device_id == device_id, models.Reading.sensor_id == sensor_id)
    if start_time:
        query = query.filter(models.Reading.timestamp >= start_time)
    if end_time:
        query = query.filter(models.Reading.timestamp <= end_time)
    if limit is not None:
        query = query.limit(limit)
    readings = query.offset(skip).all()
    logging.info(f"Found {len(readings)} readings")
    return readings

def create_alert(db: Session, alert: schemas.AlertCreate):
    db_alert = models.Alert(
        sensor_id=alert.sensor_id,
        message=alert.message,
        timestamp=datetime.utcnow(),
        read=False
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alerts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Alert).offset(skip).limit(limit).all()

def mark_alert_as_read(db: Session, alert_id: int):
    db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if db_alert:
        db_alert.read = True
        db.commit()
        db.refresh(db_alert)
    return db_alert

def get_threshold(db: Session, sensor_id: int):
    return db.query(models.Threshold).filter(models.Threshold.sensor_id == sensor_id).first()

def set_threshold(db: Session, sensor_id: int, threshold_data: schemas.ThresholdCreate):
    db_threshold = get_threshold(db, sensor_id)
    if db_threshold:
        db_threshold.min_moisture = threshold_data.min_moisture
        db_threshold.max_moisture = threshold_data.max_moisture
    else:
        db_threshold = models.Threshold(
            sensor_id=sensor_id,
            min_moisture=threshold_data.min_moisture,
            max_moisture=threshold_data.max_moisture
        )
        db.add(db_threshold)
    db.commit()
    db.refresh(db_threshold)
    return db_threshold
