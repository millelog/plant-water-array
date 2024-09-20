from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
import models
import schemas
from auth import get_current_active_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/", response_model=schemas.Alert)
def create_alert(alert: schemas.AlertCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if alert.plant_id:
        plant = db.query(models.Plant).filter(models.Plant.id == alert.plant_id, models.Plant.owner_id == current_user.id).first()
        if plant is None:
            raise HTTPException(status_code=404, detail="Plant not found")
    if alert.device_id:
        device = db.query(models.Device).filter(models.Device.id == alert.device_id, models.Device.owner_id == current_user.id).first()
        if device is None:
            raise HTTPException(status_code=404, detail="Device not found")
    db_alert = models.Alert(**alert.dict())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.get("/", response_model=list[schemas.Alert])
def read_alerts(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).join(models.Plant, models.Alert.plant_id == models.Plant.id, isouter=True)\
        .join(models.Device, models.Alert.device_id == models.Device.id, isouter=True)\
        .filter((models.Plant.owner_id == current_user.id) | (models.Device.owner_id == current_user.id))\
        .offset(skip).limit(limit).all()
    return alerts

@router.get("/{alert_id}", response_model=schemas.Alert)
def read_alert(alert_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    alert = db.query(models.Alert).join(models.Plant, models.Alert.plant_id == models.Plant.id, isouter=True)\
        .join(models.Device, models.Alert.device_id == models.Device.id, isouter=True)\
        .filter(models.Alert.id == alert_id)\
        .filter((models.Plant.owner_id == current_user.id) | (models.Device.owner_id == current_user.id))\
        .first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.put("/{alert_id}", response_model=schemas.Alert)
def update_alert(alert_id: int, alert: schemas.AlertUpdate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_alert = db.query(models.Alert).join(models.Plant, models.Alert.plant_id == models.Plant.id, isouter=True)\
        .join(models.Device, models.Alert.device_id == models.Device.id, isouter=True)\
        .filter(models.Alert.id == alert_id)\
        .filter((models.Plant.owner_id == current_user.id) | (models.Device.owner_id == current_user.id))\
        .first()
    if db_alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    for key, value in alert.dict(exclude_unset=True).items():
        setattr(db_alert, key, value)
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.delete("/{alert_id}", response_model=schemas.Alert)
def delete_alert(alert_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_alert = db.query(models.Alert).join(models.Plant, models.Alert.plant_id == models.Plant.id, isouter=True)\
        .join(models.Device, models.Alert.device_id == models.Device.id, isouter=True)\
        .filter(models.Alert.id == alert_id)\
        .filter((models.Plant.owner_id == current_user.id) | (models.Device.owner_id == current_user.id))\
        .first()
    if db_alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(db_alert)
    db.commit()
    return db_alert