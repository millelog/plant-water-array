"""Seed demo data (is_demo=True) on every backend startup.

Deletes all existing demo records, then re-creates fresh data
with timestamps relative to now.
"""

import logging
import math
import random
from datetime import datetime, timedelta, timezone

from database import SessionLocal
import models

logger = logging.getLogger(__name__)


def seed_demo_data():
    db = SessionLocal()
    try:
        _purge_demo(db)
        _seed(db)
        db.commit()
        logger.info("Demo data seeded successfully")
    except Exception:
        db.rollback()
        logger.exception("Failed to seed demo data")
    finally:
        db.close()


def _purge_demo(db):
    """Delete all is_demo=True rows in dependency order."""
    db.query(models.WateringLog).filter(models.WateringLog.is_demo == True).delete(synchronize_session=False)
    db.query(models.Alert).filter(models.Alert.is_demo == True).delete(synchronize_session=False)
    db.query(models.Reading).filter(models.Reading.is_demo == True).delete(synchronize_session=False)
    db.query(models.Threshold).filter(models.Threshold.is_demo == True).delete(synchronize_session=False)
    db.query(models.HeartbeatLog).filter(models.HeartbeatLog.is_demo == True).delete(synchronize_session=False)
    db.query(models.Sensor).filter(models.Sensor.is_demo == True).delete(synchronize_session=False)
    db.query(models.Device).filter(models.Device.is_demo == True).delete(synchronize_session=False)
    db.query(models.Zone).filter(models.Zone.is_demo == True).delete(synchronize_session=False)
    db.flush()


def _seed(db):
    now = datetime.now(timezone.utc)

    # --- Zones ---
    zone_living = models.Zone(name="Living Room (Demo)", sort_order=0, is_demo=True)
    zone_garden = models.Zone(name="Garden (Demo)", sort_order=1, is_demo=True)
    zone_balcony = models.Zone(name="Balcony (Demo)", sort_order=2, is_demo=True)
    db.add_all([zone_living, zone_garden, zone_balcony])
    db.flush()

    # --- Devices ---
    dev_indoor = models.Device(
        device_id="demo-indoor-hub",
        name="Indoor Hub",
        firmware_version="demo-v1.0",
        ip_address="10.0.0.101",
        mac_address="DE:MO:00:00:00:01",
        deploy_token="0" * 32,
        last_seen=now - timedelta(minutes=2),
        is_demo=True,
    )
    dev_garden = models.Device(
        device_id="demo-garden-hub",
        name="Garden Hub",
        firmware_version="demo-v1.0",
        ip_address="10.0.0.102",
        mac_address="DE:MO:00:00:00:02",
        deploy_token="1" * 32,
        last_seen=now - timedelta(minutes=1),
        is_demo=True,
    )
    db.add_all([dev_indoor, dev_garden])
    db.flush()

    # --- Sensors ---
    sensors_spec = [
        ("Monstera", dev_indoor.device_id, 0, zone_living.id),
        ("Fern", dev_indoor.device_id, 1, zone_living.id),
        ("Tomato", dev_garden.device_id, 0, zone_garden.id),
        ("Basil", dev_garden.device_id, 1, zone_balcony.id),
    ]
    sensor_objs = []
    for name, dev_id, sid, zid in sensors_spec:
        s = models.Sensor(
            sensor_id=sid,
            device_id=dev_id,
            name=name,
            zone_id=zid,
            calibration_dry=3200.0,
            calibration_wet=1400.0,
            auto_log_watering=True,
            is_demo=True,
        )
        db.add(s)
        db.flush()
        sensor_objs.append(s)

    # --- Thresholds ---
    for s in sensor_objs:
        db.add(models.Threshold(
            sensor_id=s.id,
            min_moisture=20.0,
            max_moisture=80.0,
            is_demo=True,
        ))
    db.flush()

    # --- Readings (7 days, ~5-min intervals) ---
    readings_per_day = 288  # 24*60/5
    total_readings = readings_per_day * 7
    interval = timedelta(minutes=5)
    start = now - timedelta(days=7)

    # Per-sensor: generate a drying curve with watering bumps
    watering_day_offsets = [
        [1.5, 4.0],       # Monstera — watered day 1.5 and 4
        [2.0, 5.5],       # Fern
        [1.0, 3.5, 6.0],  # Tomato
        [2.5, 5.0],       # Basil
    ]
    watering_logs_to_add = []

    for si, s in enumerate(sensor_objs):
        moisture = 70.0 + random.uniform(-5, 5)
        water_times = watering_day_offsets[si]
        water_datetimes = [start + timedelta(days=d) for d in water_times]

        t = start
        for _ in range(total_readings):
            # Check if this is near a watering event
            for wt in water_datetimes:
                if abs((t - wt).total_seconds()) < 300:  # within 5 min
                    moisture = min(85.0, moisture + random.uniform(25, 40))

            # Natural drying: ~2-4% per day → ~0.007-0.014% per 5 min
            moisture -= random.uniform(0.005, 0.020)
            # Add noise
            moisture += random.gauss(0, 0.3)
            moisture = max(5.0, min(95.0, moisture))

            db.add(models.Reading(
                device_id=s.device_id,
                sensor_id=s.id,
                timestamp=t,
                moisture=round(moisture, 1),
                raw_adc=round(3200 - (moisture / 100) * 1800 + random.gauss(0, 10), 0),
                is_demo=True,
            ))
            t += interval

        # Add watering logs
        for wt in water_datetimes:
            method = random.choice([models.WateringMethod.manual, models.WateringMethod.auto])
            note = "Auto-detected moisture spike" if method == models.WateringMethod.auto else "Manual watering"
            watering_logs_to_add.append(models.WateringLog(
                sensor_id=s.id,
                timestamp=wt,
                notes=note,
                method=method,
                is_demo=True,
            ))

    db.add_all(watering_logs_to_add)
    db.flush()

    # --- Alerts (a few threshold violations) ---
    alert_specs = [
        (sensor_objs[0], now - timedelta(days=5, hours=3), "Moisture level below minimum threshold: 18.5"),
        (sensor_objs[2], now - timedelta(days=3, hours=7), "Moisture level below minimum threshold: 16.2"),
        (sensor_objs[3], now - timedelta(days=1, hours=2), "Moisture level above maximum threshold: 82.1"),
    ]
    for s, ts, msg in alert_specs:
        db.add(models.Alert(
            sensor_id=s.id,
            timestamp=ts,
            message=msg,
            read=False,
            is_demo=True,
        ))
    # One read alert
    db.add(models.Alert(
        sensor_id=sensor_objs[1].id,
        timestamp=now - timedelta(days=6),
        message="Moisture level below minimum threshold: 19.8",
        read=True,
        is_demo=True,
    ))
    db.flush()

    # --- Heartbeat logs (every 5 min for 7 days, per device) ---
    hb_interval = timedelta(minutes=5)
    for dev in [dev_indoor, dev_garden]:
        t = start
        while t <= now:
            db.add(models.HeartbeatLog(
                device_id=dev.device_id,
                timestamp=t,
                ip_address=dev.ip_address,
                firmware_version=dev.firmware_version,
                is_demo=True,
            ))
            t += hb_interval
