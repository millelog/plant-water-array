from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.services.data_processor import DataProcessor
from db import get_db
import models
import schemas
from auth import get_current_active_user

router = APIRouter(prefix="/plants", tags=["plants"])

@router.post("/", response_model=schemas.Plant)
def create_plant(plant: schemas.PlantCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_plant = models.Plant(**plant.dict(), owner_id=current_user.id)
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    return db_plant

@router.get("/", response_model=list[schemas.Plant])
def read_plants(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    plants = db.query(models.Plant).filter(models.Plant.owner_id == current_user.id).offset(skip).limit(limit).all()
    return plants

@router.get("/{plant_id}", response_model=schemas.Plant)
def read_plant(plant_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id, models.Plant.owner_id == current_user.id).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant

@router.put("/{plant_id}", response_model=schemas.Plant)
def update_plant(plant_id: int, plant: schemas.PlantUpdate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_plant = db.query(models.Plant).filter(models.Plant.id == plant_id, models.Plant.owner_id == current_user.id).first()
    if db_plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    for key, value in plant.dict(exclude_unset=True).items():
        setattr(db_plant, key, value)
    db.commit()
    db.refresh(db_plant)
    return db_plant

@router.get("/plant/{plant_id}/health")
def get_plant_health(plant_id: int, db: Session = Depends(get_db)):
    processor = DataProcessor(db)
    return processor.analyze_plant_health(plant_id)