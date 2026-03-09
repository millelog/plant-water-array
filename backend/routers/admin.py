import os
import sqlite3
import tempfile
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

import models, schemas, crud
from dependencies import get_db

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)

def _get_db_path() -> str:
    db_url = os.getenv("DATABASE_URL", "sqlite:///./backend.db")
    path = db_url.replace("sqlite:///", "", 1)
    return os.path.abspath(path)

DB_PATH = _get_db_path()


@router.get("/backup")
async def download_backup():
    """Download a safe copy of the SQLite database using the online backup API."""
    backup_fd, backup_path = tempfile.mkstemp(suffix=".db")
    os.close(backup_fd)
    try:
        source = sqlite3.connect(DB_PATH)
        dest = sqlite3.connect(backup_path)
        source.backup(dest)
        source.close()
        dest.close()
    except Exception:
        if os.path.exists(backup_path):
            os.unlink(backup_path)
        raise

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return FileResponse(
        path=backup_path,
        media_type="application/octet-stream",
        filename=f"plant_water_array_backup_{timestamp}.db",
        background=None,
    )


@router.get("/stats", response_model=schemas.DatabaseStats)
async def get_database_stats(db: Session = Depends(get_db)):
    """Return database health statistics."""
    total_readings = db.query(func.count(models.Reading.id)).scalar() or 0
    total_watering_logs = db.query(func.count(models.WateringLog.id)).scalar() or 0
    total_alerts = db.query(func.count(models.Alert.id)).scalar() or 0

    oldest_reading = db.query(func.min(models.Reading.timestamp)).scalar()

    # Readings per day average
    readings_per_day_avg = 0.0
    if oldest_reading and total_readings > 0:
        oldest_dt = oldest_reading
        if oldest_dt.tzinfo is None:
            oldest_dt = oldest_dt.replace(tzinfo=timezone.utc)
        days = max(1, (datetime.now(timezone.utc) - oldest_dt).days)
        readings_per_day_avg = round(total_readings / days, 1)

    # Database file size
    db_size = 0
    if os.path.exists(DB_PATH):
        db_size = os.path.getsize(DB_PATH)

    def human_size(size_bytes: int) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"

    return schemas.DatabaseStats(
        total_readings=total_readings,
        database_size_bytes=db_size,
        database_size_human=human_size(db_size),
        oldest_reading=oldest_reading,
        readings_per_day_avg=readings_per_day_avg,
        total_watering_logs=total_watering_logs,
        total_alerts=total_alerts,
    )
