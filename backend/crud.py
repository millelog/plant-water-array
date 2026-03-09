# crud.py

from sqlalchemy.orm import Session, joinedload
import models, schemas
from datetime import datetime, timezone, timedelta
from sqlalchemy import func

import logging


# System config

def get_system_config(db: Session):
    config = db.query(models.SystemConfig).first()
    if not config:
        config = models.SystemConfig(reading_interval=10, device_timeout=5, ota_check_interval=300)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def update_system_config(db: Session, config_update: schemas.SystemConfigUpdate):
    config = get_system_config(db)
    for key, value in config_update.dict(exclude_unset=True).items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config


def build_heartbeat_config(db: Session, device_id: str):
    device = get_device_by_device_id(db, device_id)
    if not device:
        return None
    sys_config = get_system_config(db)
    sensors = db.query(models.Sensor).options(
        joinedload(models.Sensor.threshold)
    ).filter(models.Sensor.device_id == device_id).all()

    sensor_configs = []
    for s in sensors:
        sc = {
            "sensor_id": s.sensor_id,
            "name": s.name,
            "calibration_dry": s.calibration_dry,
            "calibration_wet": s.calibration_wet,
        }
        if s.threshold:
            sc["threshold_min"] = s.threshold.min_moisture
            sc["threshold_max"] = s.threshold.max_moisture
        sensor_configs.append(sc)

    return {
        "id": device.id,
        "device_id": device.device_id,
        "name": device.name,
        "firmware_version": device.firmware_version,
        "reading_interval": sys_config.reading_interval,
        "ota_check_interval": sys_config.ota_check_interval,
        "sensors": sensor_configs,
    }


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
    return db.query(models.Sensor).options(
        joinedload(models.Sensor.threshold)
    ).join(models.Device).filter(models.Device.device_id == device_id).all()


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

    # Check thresholds and create alerts (with 30-min cooldown)
    if db_sensor.threshold:
        threshold = db_sensor.threshold
        if threshold.min_moisture is not None and moisture < threshold.min_moisture:
            if not _alert_recently_created(db, db_sensor.id):
                alert_message = f"Moisture level below minimum threshold: {moisture}"
                create_alert(db, schemas.AlertCreate(sensor_id=db_sensor.id, message=alert_message))
        if threshold.max_moisture is not None and moisture > threshold.max_moisture:
            if not _alert_recently_created(db, db_sensor.id):
                alert_message = f"Moisture level above maximum threshold: {moisture}"
                create_alert(db, schemas.AlertCreate(sensor_id=db_sensor.id, message=alert_message))

    # Auto-detect watering events
    if db_sensor.auto_log_watering:
        prev_reading = db.query(models.Reading).filter(
            models.Reading.sensor_id == db_sensor.id,
            models.Reading.id != db_reading.id
        ).order_by(models.Reading.timestamp.desc()).first()
        if prev_reading:
            jump = moisture - prev_reading.moisture
            sys_config = get_system_config(db)
            if jump >= sys_config.moisture_jump_threshold:
                auto_note = f"Auto-detected: moisture rose from {prev_reading.moisture:.1f}% to {moisture:.1f}%"
                auto_log = models.WateringLog(
                    sensor_id=db_sensor.id,
                    notes=auto_note,
                    method=models.WateringMethod.auto,
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(auto_log)
                db.commit()

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


def _alert_recently_created(db: Session, sensor_id: int, minutes: int = 30) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    recent = db.query(models.Alert).filter(
        models.Alert.sensor_id == sensor_id,
        models.Alert.timestamp >= cutoff
    ).first()
    return recent is not None


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
        # Delete watering logs for device's sensors
        db.query(models.WateringLog).filter(models.WateringLog.sensor_id.in_(sensor_ids)).delete(synchronize_session=False)
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


# Zone CRUD

def create_zone(db: Session, zone: schemas.ZoneCreate):
    db_zone = models.Zone(name=zone.name, sort_order=zone.sort_order or 0)
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone


def get_zones(db: Session):
    return db.query(models.Zone).order_by(models.Zone.sort_order, models.Zone.name).all()


def update_zone(db: Session, zone_id: int, zone_update: schemas.ZoneUpdate):
    db_zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if db_zone:
        for key, value in zone_update.dict(exclude_unset=True).items():
            setattr(db_zone, key, value)
        db.commit()
        db.refresh(db_zone)
    return db_zone


def delete_zone(db: Session, zone_id: int):
    db_zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not db_zone:
        return False
    # Orphan sensors instead of deleting them
    db.query(models.Sensor).filter(models.Sensor.zone_id == zone_id).update(
        {models.Sensor.zone_id: None}, synchronize_session=False
    )
    db.delete(db_zone)
    db.commit()
    return True


# Alert helpers

def get_unread_alert_count(db: Session) -> int:
    return db.query(func.count(models.Alert.id)).filter(models.Alert.read == False).scalar() or 0


def mark_all_alerts_read(db: Session):
    db.query(models.Alert).filter(models.Alert.read == False).update(
        {models.Alert.read: True}, synchronize_session=False
    )
    db.commit()


def get_alerts_filtered(db: Session, sensor_id: int = None, unread_only: bool = False, skip: int = 0, limit: int = 100):
    query = db.query(models.Alert)
    if sensor_id is not None:
        query = query.filter(models.Alert.sensor_id == sensor_id)
    if unread_only:
        query = query.filter(models.Alert.read == False)
    return query.order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()


# Sensor by DB id

def get_sensor_by_db_id(db: Session, sensor_db_id: int):
    return db.query(models.Sensor).options(
        joinedload(models.Sensor.device),
        joinedload(models.Sensor.threshold),
        joinedload(models.Sensor.zone)
    ).filter(models.Sensor.id == sensor_db_id).first()


# Dashboard summary

def get_dashboard_summary(db: Session) -> schemas.DashboardSummary:
    now = datetime.now(timezone.utc)
    sys_config = get_system_config(db)
    online_cutoff = now - timedelta(minutes=sys_config.device_timeout)
    hour_24_ago = now - timedelta(hours=24)

    # Stats
    all_devices = db.query(models.Device).all()
    total_devices = len(all_devices)
    online_devices = sum(1 for d in all_devices if d.last_seen and d.last_seen.replace(tzinfo=timezone.utc) >= online_cutoff)

    all_sensors = db.query(models.Sensor).options(
        joinedload(models.Sensor.device),
        joinedload(models.Sensor.threshold),
        joinedload(models.Sensor.zone)
    ).all()
    total_sensors = len(all_sensors)

    unread_alert_count = get_unread_alert_count(db)

    sensor_summaries = []
    sensors_needing_water = 0

    for sensor in all_sensors:
        # Latest reading
        latest = db.query(models.Reading).filter(
            models.Reading.sensor_id == sensor.id
        ).order_by(models.Reading.timestamp.desc()).first()

        current_moisture = latest.moisture if latest else None
        last_reading_time = latest.timestamp if latest else None

        # 24h sparkline - hourly averages
        hourly_readings = db.query(
            func.strftime('%Y-%m-%d %H:00', models.Reading.timestamp).label('hour'),
            func.avg(models.Reading.moisture).label('avg_moisture')
        ).filter(
            models.Reading.sensor_id == sensor.id,
            models.Reading.timestamp >= hour_24_ago
        ).group_by(
            func.strftime('%Y-%m-%d %H:00', models.Reading.timestamp)
        ).order_by('hour').all()

        sparkline = [
            schemas.SparklinePoint(hour=row.hour, moisture=round(row.avg_moisture, 1))
            for row in hourly_readings
        ]

        # Trend from last 3 hours
        trend = "stable"
        if len(sparkline) >= 2:
            recent_vals = [p.moisture for p in sparkline[-3:]]
            if len(recent_vals) >= 2:
                diff = recent_vals[-1] - recent_vals[0]
                if diff > 2:
                    trend = "rising"
                elif diff < -2:
                    trend = "falling"

        # Threshold + status
        threshold_min = sensor.threshold.min_moisture if sensor.threshold else None
        threshold_max = sensor.threshold.max_moisture if sensor.threshold else None

        if current_moisture is None:
            status = "no-data"
        elif threshold_min is not None and current_moisture < threshold_min:
            status = "dry"
            sensors_needing_water += 1
        elif threshold_max is not None and current_moisture > threshold_max:
            status = "wet"
        else:
            status = "healthy"

        # Days since last watered
        last_watered = get_last_watering_time(db, sensor.id)
        days_since_watered = None
        if last_watered:
            delta = now - last_watered.replace(tzinfo=timezone.utc) if last_watered.tzinfo is None else now - last_watered
            days_since_watered = max(0, delta.days)

        sensor_summaries.append(schemas.SensorSummary(
            id=sensor.id,
            sensor_id=sensor.sensor_id,
            name=sensor.name,
            device_id=sensor.device_id,
            device_name=sensor.device.name if sensor.device else "Unknown",
            zone_id=sensor.zone_id,
            zone_name=sensor.zone.name if sensor.zone else None,
            current_moisture=current_moisture,
            last_reading_time=last_reading_time,
            sparkline=sparkline,
            trend=trend,
            threshold_min=threshold_min,
            threshold_max=threshold_max,
            status=status,
            days_since_watered=days_since_watered,
        ))

    stats = schemas.DashboardStats(
        total_devices=total_devices,
        online_devices=online_devices,
        total_sensors=total_sensors,
        sensors_needing_water=sensors_needing_water,
        unread_alert_count=unread_alert_count,
    )

    return schemas.DashboardSummary(stats=stats, sensors=sensor_summaries)


# Readings cleanup

def delete_old_readings(db: Session, older_than_days: int = 90) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    count = db.query(models.Reading).filter(models.Reading.timestamp < cutoff).delete(synchronize_session=False)
    db.commit()
    return count


# Watering log CRUD

def get_last_watering_time(db: Session, sensor_id: int):
    log = db.query(models.WateringLog).filter(
        models.WateringLog.sensor_id == sensor_id
    ).order_by(models.WateringLog.timestamp.desc()).first()
    return log.timestamp if log else None


def create_watering_log(db: Session, log_create: schemas.WateringLogCreate):
    sensor = db.query(models.Sensor).filter(models.Sensor.id == log_create.sensor_id).first()
    if not sensor:
        raise ValueError(f"Sensor with id {log_create.sensor_id} not found")
    db_log = models.WateringLog(
        sensor_id=log_create.sensor_id,
        notes=log_create.notes,
        method=log_create.method,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def get_watering_logs_by_sensor(db: Session, sensor_id: int, start_time: datetime = None, end_time: datetime = None, skip: int = 0, limit: int = 50):
    query = db.query(models.WateringLog).filter(models.WateringLog.sensor_id == sensor_id)
    if start_time:
        query = query.filter(models.WateringLog.timestamp >= start_time)
    if end_time:
        query = query.filter(models.WateringLog.timestamp <= end_time)
    return query.order_by(models.WateringLog.timestamp.desc()).offset(skip).limit(limit).all()


def delete_watering_log(db: Session, log_id: int) -> bool:
    log = db.query(models.WateringLog).filter(models.WateringLog.id == log_id).first()
    if not log:
        return False
    db.delete(log)
    db.commit()
    return True
