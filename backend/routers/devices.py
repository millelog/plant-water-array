# routers/devices.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from typing import List
import models
import uuid

router = APIRouter(
    prefix="/devices",
    tags=["devices"],
)


@router.post("/", response_model=schemas.Device)
async def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    return crud.create_device(db=db, device=device)


@router.post("/register_device", response_model=schemas.Device)
async def register_device(device: schemas.DeviceRegister, db: Session = Depends(get_db)):
    # If device_id provided, check by device_id first
    if device.device_id:
        existing_device = crud.get_device_by_device_id(db, device.device_id)
        if existing_device:
            # Update fields if provided
            if device.firmware_version is not None:
                existing_device.firmware_version = device.firmware_version
            if device.ip_address is not None:
                existing_device.ip_address = device.ip_address
            if device.mac_address is not None:
                existing_device.mac_address = device.mac_address
            if device.deploy_token is not None:
                existing_device.deploy_token = device.deploy_token
            db.commit()
            db.refresh(existing_device)
            return existing_device

    # Check by name for backward compat
    existing_device = crud.get_device_by_name(db, device.name)
    if existing_device:
        return existing_device

    # Auto-generate device_id if not provided
    device_id = device.device_id or str(uuid.uuid4())
    new_device = crud.create_device(db, schemas.DeviceCreate(name=device.name, device_id=device_id))

    # Set optional fields
    if device.firmware_version is not None:
        new_device.firmware_version = device.firmware_version
    if device.ip_address is not None:
        new_device.ip_address = device.ip_address
    if device.mac_address is not None:
        new_device.mac_address = device.mac_address
    if device.deploy_token is not None:
        new_device.deploy_token = device.deploy_token
    db.commit()
    db.refresh(new_device)
    return new_device


@router.patch("/{device_id}", response_model=schemas.Device)
async def update_device(device_id: str, update: schemas.DeviceUpdate, db: Session = Depends(get_db)):
    device = crud.update_device(db, device_id, update)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.delete("/{device_id}")
async def delete_device(device_id: str, db: Session = Depends(get_db)):
    deleted = crud.delete_device(db, device_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"detail": "Device deleted"}


@router.get("/", response_model=List[schemas.Device])
async def read_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    devices = db.query(models.Device).offset(skip).limit(limit).all()
    return devices


@router.get("/{device_id}", response_model=schemas.Device)
async def get_device(device_id: str, db: Session = Depends(get_db)):
    device = crud.get_device_by_device_id(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.get("/{device_id}/heartbeats", response_model=List[schemas.HeartbeatLogEntry])
async def get_heartbeat_history(device_id: str, limit: int = 50, db: Session = Depends(get_db)):
    device = crud.get_device_by_device_id(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return crud.get_heartbeat_logs(db, device_id, limit=limit)


@router.post("/{device_id}/heartbeat", response_model=schemas.HeartbeatResponse)
async def device_heartbeat(device_id: str, heartbeat: schemas.DeviceHeartbeat, db: Session = Depends(get_db)):
    device = crud.update_device_heartbeat(db, device_id, heartbeat)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    crud.create_heartbeat_log(db, device_id, heartbeat)
    crud.check_and_notify_offline_devices(db)
    config = crud.build_heartbeat_config(db, device_id)
    return config


