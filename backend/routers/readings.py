# routers/readings.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud, models
from database import SessionLocal
from typing import List
from datetime import datetime
import models

router = APIRouter(
    prefix="/readings",
    tags=["readings"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Reading)
def create_reading(reading: schemas.ReadingCreate, db: Session = Depends(get_db)):
    db_device = crud.get_device_by_device_id(db, device_id=reading.device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_sensor = crud.get_sensor_by_sensor_id(db, device_id=db_device.id, sensor_id=reading.sensor_id)
    if db_sensor is None:
        # Create the sensor if not found
        db_sensor = crud.create_sensor(db, schemas.SensorCreate(device_id=db_device.id, sensor_id=reading.sensor_id))
    
    # Create the reading
    return crud.create_reading(db=db, reading=reading)

@router.get("/", response_model=List[schemas.Reading])
def read_readings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    readings = crud.get_readings(db, skip=skip, limit=limit)
    return readings

@router.get("/sensor/{sensor_id}", response_model=List[schemas.Reading])
def read_readings_by_sensor(sensor_id: int, device_id: str, start_time: datetime = None, end_time: datetime = None, db: Session = Depends(get_db)):
    readings = crud.get_readings_by_sensor(db, device_id=device_id, sensor_id=sensor_id, start_time=start_time, end_time=end_time)
    return readings
