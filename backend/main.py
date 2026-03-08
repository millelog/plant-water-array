# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import devices, sensors, readings, alerts, firmware
from database import init_db

app = FastAPI()
init_db()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router)
app.include_router(sensors.router)
app.include_router(readings.router)
app.include_router(alerts.router)
app.include_router(firmware.router)


@app.get("/ping")
async def ping():
    return {"message": "pong"}
