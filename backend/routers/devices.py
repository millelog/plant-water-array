# routers/devices.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from database import SessionLocal
from typing import List
import models
from pydantic import ValidationError

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
    return crud.create_device(db=db, device=device)


@router.post("/register_device", response_model=schemas.Device)
async def register_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    return create_device(device, db)


@router.get("/", response_model=List[schemas.Device])

def read_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    devices = db.query(models.Device).offset(skip).limit(limit).all()
    return devices
