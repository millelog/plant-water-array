from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from auth import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/summary", response_model=schemas.DashboardSummary)
async def get_dashboard_summary(db: Session = Depends(get_db)):
    return crud.get_dashboard_summary(db)
