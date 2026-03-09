# routers/readings.py

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import schemas, crud, models
from dependencies import get_db
from typing import List, Optional
from datetime import datetime
import logging
import csv
import io

router = APIRouter(
    tags=["readings"],
)


@router.post("/readings", response_model=schemas.Reading)
async def create_reading(reading: schemas.ReadingCreate, db: Session = Depends(get_db)):
    logging.info(f"Creating reading: {reading}")
    db_device = crud.get_device_by_device_id(db, device_id=reading.device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    return crud.create_reading(db=db, reading=reading)


@router.get("/readings", response_model=List[schemas.Reading])
async def read_readings(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logging.info(f"Received request for readings: {request.url}")
    readings = crud.get_readings(db, skip=skip, limit=limit)
    return readings


@router.get("/readings/export")
async def export_readings_csv(
    sensor_id: int = Query(..., description="Sensor DB id"),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    sensor = db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    query = db.query(models.Reading).filter(models.Reading.sensor_id == sensor_id)
    if start:
        query = query.filter(models.Reading.timestamp >= start)
    if end:
        query = query.filter(models.Reading.timestamp <= end)
    query = query.order_by(models.Reading.timestamp.asc())
    readings = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "moisture", "raw_adc"])
    for r in readings:
        writer.writerow([r.timestamp.isoformat(), r.moisture, r.raw_adc if r.raw_adc is not None else ""])
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sensor_{sensor_id}_readings.csv"},
    )


@router.get("/readings/compare", response_model=schemas.CompareReadingsResponse)
async def compare_readings(
    sensor_ids: str = Query(..., description="Comma-separated sensor DB IDs"),
    hours: int = Query(168, ge=1, le=8760, description="Time range in hours (default 7d, max 1yr)"),
    db: Session = Depends(get_db),
):
    try:
        ids = [int(x.strip()) for x in sensor_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="sensor_ids must be comma-separated integers")
    if len(ids) < 1:
        raise HTTPException(status_code=400, detail="At least 1 sensor_id required")
    if len(ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 sensors allowed")
    return crud.get_compare_readings(db, sensor_db_ids=ids, hours=hours)


@router.get("/readings/sensor/{sensor_id}/aggregated", response_model=schemas.AggregatedReadingsResponse)
async def get_aggregated_readings(
    sensor_id: int,
    period: str = Query("daily", regex="^(daily|weekly)$"),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    sensor = db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    rows = crud.get_aggregated_readings(db, sensor_db_id=sensor_id, period=period, start_time=start_time, end_time=end_time)
    data = [
        schemas.AggregatedReadingPoint(
            period_start=row.period_start,
            avg_moisture=round(row.avg_moisture, 1),
            min_moisture=round(row.min_moisture, 1),
            max_moisture=round(row.max_moisture, 1),
            reading_count=row.reading_count,
        )
        for row in rows
    ]
    return schemas.AggregatedReadingsResponse(sensor_id=sensor_id, period=period, data=data)


@router.get("/readings/sensor/{sensor_id}/drying-rate", response_model=schemas.DryingRateResponse)
async def get_drying_rate(sensor_id: int, db: Session = Depends(get_db)):
    sensor = db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    result = crud.get_drying_rate(db, sensor_db_id=sensor_id)
    return result


@router.get("/readings/sensor/{sensor_id}", response_model=List[schemas.Reading])
async def read_readings_by_sensor(request: Request, sensor_id: int, device_id: str, start_time: datetime = None, end_time: datetime = None, db: Session = Depends(get_db)):
    logging.info(f"Received request for readings by sensor: {request.url}")
    db_sensor = crud.get_sensor_by_sensor_id(db, device_id=device_id, sensor_id=sensor_id)
    if db_sensor is None:
        raise HTTPException(status_code=404, detail=f"Sensor with id {sensor_id} not found for device {device_id}")
    readings = crud.get_readings_by_sensor(db, device_id=device_id, sensor_db_id=db_sensor.id, start_time=start_time, end_time=end_time)
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
        db_device = crud.get_device_by_device_id(db, device_id=device_id)
        if db_device is None:
            raise HTTPException(status_code=404, detail=f"Device with id {device_id} not found")

        db_sensor = crud.get_sensor_by_sensor_id(db, device_id=device_id, sensor_id=sensor_id)
        if db_sensor is None:
            raise HTTPException(status_code=404, detail=f"Sensor with id {sensor_id} not found for device {device_id}")

        readings = crud.get_readings_by_sensor(db, device_id=device_id, sensor_db_id=db_sensor.id, limit=limit)
        if not readings:
            logging.warning(f"No readings found for sensor {sensor_id} of device {device_id}")
            return []
        return readings
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching readings: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/readings/cleanup")
async def cleanup_old_readings(older_than_days: int = Query(90, ge=1), db: Session = Depends(get_db)):
    count = crud.delete_old_readings(db, older_than_days=older_than_days)
    return {"deleted": count, "older_than_days": older_than_days}
