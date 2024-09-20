# Plant Water Array Project

## Overview
This project implements a distributed system for monitoring and managing plant watering using ESP32 microcontrollers, a Python backend server, and a React frontend. The system collects soil moisture data from multiple sensors, processes it on a central server, and provides a web interface for monitoring and control.

## Project Structure
```
PLANT-WATER-ARRAY/
├── embedded-src/     # MicroPython code for ESP32 devices
├── backend/          # Python backend server
├── frontend/         # React frontend application
├── firmware/         # ESP32 firmware files
├── driver/           # ESP32 driver files
├── tests/            # Test suites for embedded and server code
├── docs/             # Project documentation
└── .venv/            # Python virtual environment
```

## Setup Instructions

### ESP32 Setup
1. Install MicroPython on your ESP32 devices.
2. Use PyMakr or a similar tool to upload the code from `embedded-src/` to each ESP32.

### Backend Setup
1. Navigate to the `backend/` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix or MacOS: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python app.py`

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Usage
- Access the web interface at `http://localhost:3000`
- ESP32 devices will automatically connect to the server and start sending data.
- Monitor soil moisture levels and control watering through the web interface.

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.