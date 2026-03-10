#!/usr/bin/env python3
"""Push deploy MicroPython source files to all registered ESP32 devices over the LAN."""

import argparse
import hashlib
import os
import subprocess
import sys

try:
    import requests
except ImportError:
    print("ERROR: 'requests' library is required. Install with: pip install requests")
    sys.exit(1)

SOURCE_DIR = "embeded-src"
EXCLUDED_FILES = {"config.py", "config.py.example"}
DEFAULT_DEVICE_PORT = 8266
DEFAULT_SERVER = os.getenv("DEPLOY_SERVER", "http://192.168.70.222:8000")


def get_git_commit():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short=12", "HEAD"],
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def has_uncommitted_changes():
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, check=True
        )
        return bool(result.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(4096)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def collect_files():
    files = []
    for name in os.listdir(SOURCE_DIR):
        if not name.endswith(".py"):
            continue
        if name in EXCLUDED_FILES:
            continue
        path = os.path.join(SOURCE_DIR, name)
        if not os.path.isfile(path):
            continue
        checksum = sha256_file(path)
        size = os.path.getsize(path)
        files.append({"name": name, "path": path, "checksum": checksum, "size": size})
    files.sort(key=lambda f: f["name"])
    return files


def get_devices(server_url, api_key=None):
    headers = {}
    if api_key:
        headers["X-API-Key"] = api_key
    resp = requests.get(f"{server_url}/devices/", headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


def push_file(device_ip, port, token, filepath, filename, checksum):
    with open(filepath, "rb") as f:
        content = f.read()
    resp = requests.post(
        f"http://{device_ip}:{port}/push",
        data=content,
        headers={
            "X-Deploy-Token": token,
            "X-Filename": filename,
            "X-Checksum": checksum,
            "Content-Length": str(len(content)),
        },
        timeout=30,
    )
    return resp.status_code, resp.text


def apply_update(device_ip, port, token, commit, filenames):
    import json
    resp = requests.post(
        f"http://{device_ip}:{port}/apply",
        data=json.dumps({"commit": commit, "files": filenames}),
        headers={
            "X-Deploy-Token": token,
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    return resp.status_code, resp.text


def main():
    parser = argparse.ArgumentParser(description="Push deploy MicroPython files to ESP32 devices.")
    parser.add_argument("--server", default=DEFAULT_SERVER, help=f"Backend server URL (default: {DEFAULT_SERVER})")
    parser.add_argument("--port", type=int, default=DEFAULT_DEVICE_PORT, help=f"Device update server port (default: {DEFAULT_DEVICE_PORT})")
    parser.add_argument("--force", action="store_true", help="Proceed even with uncommitted changes")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deployed without pushing")
    parser.add_argument("--api-key", default=os.getenv("DEPLOY_API_KEY"), help="API key for backend authentication (default: DEPLOY_API_KEY env)")
    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: DEPLOY_API_KEY env var or --api-key argument required.")
        sys.exit(1)

    # Get git commit
    commit = get_git_commit()
    if not commit:
        print("WARNING: Could not determine git commit hash")
        commit = "unknown"
    else:
        print(f"Git commit: {commit}")

    # Check for uncommitted changes
    if has_uncommitted_changes():
        if args.force:
            print("WARNING: Deploying with uncommitted changes (--force)")
        else:
            print("ERROR: Uncommitted changes detected. Commit first or use --force.")
            sys.exit(1)

    # Collect files
    files = collect_files()
    if not files:
        print(f"ERROR: No .py files found in {SOURCE_DIR}/")
        sys.exit(1)

    print(f"\nFiles to deploy ({len(files)}):")
    for f in files:
        print(f"  {f['name']:30s} {f['size']:>6d} bytes  {f['checksum'][:12]}...")

    # Get device list from backend
    print(f"\nFetching devices from {args.server}...")
    try:
        devices = get_devices(args.server, args.api_key)
    except Exception as e:
        print(f"ERROR: Could not fetch devices: {e}")
        sys.exit(1)

    # Filter to devices with IP and deploy_token
    targets = []
    for d in devices:
        ip = d.get("ip_address")
        token = d.get("deploy_token")
        if ip and token:
            targets.append({"name": d["name"], "device_id": d["device_id"], "ip": ip, "token": token})
        else:
            reason = []
            if not ip:
                reason.append("no IP")
            if not token:
                reason.append("no deploy token")
            print(f"  Skipping {d['name']} ({', '.join(reason)})")

    if not targets:
        print("No deployable devices found (need IP address and deploy token).")
        sys.exit(0)

    print(f"\nTargets ({len(targets)}):")
    for t in targets:
        print(f"  {t['name']:20s} {t['ip']:15s} token={t['token'][:8]}...")

    if args.dry_run:
        print("\n[DRY RUN] No files pushed.")
        return

    # Deploy to each device
    print()
    results = []
    filenames = [f["name"] for f in files]

    for t in targets:
        name = t["name"]
        ip = t["ip"]
        token = t["token"]
        print(f"Deploying to {name} ({ip})...")

        try:
            # Push each file
            all_ok = True
            for f in files:
                status, text = push_file(ip, args.port, token, f["path"], f["name"], f["checksum"])
                if status != 200:
                    print(f"  FAIL {f['name']}: {status} {text}")
                    all_ok = False
                    break
                else:
                    print(f"  OK   {f['name']}")

            if not all_ok:
                results.append((name, "FAILED", "File push failed"))
                continue

            # Apply update
            status, text = apply_update(ip, args.port, token, commit, filenames)
            if status == 200:
                results.append((name, "OK", "Rebooting"))
                print(f"  Applied, device rebooting")
            else:
                results.append((name, "FAILED", f"Apply: {status} {text}"))
                print(f"  Apply failed: {status} {text}")

        except requests.exceptions.ConnectTimeout:
            results.append((name, "OFFLINE", "Connection timed out"))
            print(f"  OFFLINE (connection timed out)")
        except requests.exceptions.ConnectionError:
            results.append((name, "OFFLINE", "Connection refused"))
            print(f"  OFFLINE (connection refused)")
        except Exception as e:
            results.append((name, "ERROR", str(e)))
            print(f"  ERROR: {e}")

    # Summary
    print("\n" + "=" * 50)
    print("DEPLOY SUMMARY")
    print("=" * 50)
    print(f"Commit: {commit}")
    print(f"Files:  {len(files)}")
    print()
    for name, status, detail in results:
        icon = {"OK": "+", "FAILED": "!", "OFFLINE": "-", "ERROR": "!"}.get(status, "?")
        print(f"  [{icon}] {name:20s} {status:8s} {detail}")

    ok_count = sum(1 for _, s, _ in results if s == "OK")
    print(f"\n{ok_count}/{len(results)} devices updated successfully.")


if __name__ == "__main__":
    main()
