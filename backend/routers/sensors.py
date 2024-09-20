# routers/sensors.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from database import SessionLocal
from typing import List

router = APIRouter(
    prefix="/sensors",
    tags=["sensors"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Sensor)
def create_sensor(sensor: schemas.SensorCreate, db: Session = Depends(get_db)):
    db_sensor = crud.get_sensor_by_sensor_id(db, device_id=sensor.device_id, sensor_id=sensor.sensor_id)
    if db_sensor:
        raise HTTPException(status_code=400, detail="Sensor already registered")
    return crud.create_sensor(db=db, sensor=sensor)

@router.get("/{sensor_id}", response_model=schemas.Sensor)
def read_sensor(sensor_id: int, db: Session = Depends(get_db)):
    db_sensor = db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()
    if db_sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return db_sensor

@router.post("/{sensor_id}/threshold", response_model=schemas.Threshold)
def set_threshold(sensor_id: int, threshold: schemas.ThresholdCreate, db: Session = Depends(get_db)):
    db_sensor = db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()
    if db_sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return crud.set_threshold(db, sensor_id=sensor_id, threshold_data=threshold)

@router.get("/{sensor_id}/threshold", response_model=schemas.Threshold)
def get_threshold(sensor_id: int, db: Session = Depends(get_db)):
    db_threshold = crud.get_threshold(db, sensor_id)
    if db_threshold is None:
        raise HTTPException(status_code=404, detail="Threshold not found")
    return db_threshold
