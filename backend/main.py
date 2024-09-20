# main.py

from fastapi import FastAPI
from routers import devices, sensors, readings, alerts

app = FastAPI()

app.include_router(devices.router)
app.include_router(sensors.router)
app.include_router(readings.router)
app.include_router(alerts.router)
