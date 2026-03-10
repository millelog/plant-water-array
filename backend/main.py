# main.py

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, devices, sensors, readings, alerts, zones, dashboard, config, watering_logs, admin
from database import init_db, upgrade_db
import crud

app = FastAPI()
init_db()
upgrade_db()

# Configure CORS
cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
cors_origins = [o.strip() for o in cors_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(devices.router)
app.include_router(sensors.router)
app.include_router(readings.router)
app.include_router(alerts.router)
app.include_router(zones.router)
app.include_router(dashboard.router)
app.include_router(config.router)
app.include_router(watering_logs.router)
app.include_router(admin.router)


@app.on_event("startup")
async def auto_cleanup_old_readings():
    """Auto-delete readings older than retention_days on startup."""
    import logging
    from dependencies import get_db
    db = next(get_db())
    try:
        config = crud.get_system_config(db)
        if config.retention_days and config.retention_days > 0:
            deleted = crud.delete_old_readings(db, config.retention_days)
            if deleted > 0:
                logging.info(f"Auto-cleanup: deleted {deleted} readings older than {config.retention_days} days")
    except Exception as e:
        logging.error(f"Auto-cleanup failed: {e}")
    finally:
        db.close()


@app.get("/ping")
async def ping():
    return {"message": "pong"}


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port)
