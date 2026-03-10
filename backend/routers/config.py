from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from auth import UserInfo, get_current_user, require_admin

router = APIRouter(
    prefix="/config",
    tags=["config"],
)


@router.get("/", response_model=schemas.SystemConfig)
async def get_config(db: Session = Depends(get_db), user: UserInfo = Depends(get_current_user)):
    return crud.get_system_config(db)


@router.put("/", response_model=schemas.SystemConfig)
async def update_config(config_update: schemas.SystemConfigUpdate, db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    return crud.update_system_config(db, config_update)


@router.post("/test-notification")
async def test_notification(db: Session = Depends(get_db), _user: UserInfo = Depends(require_admin)):
    config = crud.get_system_config(db)
    if not config.ntfy_topic:
        raise HTTPException(status_code=400, detail="ntfy topic is not configured")
    from services.notifications import send_notification
    success = send_notification(
        config.ntfy_server_url,
        config.ntfy_topic,
        "Plant Water Array",
        "Test notification — if you see this, notifications are working!",
        priority="default",
        tags=["white_check_mark", "seedling"],
    )
    if not success:
        raise HTTPException(status_code=502, detail="Failed to send notification to ntfy server")
    return {"detail": "Test notification sent successfully"}
