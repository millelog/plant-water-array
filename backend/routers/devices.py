# routers/devices.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from database import SessionLocal
from typing import List

router = APIRouter(
    prefix="/devices",
    tags=["devices"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Device)
def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    db_device = crud.get_device_by_device_id(db, device_id=device.device_id)
    if db_device:
        raise HTTPException(status_code=400, detail="Device already registered")
    return crud.create_device(db=db, device=device)

@router.get("/", response_model=List[schemas.Device])
def read_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    devices = db.query(models.Device).offset(skip).limit(limit).all()
    return devices
