from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from typing import List
from auth import get_current_user

router = APIRouter(
    prefix="/zones",
    tags=["zones"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=schemas.Zone)
async def create_zone(zone: schemas.ZoneCreate, db: Session = Depends(get_db)):
    return crud.create_zone(db=db, zone=zone)


@router.get("/", response_model=List[schemas.Zone])
async def read_zones(db: Session = Depends(get_db)):
    return crud.get_zones(db)


@router.put("/{zone_id}", response_model=schemas.Zone)
async def update_zone(zone_id: int, zone_update: schemas.ZoneUpdate, db: Session = Depends(get_db)):
    db_zone = crud.update_zone(db, zone_id, zone_update)
    if db_zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    return db_zone


@router.delete("/{zone_id}")
async def delete_zone(zone_id: int, db: Session = Depends(get_db)):
    if not crud.delete_zone(db, zone_id):
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"detail": "Zone deleted"}
