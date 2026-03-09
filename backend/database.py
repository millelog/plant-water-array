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
        ]
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()
