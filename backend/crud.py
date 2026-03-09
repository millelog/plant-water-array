# crud.py

from sqlalchemy.orm import Session, joinedload
import models, schemas
from datetime import datetime, timezone
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


def get_sensor_by_sensor_id(db: Session, device_id: str, sensor_id: int):
    return db.query(models.Sensor).join(models.Device).filter(
        models.Device.device_id == device_id,
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
    db_device = get_device_by_device_id(db, device_id=sensor.device_id)
    if not db_device:
        raise ValueError(f"Device with device_id {sensor.device_id} not found")

    db_sensor = models.Sensor(
        device_id=db_device.device_id,
        sensor_id=sensor.sensor_id,
        name=sensor.name
    )
    db.add(db_sensor)
    db.commit()
    db.refresh(db_sensor)
    return db_sensor


def compute_calibrated_moisture(raw_adc: float, cal_dry: float, cal_wet: float) -> float:
    if cal_dry == cal_wet:
        return 0.0
    pct = ((cal_dry - raw_adc) / (cal_dry - cal_wet)) * 100.0
    return max(0.0, min(100.0, round(pct, 1)))


def create_reading(db: Session, reading: schemas.ReadingCreate):
    db_device = get_device_by_device_id(db, device_id=reading.device_id)
    if not db_device:
        raise ValueError(f"Device with device_id {reading.device_id} not found")

    db_sensor = get_sensor_by_sensor_id(db, device_id=reading.device_id, sensor_id=reading.sensor_id)
    if not db_sensor:
        db_sensor = create_sensor(db, schemas.SensorCreate(device_id=reading.device_id, sensor_id=reading.sensor_id))

    moisture = reading.moisture
    if (reading.raw_adc is not None
            and db_sensor.calibration_dry is not None
            and db_sensor.calibration_wet is not None):
        moisture = compute_calibrated_moisture(
            reading.raw_adc, db_sensor.calibration_dry, db_sensor.calibration_wet
        )

    db_reading = models.Reading(
        device_id=reading.device_id,
        sensor_id=db_sensor.id,
        moisture=moisture,
        raw_adc=reading.raw_adc,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)

    # Check thresholds and create alerts
    if db_sensor.threshold:
        threshold = db_sensor.threshold
        if threshold.min_moisture is not None and moisture < threshold.min_moisture:
            alert_message = f"Moisture level below minimum threshold: {moisture}"
            create_alert(db, schemas.AlertCreate(sensor_id=db_sensor.id, message=alert_message))
        if threshold.max_moisture is not None and moisture > threshold.max_moisture:
            alert_message = f"Moisture level above maximum threshold: {moisture}"
            create_alert(db, schemas.AlertCreate(sensor_id=db_sensor.id, message=alert_message))

    return db_reading


def set_sensor_calibration(db: Session, sensor_id: int, calibration: schemas.CalibrationData):
    db_sensor = db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()
    if not db_sensor:
        return None
    db_sensor.calibration_dry = calibration.calibration_dry
    db_sensor.calibration_wet = calibration.calibration_wet
    db.commit()
    db.refresh(db_sensor)
    return db_sensor


def get_latest_raw_reading(db: Session, sensor_db_id: int):
    return (db.query(models.Reading)
            .filter(models.Reading.sensor_id == sensor_db_id,
                    models.Reading.raw_adc.isnot(None))
            .order_by(models.Reading.timestamp.desc())
            .first())


def get_readings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Reading).offset(skip).limit(limit).all()


def get_readings_by_sensor(db: Session, device_id: str, sensor_db_id: int, start_time: datetime = None, end_time: datetime = None, skip: int = 0, limit: int = None):
    logging.info(f"Fetching readings for device_id: {device_id}, sensor_db_id: {sensor_db_id}, limit: {limit}")
    query = db.query(models.Reading).filter(models.Reading.device_id == device_id, models.Reading.sensor_id == sensor_db_id)
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
        timestamp=datetime.now(timezone.utc),
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


def delete_device(db: Session, device_id: str):
    device = get_device_by_device_id(db, device_id)
    if not device:
        return False

    sensors = get_sensors_by_device_id(db, device_id)
    sensor_ids = [s.id for s in sensors]

    if sensor_ids:
        # Delete alerts for device's sensors
        db.query(models.Alert).filter(models.Alert.sensor_id.in_(sensor_ids)).delete(synchronize_session=False)
        # Delete thresholds for device's sensors
        db.query(models.Threshold).filter(models.Threshold.sensor_id.in_(sensor_ids)).delete(synchronize_session=False)

    # Delete readings by device_id
    db.query(models.Reading).filter(models.Reading.device_id == device_id).delete(synchronize_session=False)
    # Delete sensors
    db.query(models.Sensor).filter(models.Sensor.device_id == device_id).delete(synchronize_session=False)
    # Delete device
    db.delete(device)
    db.commit()
    return True


# OTA CRUD operations

def update_device_heartbeat(db: Session, device_id: str, heartbeat: schemas.DeviceHeartbeat):
    db_device = get_device_by_device_id(db, device_id)
    if not db_device:
        return None
    db_device.last_seen = datetime.now(timezone.utc)
    if heartbeat.firmware_version is not None:
        db_device.firmware_version = heartbeat.firmware_version
    if heartbeat.ip_address is not None:
        db_device.ip_address = heartbeat.ip_address
    if heartbeat.mac_address is not None:
        db_device.mac_address = heartbeat.mac_address
    db.commit()
    db.refresh(db_device)
    return db_device


def get_latest_firmware(db: Session):
    return db.query(models.Firmware).order_by(models.Firmware.upload_timestamp.desc()).first()


def get_firmware_by_version(db: Session, version: str):
    return db.query(models.Firmware).filter(models.Firmware.version == version).first()


def get_all_firmware(db: Session):
    return db.query(models.Firmware).order_by(models.Firmware.upload_timestamp.desc()).all()


def create_firmware(db: Session, version: str, filename: str, checksum: str, size_bytes: int, notes: str = None):
    db_firmware = models.Firmware(
        version=version,
        filename=filename,
        checksum=checksum,
        size_bytes=size_bytes,
        notes=notes
    )
    db.add(db_firmware)
    db.commit()
    db.refresh(db_firmware)
    return db_firmware


def delete_firmware(db: Session, version: str):
    db_firmware = get_firmware_by_version(db, version)
    if db_firmware:
        db.delete(db_firmware)
        db.commit()
        return True
    return False
