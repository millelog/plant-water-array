# crud.py

from sqlalchemy.orm import Session
import models, schemas
from datetime import datetime

def get_device_by_device_id(db: Session, device_id: str):
    return db.query(models.Device).filter(models.Device.device_id == device_id).first()

def create_device(db: Session, device: schemas.DeviceCreate):
    db_device = models.Device(device_id=device.device_id, name=device.name)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def get_sensor_by_sensor_id(db: Session, device_id: int, sensor_id: int):
    return db.query(models.Sensor).filter(
        models.Sensor.device_id == device_id,
        models.Sensor.sensor_id == sensor_id
    ).first()

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
    db_reading = models.Reading(
        sensor_id=reading.sensor_id,
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

def get_readings_by_sensor(db: Session, sensor_id: int, start_time: datetime = None, end_time: datetime = None):
    query = db.query(models.Reading).filter(models.Reading.sensor_id == sensor_id)
    if start_time:
        query = query.filter(models.Reading.timestamp >= start_time)
    if end_time:
        query = query.filter(models.Reading.timestamp <= end_time)
    return query.all()

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
