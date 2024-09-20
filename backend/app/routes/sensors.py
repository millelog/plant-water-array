from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
import models
import backend.app.schemas as schemas
from auth import get_current_active_user

router = APIRouter(prefix="/sensors", tags=["sensors"])

@router.post("/", response_model=schemas.Sensor)
def create_sensor(sensor: schemas.SensorCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    device = db.query(models.Device).filter(models.Device.id == sensor.device_id, models.Device.owner_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db_sensor = models.Sensor(**sensor.dict())
    db.add(db_sensor)
    db.commit()
    db.refresh(db_sensor)
    return db_sensor

@router.get("/", response_model=list[schemas.Sensor])
def read_sensors(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    sensors = db.query(models.Sensor).join(models.Device).filter(models.Device.owner_id == current_user.id).offset(skip).limit(limit).all()
    return sensors

@router.get("/{sensor_id}", response_model=schemas.Sensor)
def read_sensor(sensor_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    sensor = db.query(models.Sensor).join(models.Device).filter(models.Sensor.id == sensor_id, models.Device.owner_id == current_user.id).first()
    if sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor

@router.post("/{sensor_id}/readings", response_model=schemas.MoistureReading)
def create_moisture_reading(sensor_id: int, reading: schemas.MoistureReadingCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    sensor = db.query(models.Sensor).join(models.Device).filter(models.Sensor.id == sensor_id, models.Device.owner_id == current_user.id).first()
    if sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    db_reading = models.MoistureReading(**reading.dict(), sensor_id=sensor_id)
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading