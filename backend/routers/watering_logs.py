from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

import crud, schemas
from database import SessionLocal
from auth import UserInfo, get_current_user, require_admin

router = APIRouter(prefix="/watering-logs", tags=["watering-logs"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.WateringLog)
def create_watering_log(log: schemas.WateringLogCreate, db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    if log.method not in ("manual", "auto", "rain"):
        raise HTTPException(status_code=400, detail="Method must be one of: manual, auto, rain")
    try:
        return crud.create_watering_log(db, log)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/", response_model=List[schemas.WateringLog])
def get_watering_logs(
    sensor_id: int = Query(...),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: UserInfo = Depends(get_current_user),
):
    return crud.get_watering_logs_by_sensor(db, sensor_id, start_time, end_time, skip, limit, is_demo=user.is_demo)


@router.delete("/{log_id}")
def delete_watering_log(log_id: int, db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    if not crud.delete_watering_log(db, log_id):
        raise HTTPException(status_code=404, detail="Watering log not found")
    return {"ok": True}
