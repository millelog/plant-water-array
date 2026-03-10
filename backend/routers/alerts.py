# routers/alerts.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from typing import List, Optional
from auth import UserInfo, get_current_user, require_admin

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
)


@router.get("/unread-count")
async def get_unread_count(db: Session = Depends(get_db), user: UserInfo = Depends(get_current_user)):
    count = crud.get_unread_alert_count(db, is_demo=user.is_demo)
    return {"count": count}


@router.put("/mark-all-read")
async def mark_all_read(db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    crud.mark_all_alerts_read(db)
    return {"detail": "All alerts marked as read"}


@router.get("/", response_model=List[schemas.Alert])
async def read_alerts(
    sensor_id: Optional[int] = None,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: UserInfo = Depends(get_current_user),
):
    return crud.get_alerts_filtered(db, sensor_id=sensor_id, unread_only=unread_only, skip=skip, limit=limit, is_demo=user.is_demo)


@router.put("/{alert_id}", response_model=schemas.Alert)
async def mark_alert_as_read(alert_id: int, db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    db_alert = crud.mark_alert_as_read(db=db, alert_id=alert_id)
    if db_alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return db_alert
