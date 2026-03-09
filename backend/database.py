# database.py

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./backend.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    import models  # Import here to avoid circular imports
    Base.metadata.create_all(bind=engine)


def upgrade_db():
    """Add new columns to existing tables (idempotent for SQLite)."""
    with engine.connect() as conn:
        migrations = [
            "ALTER TABLE sensors ADD COLUMN calibration_dry FLOAT",
            "ALTER TABLE sensors ADD COLUMN calibration_wet FLOAT",
            "ALTER TABLE readings ADD COLUMN raw_adc FLOAT",
            "ALTER TABLE sensors ADD COLUMN zone_id INTEGER REFERENCES zones(id)",
            "ALTER TABLE sensors ADD COLUMN notes TEXT",
            "ALTER TABLE sensors ADD COLUMN auto_log_watering BOOLEAN DEFAULT 0",
            "ALTER TABLE system_config ADD COLUMN moisture_jump_threshold FLOAT DEFAULT 15.0",
            "ALTER TABLE system_config ADD COLUMN ntfy_enabled BOOLEAN DEFAULT 0",
            "ALTER TABLE system_config ADD COLUMN ntfy_server_url TEXT DEFAULT 'https://ntfy.sh'",
            "ALTER TABLE system_config ADD COLUMN ntfy_topic TEXT",
            "ALTER TABLE devices ADD COLUMN offline_notified BOOLEAN DEFAULT 0",
            "ALTER TABLE system_config ADD COLUMN weather_latitude FLOAT",
            "ALTER TABLE system_config ADD COLUMN weather_longitude FLOAT",
            "ALTER TABLE system_config ADD COLUMN retention_days INTEGER DEFAULT 90",
        ]
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()
