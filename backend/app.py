from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import engine
import models
import dotenv
from routes import users, devices, plants, sensors, watering, zones, alerts
from db import get_db
import schemas
from auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Create database tables
models.Base.metadata.create_all(bind=engine)
dotenv.load_dotenv()

app = FastAPI(title="Plant Water Array API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(devices.router)
app.include_router(plants.router)
app.include_router(sensors.router)
app.include_router(watering.router)
app.include_router(zones.router)
app.include_router(alerts.router)

router = APIRouter()

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/")
async def root():
    return {"message": "Welcome to the Plant Water Array API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)