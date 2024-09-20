from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
import models
import schemas
from auth import get_current_active_user

router = APIRouter(prefix="/devices", tags=["devices"])

@router.post("/", response_model=schemas.Device)
def create_device(device: schemas.DeviceCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_device = models.Device(**device.dict(), owner_id=current_user.id)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.get("/", response_model=list[schemas.Device])
def read_devices(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    devices = db.query(models.Device).filter(models.Device.owner_id == current_user.id).offset(skip).limit(limit).all()
    return devices

@router.get("/{device_id}", response_model=schemas.Device)
def read_device(device_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    device = db.query(models.Device).filter(models.Device.id == device_id, models.Device.owner_id == current_user.id).first()
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.put("/{device_id}", response_model=schemas.Device)
def update_device(device_id: int, device: schemas.DeviceUpdate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_device = db.query(models.Device).filter(models.Device.id == device_id, models.Device.owner_id == current_user.id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    for key, value in device.dict(exclude_unset=True).items():
        setattr(db_device, key, value)
    db.commit()
    db.refresh(db_device)
    return db_device