from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
import models
import backend.app.schemas as schemas
from auth import get_current_active_user

router = APIRouter(prefix="/zones", tags=["zones"])

@router.post("/", response_model=schemas.Zone)
def create_zone(zone: schemas.ZoneCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_zone = models.Zone(**zone.dict())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

@router.get("/", response_model=list[schemas.Zone])
def read_zones(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    zones = db.query(models.Zone).offset(skip).limit(limit).all()
    return zones

@router.get("/{zone_id}", response_model=schemas.Zone)
def read_zone(zone_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@router.put("/{zone_id}", response_model=schemas.Zone)
def update_zone(zone_id: int, zone: schemas.ZoneUpdate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if db_zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    for key, value in zone.dict(exclude_unset=True).items():
        setattr(db_zone, key, value)
    db.commit()
    db.refresh(db_zone)
    return db_zone

@router.delete("/{zone_id}", response_model=schemas.Zone)
def delete_zone(zone_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if db_zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    db.delete(db_zone)
    db.commit()
    return db_zone

@router.get("/{zone_id}/plants", response_model=list[schemas.Plant])
def read_zone_plants(zone_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    plants = db.query(models.Plant).filter(models.Plant.zone_id == zone_id, models.Plant.owner_id == current_user.id).offset(skip).limit(limit).all()
    return plants