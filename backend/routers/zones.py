from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from typing import List
from auth import UserInfo, get_current_user, require_admin

router = APIRouter(
    prefix="/zones",
    tags=["zones"],
)


@router.post("/", response_model=schemas.Zone)
async def create_zone(zone: schemas.ZoneCreate, db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    return crud.create_zone(db=db, zone=zone)


@router.get("/", response_model=List[schemas.Zone])
async def read_zones(db: Session = Depends(get_db), user: UserInfo = Depends(get_current_user)):
    return crud.get_zones(db, is_demo=user.is_demo)


@router.put("/{zone_id}", response_model=schemas.Zone)
async def update_zone(zone_id: int, zone_update: schemas.ZoneUpdate, db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    db_zone = crud.update_zone(db, zone_id, zone_update)
    if db_zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    return db_zone


@router.delete("/{zone_id}")
async def delete_zone(zone_id: int, db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    if not crud.delete_zone(db, zone_id):
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"detail": "Zone deleted"}
