# populate_test_data.py

import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import schemas
from datetime import datetime, timedelta
import random

def populate_test_data():
    # Create all tables in the database
    models.Base.metadata.create_all(bind=engine)

    # Create a new session
    db = SessionLocal()

    try:
        # Create test devices
        device1 = create_device(db, schemas.DeviceCreate(device_id="test_device_1", name="Test Device 1"))
        device2 = create_device(db, schemas.DeviceCreate(device_id="test_device_2", name="Test Device 2"))

        # Create test sensors for each device
        sensor1 = create_sensor(db, schemas.SensorCreate(device_id=device1.id, sensor_id=1, name="Sensor 1"))
        sensor2 = create_sensor(db, schemas.SensorCreate(device_id=device1.id, sensor_id=2, name="Sensor 2"))
        sensor3 = create_sensor(db, schemas.SensorCreate(device_id=device2.id, sensor_id=1, name="Sensor 3"))

        # Set thresholds for sensors
        set_threshold(db, sensor1.id, schemas.ThresholdCreate(min_moisture=20, max_moisture=80))
        set_threshold(db, sensor2.id, schemas.ThresholdCreate(min_moisture=30, max_moisture=70))
        set_threshold(db, sensor3.id, schemas.ThresholdCreate(min_moisture=25, max_moisture=75))

        # Create test readings for each sensor
        now = datetime.utcnow()
        for i in range(50):
            timestamp = now - timedelta(hours=i)
            create_reading(db, schemas.ReadingCreate(device_id=device1.device_id, sensor_id=sensor1.sensor_id, moisture=random.randint(10, 90)))
            create_reading(db, schemas.ReadingCreate(device_id=device1.device_id, sensor_id=sensor2.sensor_id, moisture=random.randint(10, 90)))
            create_reading(db, schemas.ReadingCreate(device_id=device2.device_id, sensor_id=sensor3.sensor_id, moisture=random.randint(10, 90)))

        # Create some test alerts
        create_alert(db, schemas.AlertCreate(sensor_id=sensor1.id, message="Test alert 1 for Sensor 1"))
        create_alert(db, schemas.AlertCreate(sensor_id=sensor2.id, message="Test alert 1 for Sensor 2"))
        create_alert(db, schemas.AlertCreate(sensor_id=sensor3.id, message="Test alert 1 for Sensor 3"))

        # Commit the changes
        db.commit()

        print("Test data populated successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

def create_device(db: Session, device: schemas.DeviceCreate):
    db_device = models.Device(device_id=device.device_id, name=device.name)
    db.add(db_device)
    db.flush()
    return db_device

def create_sensor(db: Session, sensor: schemas.SensorCreate):
    db_sensor = models.Sensor(device_id=sensor.device_id, sensor_id=sensor.sensor_id, name=sensor.name)
    db.add(db_sensor)
    db.flush()
    return db_sensor

def set_threshold(db: Session, sensor_id: int, threshold_data: schemas.ThresholdCreate):
    db_threshold = models.Threshold(
        sensor_id=sensor_id,
        min_moisture=threshold_data.min_moisture,
        max_moisture=threshold_data.max_moisture
    )
    db.add(db_threshold)
    db.flush()
    return db_threshold

def create_reading(db: Session, reading: schemas.ReadingCreate):
    db_device = db.query(models.Device).filter(models.Device.device_id == reading.device_id).first()
    if not db_device:
        raise ValueError("Device not found")
    
    db_sensor = db.query(models.Sensor).filter(models.Sensor.device_id == db_device.id, models.Sensor.sensor_id == reading.sensor_id).first()
    if not db_sensor:
        raise ValueError("Sensor not found")

    db_reading = models.Reading(
        device_id=reading.device_id,
        sensor_id=db_sensor.id,
        moisture=reading.moisture,
        timestamp=datetime.utcnow()
    )
    db.add(db_reading)
    db.flush()
    return db_reading

def create_alert(db: Session, alert: schemas.AlertCreate):
    db_alert = models.Alert(
        sensor_id=alert.sensor_id,
        message=alert.message,
        timestamp=datetime.utcnow(),
        read=False
    )
    db.add(db_alert)
    db.flush()
    return db_alert

if __name__ == "__main__":
    populate_test_data()