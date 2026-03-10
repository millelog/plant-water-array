# Plant Water Array

Distributed plant moisture monitoring system with ESP32 sensors, a Python backend, and a React frontend. ESP32 devices self-register via captive portal WiFi provisioning and send periodic moisture readings. Code updates are pushed to devices over the LAN.

**Live demo:** [plants.loganmiller.dev](https://plants.loganmiller.dev) — click **Browse as Guest** on the login page to explore the UI with sample data. Guest mode is read-only and uses demo data, not real sensor readings.

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
| Deploy tool | `deploy.py` | CLI script, pushes code to devices over LAN |

## Development

### Backend
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

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

## Production Deployment (Coolify on gpu1)

The app runs on **gpu1** via Coolify (Docker Compose), with Traefik handling reverse proxy and SSL.

| Service | URL | Internal Port |
|---------|-----|---------------|
| Frontend | https://plants.loganmiller.dev | 80 (nginx) |
| Backend API | https://api.plants.loganmiller.dev | 8000 (uvicorn) |
| Backend LAN | http://192.168.70.100:8321 | 8000 (for ESP32 devices) |

### DNS

Wildcard `*.loganmiller.dev` points to gpu1's public IP. Coolify/Traefik handles routing by hostname and provisions Let's Encrypt SSL certificates automatically.

### Data Storage

The SQLite database is stored on **nas1** (Unraid) via NFS:

```
nas1:/mnt/user/appdata/plant-water-array/  →  gpu1:/mnt/nas1/appdata/plant-water-array/  →  container:/data/
```

The `docker-compose.yml` bind-mounts this path so the DB persists across container rebuilds and lives on redundant storage (RAID1 SSD pool).

### ESP32 LAN Access

Backend port 8321 on gpu1 is exposed for ESP32 devices on the LAN. Devices use:
```python
# embeded-src/config.py
SERVER_URL = "http://192.168.70.100:8321"
```

Deploy script targets the same endpoint:
```bash
python deploy.py --server http://192.168.70.100:8321
```

### Coolify Notes

- **Source:** GitHub repo `millelog/plant-water-array`, branch `main`, auto-deploy enabled
- **Compose path:** `/docker-compose.yml`
- **Domains:** Set per-service in Coolify UI (frontend and backend separately)
- After changing domains in Coolify, click **"Reload Compose File"** then redeploy — Coolify injects Traefik labels on reload, not just on domain save

### Migrating the Database

```bash
scp backend/backend.db millelog@gpu1.lan:/tmp/backend.db
ssh millelog@gpu1.lan
docker ps | grep backend       # find container ID
docker cp /tmp/backend.db <container_id>:/data/backend.db
docker restart <container_id>
rm /tmp/backend.db
```

## Data Flow

1. ESP32 boots → connects WiFi (or starts captive portal for provisioning)
2. Starts update server on port 8266 for receiving push deploys
3. Registers itself via `POST /devices/register_device`, then registers sensors via `POST /sensors/`
4. Main loop: reads moisture → `POST /readings`, heartbeat every 300s
5. Backend checks thresholds on new readings → creates alerts if exceeded
6. Frontend polls backend APIs to display devices, readings, alerts
7. Developer runs `python deploy.py` → pushes code to all online devices, devices reboot with new code
