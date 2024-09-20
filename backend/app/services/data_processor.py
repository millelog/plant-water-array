from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models
import backend.app.schemas as schemas
from typing import List

class DataProcessor:
    def __init__(self, db: Session):
        self.db = db

    def process_moisture_reading(self, reading: schemas.MoistureReadingCreate) -> None:
        """
        Process a new moisture reading, check against thresholds, and create alerts if necessary.
        """
        sensor = self.db.query(models.Sensor).filter(models.Sensor.id == reading.sensor_id).first()
        if not sensor:
            raise ValueError(f"Sensor with id {reading.sensor_id} not found")

        plant = self.db.query(models.Plant).filter(models.Plant.sensor_id == sensor.id).first()
        if not plant:
            raise ValueError(f"No plant associated with sensor id {reading.sensor_id}")

        # Create moisture reading
        db_reading = models.MoistureReading(**reading.dict())
        self.db.add(db_reading)
        self.db.commit()

        # Check if moisture is below threshold
        if reading.value < plant.moisture_threshold:
            self._create_low_moisture_alert(plant, reading.value)

    def _create_low_moisture_alert(self, plant: models.Plant, moisture_value: float) -> None:
        """
        Create a low moisture alert for a plant.
        """
        alert = models.Alert(
            type="low_moisture",
            message=f"Low moisture detected for plant {plant.name}. Current: {moisture_value}%, Threshold: {plant.moisture_threshold}%",
            plant_id=plant.id
        )
        self.db.add(alert)
        self.db.commit()

    def check_watering_schedules(self) -> List[models.Plant]:
        """
        Check watering schedules and return a list of plants that need watering.
        """
        current_time = datetime.now()
        current_day = current_time.weekday()
        current_time_str = current_time.strftime("%H:%M")

        plants_to_water = []
        schedules = self.db.query(models.WateringSchedule).filter(
            models.WateringSchedule.day_of_week == current_day,
            models.WateringSchedule.time <= current_time_str
        ).all()

        for schedule in schedules:
            last_watering = self.db.query(models.WateringEvent).filter(
                models.WateringEvent.plant_id == schedule.plant_id
            ).order_by(models.WateringEvent.timestamp.desc()).first()

            if not last_watering or last_watering.timestamp < current_time - timedelta(days=1):
                plants_to_water.append(schedule.plant)

        return plants_to_water

    def create_watering_event(self, plant: models.Plant, schedule: models.WateringSchedule) -> None:
        """
        Create a watering event based on a schedule.
        """
        watering_event = models.WateringEvent(
            plant_id=plant.id,
            duration=schedule.duration,
            amount=schedule.amount,
            is_automatic=True
        )
        self.db.add(watering_event)
        self.db.commit()

    def analyze_plant_health(self, plant_id: int, days: int = 7) -> dict:
        """
        Analyze plant health based on recent moisture readings.
        """
        plant = self.db.query(models.Plant).filter(models.Plant.id == plant_id).first()
        if not plant:
            raise ValueError(f"Plant with id {plant_id} not found")

        start_date = datetime.now() - timedelta(days=days)
        readings = self.db.query(models.MoistureReading).join(models.Sensor).filter(
            models.Sensor.id == plant.sensor_id,
            models.MoistureReading.timestamp >= start_date
        ).order_by(models.MoistureReading.timestamp).all()

        if not readings:
            return {"status": "No data available for analysis"}

        avg_moisture = sum(r.value for r in readings) / len(readings)
        min_moisture = min(r.value for r in readings)
        max_moisture = max(r.value for r in readings)

        return {
            "average_moisture": avg_moisture,
            "minimum_moisture": min_moisture,
            "maximum_moisture": max_moisture,
            "readings_count": len(readings),
            "status": "Healthy" if avg_moisture >= plant.moisture_threshold else "Needs attention"
        }

    def get_system_summary(self) -> dict:
        """
        Get a summary of the entire system's status.
        """
        total_plants = self.db.query(models.Plant).count()
        total_sensors = self.db.query(models.Sensor).count()
        total_devices = self.db.query(models.Device).count()
        active_alerts = self.db.query(models.Alert).filter(models.Alert.is_resolved == False).count()

        return {
            "total_plants": total_plants,
            "total_sensors": total_sensors,
            "total_devices": total_devices,
            "active_alerts": active_alerts
        }