# routers/alerts.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from database import SessionLocal
from typing import List
import models

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.Alert])
def read_alerts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    alerts = crud.get_alerts(db, skip=skip, limit=limit)
    return alerts

@router.put("/{alert_id}", response_model=schemas.Alert)
def mark_alert_as_read(alert_id: int, db: Session = Depends(get_db)):
    db_alert = crud.mark_alert_as_read(db=db, alert_id=alert_id)
    if db_alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return db_alert
