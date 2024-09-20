from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
import models
import backend.app.schemas as schemas
from auth import get_current_active_user

router = APIRouter(prefix="/watering", tags=["watering"])

@router.post("/events", response_model=schemas.WateringEvent)
def create_watering_event(event: schemas.WateringEventCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    plant = db.query(models.Plant).filter(models.Plant.id == event.plant_id, models.Plant.owner_id == current_user.id).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    db_event = models.WateringEvent(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/events", response_model=list[schemas.WateringEvent])
def read_watering_events(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    events = db.query(models.WateringEvent).join(models.Plant).filter(models.Plant.owner_id == current_user.id).offset(skip).limit(limit).all()
    return events

@router.post("/schedules", response_model=schemas.WateringSchedule)
def create_watering_schedule(schedule: schemas.WateringScheduleCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    plant = db.query(models.Plant).filter(models.Plant.id == schedule.plant_id, models.Plant.owner_id == current_user.id).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    db_schedule = models.WateringSchedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.get("/schedules", response_model=list[schemas.WateringSchedule])
def read_watering_schedules(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    schedules = db.query(models.WateringSchedule).join(models.Plant).filter(models.Plant.owner_id == current_user.id).offset(skip).limit(limit).all()
    return schedules