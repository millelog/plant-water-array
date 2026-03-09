# routers/alerts.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from typing import List, Optional

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
)


@router.get("/unread-count")
async def get_unread_count(db: Session = Depends(get_db)):
    count = crud.get_unread_alert_count(db)
    return {"count": count}


@router.put("/mark-all-read")
async def mark_all_read(db: Session = Depends(get_db)):
    crud.mark_all_alerts_read(db)
    return {"detail": "All alerts marked as read"}


@router.get("/", response_model=List[schemas.Alert])
async def read_alerts(
    sensor_id: Optional[int] = None,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.get_alerts_filtered(db, sensor_id=sensor_id, unread_only=unread_only, skip=skip, limit=limit)


@router.put("/{alert_id}", response_model=schemas.Alert)
async def mark_alert_as_read(alert_id: int, db: Session = Depends(get_db)):
    db_alert = crud.mark_alert_as_read(db=db, alert_id=alert_id)
    if db_alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return db_alert
