# Production Deployment (Coolify on gpu1)

The app runs on **gpu1** via Coolify (Docker Compose), with Traefik handling reverse proxy and SSL.

| Service | URL | Internal Port |
|---------|-----|---------------|
| Frontend | https://plants.loganmiller.dev | 80 (nginx) |
| Backend API | https://api.plants.loganmiller.dev | 8000 (uvicorn) |
| Backend LAN | http://192.168.70.100:8321 | 8000 (for ESP32 devices) |

## DNS

Wildcard `*.loganmiller.dev` points to gpu1's public IP. Coolify/Traefik handles routing by hostname and provisions Let's Encrypt SSL certificates automatically.

## Data Storage

The SQLite database is stored on **nas1** (Unraid) via NFS:

```
nas1:/mnt/user/appdata/plant-water-array/  →  gpu1:/mnt/nas1/appdata/plant-water-array/  →  container:/data/
```

The `docker-compose.yml` bind-mounts this path so the DB persists across container rebuilds and lives on redundant storage (RAID1 SSD pool).

## ESP32 LAN Access

Backend port 8321 on gpu1 is exposed for ESP32 devices on the LAN. Devices use:
```python
# embeded-src/config.py
SERVER_URL = "http://192.168.70.100:8321"
```

Deploy script targets the same endpoint:
```bash
python deploy.py --server http://192.168.70.100:8321
```

## Coolify Notes

- **Source:** GitHub repo `millelog/plant-water-array`, branch `main`, auto-deploy enabled
- **Compose path:** `/docker-compose.yml`
- **Domains:** Set per-service in Coolify UI (frontend and backend separately)
- After changing domains in Coolify, click **"Reload Compose File"** then redeploy — Coolify injects Traefik labels on reload, not just on domain save

## Migrating the Database

```bash
scp backend/backend.db millelog@gpu1.lan:/tmp/backend.db
ssh millelog@gpu1.lan
docker ps | grep backend       # find container ID
docker cp /tmp/backend.db <container_id>:/data/backend.db
docker restart <container_id>
rm /tmp/backend.db
```
