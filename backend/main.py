# main.py

from fastapi import FastAPI
from routers import devices, sensors, readings, alerts
from database import init_db

app = FastAPI()

app.include_router(devices.router)
app.include_router(sensors.router)
app.include_router(readings.router)
app.include_router(alerts.router)

if __name__ == "__main__":
    init_db()
