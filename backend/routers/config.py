from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db

router = APIRouter(
    prefix="/config",
    tags=["config"],
)


@router.get("/", response_model=schemas.SystemConfig)
async def get_config(db: Session = Depends(get_db)):
    return crud.get_system_config(db)


@router.put("/", response_model=schemas.SystemConfig)
async def update_config(config_update: schemas.SystemConfigUpdate, db: Session = Depends(get_db)):
    return crud.update_system_config(db, config_update)
