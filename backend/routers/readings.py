# routers/readings.py

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
import schemas, crud, models
from database import SessionLocal
from typing import List
from datetime import datetime
import models
import logging

router = APIRouter(
    tags=["readings"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/readings", response_model=schemas.Reading)
async def create_reading(reading: schemas.ReadingCreate, db: Session = Depends(get_db)):
    logging.info(f"Creating reading: {reading}")
    db_device = crud.get_device_by_device_id(db, device_id=reading.device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_sensor = crud.get_sensor_by_sensor_id(db, device_id=reading.device_id, sensor_id=reading.sensor_id)
    if db_sensor is None:
        # Create the sensor if not found
        db_sensor = crud.create_sensor(db, schemas.SensorCreate(device_id=reading.device_id, sensor_id=reading.sensor_id))
    
    # Create the reading
    return crud.create_reading(db=db, reading=reading)

@router.get("/readings", response_model=List[schemas.Reading])
async def read_readings(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logging.info(f"Received request for readings: {request.url}")
    readings = crud.get_readings(db, skip=skip, limit=limit)
    return readings

@router.get("/readings/sensor/{sensor_id}", response_model=List[schemas.Reading])
async def read_readings_by_sensor(request: Request, sensor_id: int, device_id: str, start_time: datetime = None, end_time: datetime = None, db: Session = Depends(get_db)):
    logging.info(f"Received request for readings by sensor: {request.url}")
    readings = crud.get_readings_by_sensor(db, device_id=device_id, sensor_id=sensor_id, start_time=start_time, end_time=end_time)
    if not readings:
        logging.warning(f"No readings found for sensor {sensor_id} of device {device_id}")
    return readings

@router.get("/devices/{device_id}/sensors/{sensor_id}/readings", response_model=List[schemas.Reading])
async def read_readings_by_device_and_sensor(
    request: Request,
    device_id: str,
    sensor_id: int,
    limit: int = Query(None, description="Limit the number of readings returned"),
    db: Session = Depends(get_db)
):
    logging.info(f"Received request for readings by device and sensor: {request.url}")
    try:
        # Check if the device exists
        db_device = crud.get_device_by_device_id(db, device_id=device_id)
        if db_device is None:
            raise HTTPException(status_code=404, detail=f"Device with id {device_id} not found")

        # Check if the sensor exists
        db_sensor = crud.get_sensor_by_sensor_id(db, device_id=device_id, sensor_id=sensor_id)
        if db_sensor is None:
            raise HTTPException(status_code=404, detail=f"Sensor with id {sensor_id} not found for device {device_id}")

        readings = crud.get_readings_by_sensor(db, device_id=device_id, sensor_id=sensor_id, limit=limit)
        if not readings:
            logging.warning(f"No readings found for sensor {sensor_id} of device {device_id}")
            return []
        return readings
    except Exception as e:
        logging.error(f"Error fetching readings: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
