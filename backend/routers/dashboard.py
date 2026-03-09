from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


@router.get("/summary", response_model=schemas.DashboardSummary)
async def get_dashboard_summary(db: Session = Depends(get_db)):
    return crud.get_dashboard_summary(db)
