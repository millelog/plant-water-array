# Plant Water Array Backend

## Table of Contents
1. [Introduction](#introduction)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup and Installation](#setup-and-installation)
6. [Configuration](#configuration)
7. [Database](#database)
8. [API Endpoints](#api-endpoints)
9. [Authentication](#authentication)
10. [Data Processing](#data-processing)
11. [Background Tasks](#background-tasks)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Contributing](#contributing)
15. [License](#license)

## Introduction

The Plant Water Array Backend is the server-side component of a distributed system designed to monitor and manage plant watering using ESP32 microcontrollers. This backend provides a robust API for data collection, processing, and management, as well as user authentication and authorization.

## Features

- User management and authentication
- Device and sensor registration and management
- Plant profile creation and management
- Moisture reading collection and processing
- Automated watering schedule management
- Alert generation for low moisture levels
- Plant health analysis
- System-wide status reporting

## Technology Stack

- **FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python 3.6+ based on standard Python type hints.
- **SQLAlchemy**: SQL toolkit and Object-Relational Mapping (ORM) library for Python.
- **Pydantic**: Data validation and settings management using Python type annotations.
- **JWT**: JSON Web Tokens for secure authentication.
- **SQLite**: Lightweight disk-based database (can be easily switched to other databases for production).

## Project Structure

```
plant-water-array-backend/
├── app/
│   ├── main.py
│   ├── db.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── services/
│   │   └── data_processor.py
│   └── routes/
│       ├── users.py
│       ├── devices.py
│       ├── plants.py
│       ├── sensors.py
│       ├── watering.py
│       ├── zones.py
│       └── alerts.py
├── tests/
├── alembic/
├── requirements.txt
├── .env
└── README.md
```

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/plant-water-array-backend.git
   cd plant-water-array-backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up the database:
   ```
   alembic upgrade head
   ```

5. Start the server:
   ```
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`. The interactive API documentation can be accessed at `http://localhost:8000/docs`.

## Configuration

Create a `.env` file in the root directory with the following contents:

```
DATABASE_URL=sqlite:///./plant_water_array.db
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Replace `your_secret_key_here` with a secure secret key. You can generate one using:

```
openssl rand -hex 32
```

## Database

The project uses SQLAlchemy ORM with SQLite as the default database. The database schema is defined in `app/models.py`. Key models include:

- User
- Device
- Sensor
- Plant
- MoistureReading
- WateringEvent
- WateringSchedule
- Zone
- Alert

To make changes to the database schema:

1. Modify the models in `app/models.py`
2. Create a new migration:
   ```
   alembic revision --autogenerate -m "Description of changes"
   ```
3. Apply the migration:
   ```
   alembic upgrade head
   ```

## API Endpoints

The API is organized into several routers:

- `/users`: User management
- `/devices`: Device registration and management
- `/plants`: Plant profile management
- `/sensors`: Sensor data management
- `/watering`: Watering events and schedules
- `/zones`: Plant grouping
- `/alerts`: System alerts

For detailed API documentation, run the server and visit `http://localhost:8000/docs`.

## Authentication

The backend uses JWT (JSON Web Tokens) for authentication. Key components:

- `auth.py`: Contains functions for password hashing, token creation, and user authentication.
- Login endpoint: `/token` (POST) - Accepts username and password, returns an access token.
- Protected routes use the `get_current_active_user` dependency to ensure authentication.

To access protected routes, include the token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Data Processing

The `DataProcessor` class in `app/services/data_processor.py` handles core business logic:

- Processing moisture readings
- Checking watering schedules
- Creating watering events
- Analyzing plant health
- Generating system summaries

This service is used by various route handlers to process incoming data and generate insights.

## Background Tasks

Background tasks are set up to handle recurring operations:

- Checking watering schedules
- Processing sensor data
- Generating alerts

These tasks are defined in `app/main.py` using FastAPI's background task functionality.

## Testing

Tests are located in the `tests/` directory. To run tests:

```
pytest
```

Ensure you have `pytest` installed (`pip install pytest`).

## Deployment

For production deployment:

1. Choose a production-grade database (e.g., PostgreSQL).
2. Set up a reverse proxy (e.g., Nginx).
3. Use a process manager (e.g., Gunicorn) to run the application.
4. Set up SSL/TLS for secure communication.
5. Configure environment variables for production settings.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-branch-name`.
3. Make your changes and commit them: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature-branch-name`.
5. Submit a pull request.

Please ensure your code adheres to the project's coding standards and includes appropriate tests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.