# Plant Water Array

Distributed plant moisture monitoring system with custom ESP32 sensors, a Python backend, and a React frontend. Devices self-register via captive portal WiFi provisioning, send periodic moisture readings, and receive code updates pushed over the LAN.

**Live demo:** [plants.loganmiller.dev](https://plants.loganmiller.dev) — click **Browse as Guest** to explore the UI with sample data (read-only).

## Features

- **Real-time moisture monitoring** — ESP32 sensors report soil moisture on a configurable interval
- **Watering log** — manual logging with notes, or auto-detection from sharp moisture spikes
- **Push notifications** — alerts via [ntfy.sh](https://ntfy.sh) when plants need water or devices go offline
- **Data insights** — drying rate analysis, aggregated trends, multi-sensor comparison charts, CSV export
- **Dashboard** — sortable/filterable plant cards, weather widget, kiosk mode for wall-mounted displays
- **Push deploys** — update device firmware over LAN with `deploy.py` (atomic file swap, SHA-256 verified)
- **Captive portal provisioning** — new devices create a WiFi AP for zero-config setup
- **PWA** — installable on mobile, responsive layout with bottom navigation
- **Light/dark themes** — dark "Greenhouse Control Room" theme by default, light mode available
- **JWT authentication** — admin login with guest demo mode
- **Database maintenance** — backup downloads, configurable data retention, health stats
- **Custom PCB** — KiCad schematic and board files in `pcb/`

## Architecture

```
ESP32 sensors  ──POST readings──▶  FastAPI backend  ◀──polls──  React frontend
  (MicroPython)                     (SQLite DB)                  (Vite + Tailwind)
```

| Component | Directory | Stack |
|-----------|-----------|-------|
| Backend | `backend/` | FastAPI, SQLAlchemy, SQLite |
| Frontend | `frontend/` | React 18, TypeScript, Tailwind, Radix UI, Recharts |
| Embedded | `embeded-src/` | MicroPython on ESP32 |
| Hardware | `pcb/` | KiCad schematic + PCB |
| Deploy tool | `deploy.py` | CLI script, pushes code to devices over LAN |

## Development

### Backend
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API docs at http://localhost:8000/docs

### Frontend
```bash
cd frontend
pnpm install
pnpm dev          # Vite dev server on port 5173
pnpm build        # TypeScript compile + Vite bundle
pnpm lint         # ESLint
```

### ESP32 Flashing
```bash
python flash_esp.py               # Auto-detect port, flash MicroPython, upload source
python flash_esp.py --sync-only   # Upload source files only
python -m mpremote connect <port> repl   # Serial console
```

### Deploying Code to Devices
```bash
python deploy.py                  # Push embeded-src/*.py to all devices over LAN
python deploy.py --dry-run        # Preview what would be deployed
python deploy.py --server URL     # Override backend URL
```

### Docker Compose
```bash
docker compose up --build         # Run backend + frontend together
```
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment details.

## Data Flow

1. ESP32 boots → connects WiFi (or starts captive portal for provisioning)
2. Starts update server on port 8266 for receiving push deploys
3. Registers itself via `POST /devices/register_device`, then registers sensors via `POST /sensors/`
4. Main loop: reads moisture → `POST /readings`, heartbeat every 300s
5. Backend checks thresholds on new readings → creates alerts, sends ntfy notifications
6. Frontend polls backend APIs to display devices, readings, alerts
7. Developer runs `python deploy.py` → pushes code to all online devices, devices reboot with new code
